import { useState } from 'react';
import { Clock3, Sparkles, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { formatForexPair, formatOtcAsset } from '@/lib/market-label';

export type TradeSide = 'BUY' | 'SELL';
export interface PracticeTrade {
  id: string;
  asset: string;
  amount: number;
  side: TradeSide;
  entryPrice: number;
  expirySeconds: number;
  expiresAt: number;
  outcome: 'PENDING' | 'WIN_SIMULATED' | 'LOSS_SIMULATED' | 'TIE_SIMULATED';
  exitPrice?: number;
}

interface Props {
  symbol: string;
  assetOptions: { symbol: string; name: string }[];
  price: number;
  side: TradeSide;
  amount: string;
  expiry: number;
  timerLabel: string;
  strategy: string;
  aiEnabled: boolean;
  localPreview: string;
  error: string;
  trades: PracticeTrade[];
  now: number;
  onSide: (side: TradeSide) => void;
  onAssetChange: (symbol: string) => void;
  onAmount: (value: string) => void;
  onExpiry: (seconds: number) => void;
  onStrategy: (strategy: string) => void;
  onAiEnabled: (enabled: boolean) => void;
  onTrade: (side: TradeSide) => void;
  onCustomStrategy: (name: string) => void;
}

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function DashboardControls(props: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRules, setCustomRules] = useState('');
  const payout = Number(props.amount || 0) * .82;
  const submitCustom = (event: FormEvent) => {
    event.preventDefault();
    if (!customName.trim() || !customRules.trim()) return;
    props.onCustomStrategy(customName.trim());
    setCustomOpen(false);
    setCustomName('');
    setCustomRules('');
  };
  return <>
    <aside className="panel scenario-panel">
      <div className="flex justify-between items-center"><h2>New scenario</h2><span className="status-pill">82% PAYOUT</span></div>
      <p className="disclaimer">A directional practice exercise. Results are simulated only.</p>
      <label className="field-label" htmlFor="scenario-asset">ASSET</label>
      <select id="scenario-asset" className="trade-input" value={props.symbol} onChange={event => props.onAssetChange(event.target.value)} aria-label="Select a simulated Forex asset" data-testid="select-scenario-asset">
        {props.assetOptions.map(asset => <option value={asset.symbol} key={asset.symbol}>{formatOtcAsset(asset.symbol)}</option>)}
      </select>
      <p className="asset-caption" data-testid="text-selected-asset">{formatOtcAsset(props.symbol)}</p>
      <label className="field-label" htmlFor="investment">INVESTMENT (DEMO USD)</label>
      <input id="investment" type="number" min="1" max="10000" step="1" className="trade-input financial" value={props.amount} onChange={event => props.onAmount(event.target.value)} data-testid="input-investment" />
      <div className="flex justify-between payout-row"><span>Potential return at 82%</span><b className="financial">{payout.toFixed(2)} USD</b></div>
      <label className="field-label" htmlFor="expiration">EXPIRATION</label>
      <div className="flex gap-7"><select id="expiration" className="trade-input" value={props.expiry} onChange={event => props.onExpiry(Number(event.target.value))} data-testid="select-expiration">{[5, 15, 30, 60, 300].map(value => <option value={value} key={value}>{formatClock(value)}</option>)}</select><span className="flex items-center gap-2 financial countdown"><Clock3 size={15} /><span data-testid="text-expiration-timer">{props.timerLabel}</span></span></div>
      <label className="field-label">DIRECTION</label>
      <div className="side-switch"><button type="button" className={props.side === 'BUY' ? 'selected' : ''} onClick={() => props.onSide('BUY')} data-testid="button-side-buy">BUY / UP</button><button type="button" className={props.side === 'SELL' ? 'selected' : ''} onClick={() => props.onSide('SELL')} data-testid="button-side-sell">SELL / DOWN</button></div>
      <div className="flex gap-2 scenario-actions"><button type="button" className="buy-btn" onClick={() => props.onTrade('BUY')} data-testid="button-submit-buy">BUY · SIMULATE</button><button type="button" className="sell-btn" onClick={() => props.onTrade('SELL')} data-testid="button-submit-sell">SELL · SIMULATE</button></div>
      {props.error && <p className="error-text" role="alert" data-testid="status-trade-error">{props.error}</p>}
      <label className="field-label">STRATEGY WORKFLOW</label>
      <button type="button" className={`strategy-card ${props.strategy === 'Trend Follower' ? 'selected' : ''}`} onClick={() => props.onStrategy('Trend Follower')} data-testid="button-strategy-trend"><strong>Trend Follower</strong><small>Practice waiting for a directional confirmation.</small></button>
      <button type="button" className={`strategy-card ${props.strategy === 'Mean Reversion' ? 'selected' : ''}`} onClick={() => props.onStrategy('Mean Reversion')} data-testid="button-strategy-reversion"><strong>Mean Reversion</strong><small>Study a return toward a recent average.</small></button>
      <button type="button" className="small-btn custom-strategy-open" onClick={() => setCustomOpen(true)} data-testid="button-custom-strategy">+ Custom Strategy</button>
      <label className="ai-toggle"><span className="flex items-center gap-2"><Sparkles size={14} /> AI-assist preview</span><input type="checkbox" checked={props.aiEnabled} onChange={event => props.onAiEnabled(event.target.checked)} data-testid="toggle-ai-preview" /></label>
      {props.aiEnabled && <div className="content-panel ai-preview"><div className="term-label">LOCAL HEURISTIC · DEMO PREVIEW</div><p data-testid="text-ai-preview">{props.localPreview}</p><span className="disclaimer">Not actual AI output. Not financial advice or a trade signal.</span></div>}
      <p className="disclaimer scenario-disclaimer">Every quote and scenario is simulated. No broker connection, guaranteed outcome, or real-money execution.</p>
    </aside>
    <section className="panel practice-log" aria-label="Simulated practice records">
      <div className="practice-log-heading"><div><div className="term-label">SESSION RECORD</div><h3>Practice scenarios</h3></div><span className="disclaimer">Saved in this browser session</span></div>
      {props.trades.length === 0 ? <div className="empty-practice">No scenarios yet. A simulated record appears here when you choose BUY or SELL.</div> : <div className="practice-records">{props.trades.map(trade => {
        const remaining = Math.max(0, Math.ceil((trade.expiresAt - props.now) / 1000));
        const status = trade.outcome === 'PENDING' ? `PENDING · ${formatClock(remaining)}` : trade.outcome.replaceAll('_', ' ');
        return <article className="practice-record" key={trade.id} data-testid={`record-practice-${trade.id}`}>
          <div className="practice-record-head"><strong>{formatForexPair(trade.asset)}</strong><span className={`record-result ${trade.outcome.toLowerCase()}`}>{status}</span></div>
          <div className="practice-record-values"><span>{trade.side} · {trade.amount.toFixed(2)} USD</span><span>Entry {trade.entryPrice.toFixed(5)}</span><span>Expiry {formatClock(trade.expirySeconds)}</span></div>
          {trade.exitPrice !== undefined && <div className="record-exit">Simulated exit {trade.exitPrice.toFixed(5)} · {trade.outcome.replaceAll('_', ' ')}</div>}
          <div className="disclaimer">SIMULATED PRACTICE RESULT · NO ORDER EXECUTED</div>
        </article>;
      })}</div>}
    </section>
    {customOpen && <div className="auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setCustomOpen(false); }}>
      <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="custom-title">
        <div className="flex justify-between"><div><div className="section-kicker">PAPER WORKFLOW</div><h2 id="custom-title">Custom Strategy</h2></div><button className="small-btn" onClick={() => setCustomOpen(false)} aria-label="Close custom strategy" data-testid="button-close-custom-strategy"><X size={15} /></button></div>
        <p className="disclaimer">Create a practice prompt. It does not automate or execute trades.</p>
        <form onSubmit={submitCustom}><label className="field-label" htmlFor="custom-name">STRATEGY NAME</label><input id="custom-name" className="trade-input" required value={customName} onChange={event => setCustomName(event.target.value)} placeholder="e.g. London range test" data-testid="input-custom-strategy-name" />
          <label className="field-label" htmlFor="custom-rules">RULES TO REVIEW</label><textarea id="custom-rules" className="trade-input" required value={customRules} onChange={event => setCustomRules(event.target.value)} style={{ height: 100, paddingTop: 9 }} placeholder="What confirms your thesis? What invalidates it?" data-testid="input-custom-strategy-rules" />
          <button type="submit" className="button-yellow" style={{ width: '100%', marginTop: 15 }} data-testid="button-save-custom-strategy">Save practice workflow</button>
        </form>
      </section>
    </div>}
  </>;
}

