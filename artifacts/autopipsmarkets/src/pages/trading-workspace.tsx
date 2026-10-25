import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Plus, ShieldCheck, X } from 'lucide-react';
import {
  getGetCandlesQueryKey, getGetMarketsQueryKey, getGetTraderProfileQueryKey,
  getGetTraderSnapshotQueryKey, useAddDemoFunds, useGetCandles, useGetMarkets,
  useGetTraderProfile, useGetTraderSnapshot,
} from '@workspace/api-client-react';
import { clearTraderSession, hasTraderSession } from '@/lib/session';
import { formatForexPair } from '@/lib/market-label';
import DashboardControls, { type PracticeTrade, type TradeSide } from '@/components/terminal/DashboardControls';
import PriceChart, { type ChartInterval } from '@/components/terminal/PriceChart';
import TraderAuthDialog from '@/components/terminal/TraderAuthDialog';

const PRACTICE_STORAGE_KEY = 'tradeitx_practice_scenarios_v1';

function loadPracticeTrades(): PracticeTrade[] {
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(PRACTICE_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((trade): trade is PracticeTrade => Boolean(
      trade && typeof trade === 'object' && 'id' in trade && 'asset' in trade &&
      'amount' in trade && 'entryPrice' in trade && 'expiresAt' in trade && 'outcome' in trade,
    ));
  } catch {
    return [];
  }
}

function DemoFundsDialog({ onClose, onSubmit, busy, error }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, amount: number) => void; busy: boolean; error: string }) {
  const [amount, setAmount] = useState('500');
  return <div className="auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="funds-title">
      <div className="flex justify-between"><div><div className="section-kicker">DEMO WALLET</div><h2 id="funds-title">Add simulated funds</h2></div><button className="small-btn" onClick={onClose} aria-label="Close" data-testid="button-close-funds"><X size={15} /></button></div>
      <p className="disclaimer">No payment is taken. This only updates your paper-trading balance.</p>
      <form onSubmit={event => onSubmit(event, Number(amount))}><label className="field-label" htmlFor="demo-fund-amount">AMOUNT · USD</label><input id="demo-fund-amount" type="number" min="1" max="10000" step="1" value={amount} onChange={event => setAmount(event.target.value)} className="trade-input" data-testid="input-demo-fund-amount" />
        {error && <p className="error-text" role="alert">{error}</p>}<button className="button-yellow" style={{ width: '100%', marginTop: 14 }} disabled={busy} data-testid="button-submit-demo-funds">{busy ? 'Adding…' : 'Add demo funds'}</button>
      </form>
    </section>
  </div>;
}

