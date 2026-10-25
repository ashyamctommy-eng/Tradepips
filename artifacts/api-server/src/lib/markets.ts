export type MarketCategory = "Crypto" | "Forex" | "Commodities" | "Indices";

export interface MarketState {
  symbol: string;
  name: string;
  category: MarketCategory;
  price: number;
  basePrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  bid: number;
  ask: number;
}

const seedMarkets: Omit<MarketState, "price" | "high24h" | "low24h" | "bid" | "ask">[] = [
  { symbol: "BTCUSDT", name: "Bitcoin / Tether", category: "Crypto", basePrice: 67420.5, change24h: 2.84, volume: 1842.7 },
  { symbol: "ETHUSDT", name: "Ethereum / Tether", category: "Crypto", basePrice: 3528.14, change24h: 1.27, volume: 12840.3 },
  { symbol: "SOLUSDT", name: "Solana / Tether", category: "Crypto", basePrice: 184.62, change24h: -0.68, volume: 95841.6 },
  { symbol: "EURUSD", name: "Euro / US Dollar", category: "Forex", basePrice: 1.08426, change24h: 0.14, volume: 324.8 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "Forex", basePrice: 1.27184, change24h: -0.22, volume: 209.4 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", category: "Forex", basePrice: 149.82, change24h: 0.31, volume: 196.2 },
  { symbol: "XAUUSD", name: "Gold / US Dollar", category: "Commodities", basePrice: 2341.8, change24h: 0.62, volume: 82.1 },
  { symbol: "WTIUSD", name: "WTI Crude Oil", category: "Commodities", basePrice: 78.64, change24h: -1.12, volume: 154.7 },
  { symbol: "US500", name: "US 500 Index", category: "Indices", basePrice: 5234.6, change24h: 0.48, volume: 415.1 },
  { symbol: "NAS100", name: "US Tech 100 Index", category: "Indices", basePrice: 18212.3, change24h: 0.91, volume: 372.6 },
];

const quotes = new Map<string, MarketState>(
  seedMarkets.map((market) => [
    market.symbol,
    {
      ...market,
      price: market.basePrice,
      high24h: market.basePrice * 1.012,
      low24h: market.basePrice * 0.989,
      bid: market.basePrice,
      ask: market.basePrice,
    },
  ]),
);

function tickSize(price: number): number {
  if (price >= 1000) return 0.1;
  if (price >= 100) return 0.01;
  if (price >= 1) return 0.0001;
  return 0.00001;
}

export function getMarkets(): MarketState[] {
  return [...quotes.values()].map((quote) => ({ ...quote }));
}

export function getMarket(symbol: string): MarketState | undefined {
  const quote = quotes.get(symbol.toUpperCase());
  return quote ? { ...quote } : undefined;
}

export function tickMarkets(): MarketState[] {
  for (const market of quotes.values()) {
    const step = tickSize(market.price);
    const movement = (Math.random() - 0.498) * step * 7;
    market.price = Math.max(step, Math.round((market.price + movement) / step) * step);
    market.bid = market.price - step;
    market.ask = market.price + step;
    market.high24h = Math.max(market.high24h, market.price);
    market.low24h = Math.min(market.low24h, market.price);
    market.change24h = ((market.price / market.basePrice) - 1) * 100;
  }
  return getMarkets();
}

export function getOrderBook(symbol: string) {
  const market = getMarket(symbol);
  if (!market) return null;
  const step = tickSize(market.price);
  const bids = [];
  const asks = [];
  let bidTotal = 0;
  let askTotal = 0;
  for (let index = 1; index <= 8; index += 1) {
    const bidAmount = 0.08 + Math.random() * 0.92;
    const askAmount = 0.08 + Math.random() * 0.92;
    bidTotal += bidAmount;
    askTotal += askAmount;
    bids.push({ price: market.price - step * index, amount: bidAmount, total: bidTotal });
    asks.push({ price: market.price + step * index, amount: askAmount, total: askTotal });
  }
  return {
    symbol: market.symbol,
    bids: bids.reverse(),
    asks: asks.reverse(),
    spread: market.ask - market.bid,
  };
}

const intervalSeconds: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export function getCandles(symbol: string, interval: string) {
  const market = getMarket(symbol);
  const seconds = intervalSeconds[interval];
  if (!market || !seconds) return null;

  const volatility = market.category === "Crypto" ? 0.0026 : market.category === "Forex" ? 0.00042 : 0.0011;
  const currentBucket = Math.floor(Date.now() / 1000 / seconds) * seconds;
  const candles = [];
  let previousClose = market.price * (1 - Math.sin(currentBucket / seconds) * volatility * 18);

  for (let index = 79; index >= 0; index -= 1) {
    const time = currentBucket - index * seconds;
    const phase = Math.sin(time / seconds * 1.73 + symbol.length);
    const drift = Math.cos(time / seconds * 0.39 + symbol.charCodeAt(0)) * volatility * 0.48;
    const open = previousClose;
    const close = Math.max(0.00001, open * (1 + drift + phase * volatility * 0.19));
    const wick = Math.abs(phase) * volatility * 0.36;
    candles.push({
      time,
      open,
      high: Math.max(open, close) * (1 + wick),
      low: Math.min(open, close) * (1 - wick),
      close,
      volume: Math.max(0.01, market.volume * (0.006 + Math.abs(phase) * 0.012)),
    });
    previousClose = close;
  }
  const last = candles[candles.length - 1];
  if (last) last.close = market.price;
  return candles;
}

export function isMarketSymbol(symbol: string): boolean {
  return quotes.has(symbol.toUpperCase());
}
