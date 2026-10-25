export function formatForexPair(symbol: string): string {
  return /^[A-Z]{6}$/.test(symbol)
    ? `${symbol.slice(0, 3)}/${symbol.slice(3)}`
    : symbol;
}

export function formatOtcAsset(symbol: string): string {
  return `${formatForexPair(symbol)} OTC · LIVE`;
}