export default function TradingWorkspace() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(hasTraderSession);
  const profile = useGetTraderProfile({ query: { queryKey: getGetTraderProfileQueryKey(), enabled: session, retry: false } });
  const signedIn = Boolean(profile.data?.user);
  const snapshot = useGetTraderSnapshot({ query: { queryKey: getGetTraderSnapshotQueryKey(), enabled: signedIn, retry: false } });
  const marketsQuery = useGetMarkets({ query: { queryKey: getGetMarketsQueryKey(), refetchInterval: 6000, retry: 1 } });
  const markets = marketsQuery.data ?? [];
  const forexMarkets = markets.filter(market => market.category === 'Forex');
  const [symbol, setSymbol] = useState('EURUSD');
  const selectedMarket = forexMarkets.find(market => market.symbol === symbol) ?? forexMarkets[0];
  const currentSymbol = selectedMarket?.symbol ?? 'EURUSD';
  const [interval, setInterval] = useState<ChartInterval>('5m');
  const candleParams = useMemo(() => ({ symbol: currentSymbol, interval }), [currentSymbol, interval]);
  const candlesQuery = useGetCandles(candleParams, { query: { queryKey: getGetCandlesQueryKey(candleParams), enabled: Boolean(selectedMarket), refetchInterval: 12000, retry: 1 } });
  const [side, setSide] = useState<TradeSide>('BUY');
  const [amount, setAmount] = useState('25');
  const [expirySeconds, setExpirySeconds] = useState(5);
  const [strategy, setStrategy] = useState('Trend Follower');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [customStrategy, setCustomStrategy] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [fundsOpen, setFundsOpen] = useState(false);
  const [fundError, setFundError] = useState('');
  const [tradeError, setTradeError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [timerStartedAt] = useState(Date.now());
  const [trades, setTrades] = useState<PracticeTrade[]>(loadPracticeTrades);
  const addDemoFunds = useAddDemoFunds();
  const price = selectedMarket?.price ?? 1.08421;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    setTrades(current => {
      let changed = false;
      const resolved = current.map(trade => {
        if (trade.outcome !== 'PENDING' || trade.expiresAt > now) return trade;
        changed = true;
        const settlementPrice = markets.find(market => market.symbol === trade.asset)?.price ?? trade.entryPrice;
        const movement = settlementPrice - trade.entryPrice;
        const wins = trade.side === 'BUY' ? movement > 0 : movement < 0;
        const tie = Math.abs(movement) < 0.00000001;
        const outcome: PracticeTrade['outcome'] = tie ? 'TIE_SIMULATED' : wins ? 'WIN_SIMULATED' : 'LOSS_SIMULATED';
        return { ...trade, exitPrice: settlementPrice, outcome };
      });
      return changed ? resolved : current;
    });
  }, [markets, now]);

  const timerSeconds = Math.max(1, expirySeconds - (Math.floor((now - timerStartedAt) / 1000) % expirySeconds));
  const timerLabel = `00:${String(timerSeconds).padStart(2, '0')}`;
  const localPreview = strategy === 'Mean Reversion'
    ? 'This local heuristic sees price near the middle of its recent sample range. A reversion thesis still needs a defined invalidation point.'
    : `This local heuristic reads a ${selectedMarket?.change24h && selectedMarket.change24h < 0 ? 'mild downward' : 'mild upward'} bias in the simulated quote. Wait for confirmation before considering a practice entry.`;

  const addPracticeTrade = (tradeSide: TradeSide) => {
    const investment = Number(amount);
    if (!(investment >= 1 && investment <= 10000)) { setTradeError('Choose an investment between $1 and $10,000.'); return; }
    setTradeError('');
    setSide(tradeSide);
    const record: PracticeTrade = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      asset: currentSymbol,
      amount: investment,
      side: tradeSide,
      entryPrice: price,
      expirySeconds,
      expiresAt: now + expirySeconds * 1000,
      outcome: 'PENDING',
    };
    setTrades(current => [record, ...current].slice(0, 50));
  };

  const handleFunds = (event: FormEvent<HTMLFormElement>, amountValue: number) => {
    event.preventDefault();
    setFundError('');
    if (!(amountValue > 0 && amountValue <= 10000)) { setFundError('Choose a demo funding amount from $1 to $10,000.'); return; }
    addDemoFunds.mutate({ data: { amount: amountValue } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetTraderSnapshotQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTraderProfileQueryKey() });
        setFundsOpen(false);
      },
      onError: cause => setFundError(cause instanceof Error ? cause.message : 'Could not add simulated funds.'),
    });
  };

  const signOut = () => { clearTraderSession(); setSession(false); queryClient.clear(); };
  const wallet = snapshot.data?.wallet ?? profile.data?.wallet;

  return <main className="terminal" data-testid="page-trading-workspace">
    <header className="terminal-head"><div className="flex items-center gap-4"><Link href="/" className="terminal-brand" data-testid="link-back-home"><b>←</b>tradeitX</Link><span className="hidden sm:inline status-pill">PAPER TERMINAL</span></div>
      <div className="flex items-center gap-2"><span className="disclaimer hidden sm:inline">No broker connectivity · No real money</span>
        {signedIn ? <><button className="small-btn" onClick={() => setFundsOpen(true)} data-testid="button-add-demo-funds"><Plus size={12} /> Demo funds</button><button className="small-btn" onClick={signOut} data-testid="button-sign-out">Sign out</button></> : <button className="nav-cta" onClick={() => setAuthOpen(true)} data-testid="button-sign-in">Sign in</button>}
      </div>
    </header>
    <div className="terminal-content">
      <div className="term-title-row"><div><div className="term-label">Training workspace / digital options</div><h1>Practice terminal</h1></div><div className="status-pill"><ShieldCheck size={12} /> SIMULATED ENVIRONMENT</div></div>
      <div className="market-strip">
        {marketsQuery.isLoading ? <div className="skeleton" style={{ height: 60, width: '100%' }} aria-label="Loading simulated markets" />
          : marketsQuery.isError ? <div className="error-panel">Simulated markets could not load. <button className="small-btn" onClick={() => void marketsQuery.refetch()}>Retry</button></div>
          : forexMarkets.length === 0
            ? <div className="empty-practice">No simulated Forex markets are available right now.</div>
            : forexMarkets.map(market => <button key={market.symbol} className={`market-chip ${market.symbol === currentSymbol ? 'active' : ''}`} onClick={() => setSymbol(market.symbol)} data-testid={`button-market-${market.symbol.toLowerCase()}`}><span className="term-label">FOREX · SIM</span><div className="market-symbol">{formatForexPair(market.symbol)}</div><div className="financial market-price">{market.price.toFixed(market.price < 10 ? 5 : 2)}</div></button>)}
      </div>
      <div className="market-layout">
        <section className="dashboard-main-column">
          <div className="panel"><div className="instrument-head"><div><div className="instrument-title"><h2>{formatForexPair(currentSymbol)} · LIVE</h2><span className="status-pill">SIMULATED</span></div><p className="disclaimer">Paper quote only · no broker feed</p></div><div className="text-right"><div className="financial price-primary" data-testid="text-current-price">{price.toFixed(5)}</div><div className="price-change">{selectedMarket?.change24h !== undefined ? `${selectedMarket.change24h >= 0 ? '+' : ''}${selectedMarket.change24h.toFixed(2)}% · simulated` : 'Simulated quote'}</div></div></div>
            <PriceChart candles={candlesQuery.data} loading={candlesQuery.isLoading} symbol={formatForexPair(currentSymbol)} interval={interval} onInterval={setInterval} />
            {candlesQuery.isError && <div className="chart-error" role="status">Candle history unavailable. Showing a local illustrative chart. <button className="small-btn" onClick={() => void candlesQuery.refetch()}>Retry</button></div>}
          </div>
          <div className="summary-cards"><div className="panel"><div className="term-label">Practice wallet</div><strong className="financial summary-value" data-testid="text-wallet-balance">{signedIn ? `${wallet?.currency ?? 'USD'} ${Number(wallet?.balance ?? 0).toFixed(2)}` : 'Sign in to view'}</strong></div><div className="panel"><div className="term-label">Session mode</div><strong className="summary-value">Paper only</strong></div><div className="panel"><div className="term-label">Payout preview</div><strong className="financial summary-value">82%</strong></div></div>
          {profile.isError && session && <div className="error-panel" role="alert">Your account session could not be loaded. Sign in again to view the demo wallet. <button className="small-btn" onClick={() => setAuthOpen(true)}>Sign in</button></div>}
          {snapshot.isError && signedIn && <div className="error-panel" role="alert">Account snapshot unavailable. <button className="small-btn" onClick={() => void snapshot.refetch()}>Retry</button></div>}
        </section>
        <DashboardControls symbol={currentSymbol} assetOptions={forexMarkets.map(({ symbol, name }) => ({ symbol, name }))} price={price} side={side} amount={amount} expiry={expirySeconds} timerLabel={timerLabel} strategy={customStrategy || strategy} aiEnabled={aiEnabled} localPreview={localPreview} error={tradeError} trades={trades} now={now} onSide={setSide} onAssetChange={setSymbol} onAmount={setAmount} onExpiry={setExpirySeconds} onStrategy={value => { setStrategy(value); setCustomStrategy(''); }} onAiEnabled={setAiEnabled} onTrade={addPracticeTrade} onCustomStrategy={value => { setCustomStrategy(value); setStrategy(value); }} />
      </div>
      <div className="terminal-disclaimer">All displayed prices and scenario outcomes are simulated. TradeitX has no broker connection and does not execute real-money trades.</div>
    </div>
    {authOpen && <TraderAuthDialog onClose={() => setAuthOpen(false)} onAuthenticated={() => { setSession(true); void queryClient.invalidateQueries({ queryKey: getGetTraderProfileQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetTraderSnapshotQueryKey() }); }} />}
    {fundsOpen && <DemoFundsDialog onClose={() => setFundsOpen(false)} onSubmit={handleFunds} busy={addDemoFunds.isPending} error={fundError} />}
  </main>;
}
