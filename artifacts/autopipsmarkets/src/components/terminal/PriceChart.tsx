import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Pen, RectangleHorizontal, RotateCcw } from 'lucide-react';
import type { Candle } from '@workspace/api-client-react';

export type ChartInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type DrawingTool = 'cursor' | 'pen' | 'rectangle' | 'fibonacci';
type Point = { x: number; y: number };
type Drawing = { tool: Exclude<DrawingTool, 'cursor'>; points: Point[] };
type Indicator = 'RSI' | 'MACD' | 'Bollinger' | 'MA20' | 'MA50';

const periods: ChartInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const defaultIndicators: Indicator[] = ['RSI', 'MACD', 'Bollinger', 'MA20', 'MA50'];
const sample = Array.from({ length: 64 }, (_, index) => {
  const close = 1.081 + Math.sin(index * .48) * .002 + index * .0001 + Math.sin(index * .11) * .0015;
  return { time: index, open: close - Math.cos(index) * .0005, close, high: close + .0009, low: close - .0008, volume: 100 };
});

function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, index) => index < period - 1 ? null : values.slice(index - period + 1, index + 1).reduce((sum, value) => sum + value, 0) / period);
}
function ema(values: number[], period: number): number[] {
  const alpha = 2 / (period + 1);
  return values.reduce<number[]>((result, value, index) => {
    result.push(index === 0 ? value : value * alpha + result[index - 1] * (1 - alpha));
    return result;
  }, []);
}
function rsi(values: number[], period = 14): (number | null)[] {
  return values.map((_, index) => {
    if (index < period) return null;
    let gains = 0; let losses = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      const delta = values[cursor] - values[cursor - 1];
      if (delta >= 0) gains += delta; else losses -= delta;
    }
    return losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
  });
}
function linePath(values: (number | null)[], px: (index: number) => number, py: (value: number) => number) {
  return values.reduce((path, value, index) => value === null ? path : `${path}${path ? ' L' : 'M'} ${px(index)} ${py(value)}`, '');
}

export interface PriceChartProps {
  candles?: Candle[];
  loading: boolean;
  symbol: string;
  interval: ChartInterval;
  onInterval: (interval: ChartInterval) => void;
}

export default function PriceChart({ candles, loading, symbol, interval, onInterval }: PriceChartProps) {
  const [tool, setTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>(defaultIndicators);
  const pointerDown = useRef(false);
  const points = candles?.length ? candles : sample;
  const closeValues = useMemo(() => points.map(candle => candle.close), [points]);
  const indicatorValues = useMemo(() => {
    const ma20 = sma(closeValues, 20);
    const ma50 = sma(closeValues, 50);
    const mid = sma(closeValues, 20);
    const variance = mid.map((mean, index) => mean === null ? null : closeValues.slice(Math.max(0, index - 19), index + 1).reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.min(index + 1, 20));
    const upper = mid.map((mean, index) => mean === null || variance[index] === null ? null : mean + 2 * Math.sqrt(variance[index] ?? 0));
    const lower = mid.map((mean, index) => mean === null || variance[index] === null ? null : mean - 2 * Math.sqrt(variance[index] ?? 0));
    const fast = ema(closeValues, 12); const slow = ema(closeValues, 26);
    const macd = fast.map((value, index) => value - slow[index]);
    const signal = ema(macd, 9);
    return { ma20, ma50, upper, lower, rsi: rsi(closeValues), macd, signal, histogram: macd.map((value, index) => value - signal[index]) };
  }, [closeValues]);
  const minPrice = Math.min(...points.map(candle => candle.low), ...indicatorValues.lower.filter((n): n is number => n !== null));
  const maxPrice = Math.max(...points.map(candle => candle.high), ...indicatorValues.upper.filter((n): n is number => n !== null));
  const px = (index: number) => 24 + index * (752 / Math.max(1, points.length - 1));
  const py = (value: number) => 220 - ((value - minPrice) / (maxPrice - minPrice || 1)) * 175;
  const priceLine = linePath(closeValues, px, py);
  const priceAt = (y: number) => maxPrice - ((y - 45) / 175) * (maxPrice - minPrice);
  const svgPoint = (event: ReactPointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(24, Math.min(776, ((event.clientX - rect.left) / rect.width) * 800)), y: Math.max(45, Math.min(220, ((event.clientY - rect.top) / rect.height) * 280)) };
  };
  const beginDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === 'cursor') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDown.current = true;
    setCurrent([svgPoint(event)]);
  };
  const continueDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointerDown.current) return;
    const next = svgPoint(event);
    setCurrent(existing => tool === 'pen' ? [...existing, next] : [existing[0], next]);
  };
  const finishDrawing = () => {
    if (pointerDown.current && current.length) setDrawings(existing => [...existing, { tool: tool as Drawing['tool'], points: current }]);
    pointerDown.current = false;
    setCurrent([]);
  };
  const drawShape = (drawing: Drawing, index: number) => {
    const [start, end = start] = drawing.points;
    if (!start) return null;
    if (drawing.tool === 'pen') return <polyline key={index} points={drawing.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#c38c00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
    if (drawing.tool === 'rectangle') return <rect key={index} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(end.x - start.x)} height={Math.abs(end.y - start.y)} fill="#e7c630" fillOpacity=".12" stroke="#b28c00" strokeWidth="1.5" />;
    const levels = [0, .236, .382, .5, .618, .786, 1];
    return <g key={index}>{levels.map(level => {
      const y = start.y + (end.y - start.y) * level;
      return <g key={level}><line x1={Math.min(start.x, end.x)} x2="780" y1={y} y2={y} stroke="#a98716" strokeDasharray="4 4" /><text x="714" y={y - 3} fill="#806b17" fontSize="8">{level.toFixed(3)} · {priceAt(y).toFixed(5)}</text></g>;
    })}</g>;
  };
  const toggleIndicator = (indicator: Indicator) => setIndicators(currentIndicators => currentIndicators.includes(indicator) ? currentIndicators.filter(item => item !== indicator) : [...currentIndicators, indicator]);

  return <div className="chart-box">
    <div className="chart-top"><div className="flex gap-1">{periods.map(value => <button type="button" key={value} className={`tool-btn ${interval === value ? 'selected' : ''}`} onClick={() => onInterval(value)} data-testid={`button-interval-${value}`}>{value}</button>)}</div><span className="mono chart-count">{symbol} · {candles?.length ?? points.length} samples</span></div>
    {loading ? <div className="skeleton" data-testid="loading-candles" /> : <svg viewBox="0 0 800 280" className={`chart-svg ${tool !== 'cursor' ? 'drawing-active' : ''}`} role="img" aria-label={`${symbol} simulated price chart with interactive drawing surface`} data-testid="chart-price" onPointerDown={beginDrawing} onPointerMove={continueDrawing} onPointerUp={finishDrawing} onPointerCancel={finishDrawing}>
      <defs><linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#528b76" stopOpacity=".2" /><stop offset="1" stopColor="#528b76" stopOpacity="0" /></linearGradient></defs>
      {[45, 90, 135, 180, 220].map(y => <line key={y} x1="20" x2="790" y1={y} y2={y} className="chart-grid" />)}
      <path d={`${priceLine} L ${px(points.length - 1)} 235 L ${px(0)} 235 Z`} fill="url(#priceFill)" />
      {indicators.includes('Bollinger') && <><path d={linePath(indicatorValues.upper, px, py)} fill="none" stroke="#9cae9d" strokeWidth="1" strokeDasharray="3 4" /><path d={linePath(indicatorValues.lower, px, py)} fill="none" stroke="#9cae9d" strokeWidth="1" strokeDasharray="3 4" /><path d={`${linePath(indicatorValues.upper, px, py)} ${linePath([...indicatorValues.lower].reverse(), i => px(points.length - 1 - i), py).replace(/^M/, 'L')} Z`} fill="#86a998" fillOpacity=".09" /></>}
      {indicators.includes('MA20') && <path d={linePath(indicatorValues.ma20, px, py)} fill="none" stroke="#d3a900" strokeWidth="1.7" />}
      {indicators.includes('MA50') && <path d={linePath(indicatorValues.ma50, px, py)} fill="none" stroke="#8a6f9d" strokeWidth="1.7" />}
      <path d={priceLine} className="chart-line" />
      {drawings.map(drawShape)}{current.length > 0 && drawShape({ tool: tool as Drawing['tool'], points: current }, -1)}
      {tool !== 'cursor' && <rect x="20" y="40" width="770" height="190" fill="transparent" />}
      <text x="20" y="270" fill="#84908a" fontSize="9">SIMULATED PRICE HISTORY · NOT A LIVE EXECUTION FEED</text>
    </svg>}
    <div className="indicator-row">{defaultIndicators.map(indicator => <button type="button" aria-pressed={indicators.includes(indicator)} className={`indicator-chip ${indicators.includes(indicator) ? 'indicator-on' : ''}`} key={indicator} onClick={() => toggleIndicator(indicator)} data-testid={`toggle-indicator-${indicator.toLowerCase()}`}>{indicator}</button>)}</div>
    {indicators.includes('RSI') && <IndicatorPanel title="RSI · 14" value={indicatorValues.rsi} bounds={[0, 100]} threshold={[30, 70]} color="#806b9a" />}
    {indicators.includes('MACD') && <MacdPanel macd={indicatorValues.macd} signal={indicatorValues.signal} histogram={indicatorValues.histogram} />}
    <div className="tool-row"><span className="term-label" style={{ alignSelf: 'center', marginRight: 5 }}>Draw</span>
      <button type="button" className={`tool-btn ${tool === 'pen' ? 'selected' : ''}`} onClick={() => setTool(tool === 'pen' ? 'cursor' : 'pen')} aria-pressed={tool === 'pen'} data-testid="button-drawing-pen"><Pen size={12} /> Pen</button>
      <button type="button" className={`tool-btn ${tool === 'rectangle' ? 'selected' : ''}`} onClick={() => setTool(tool === 'rectangle' ? 'cursor' : 'rectangle')} aria-pressed={tool === 'rectangle'} data-testid="button-drawing-rectangle"><RectangleHorizontal size={12} /> Rectangle</button>
      <button type="button" className={`tool-btn ${tool === 'fibonacci' ? 'selected' : ''}`} onClick={() => setTool(tool === 'fibonacci' ? 'cursor' : 'fibonacci')} aria-pressed={tool === 'fibonacci'} data-testid="button-drawing-fibonacci">Fibonacci</button>
      <button type="button" className="tool-btn" onClick={() => setDrawings([])} aria-label="Clear chart drawings" data-testid="button-clear-drawings"><RotateCcw size={12} /> Clear</button>
      <span className="disclaimer">{tool === 'cursor' ? 'Select a drawing tool to annotate.' : `Drag on the chart to draw ${tool === 'fibonacci' ? 'a retracement anchored to your points' : tool}.`}</span>
    </div>
  </div>;
}

function IndicatorPanel({ title, value, bounds, threshold, color }: { title: string; value: (number | null)[]; bounds: [number, number]; threshold?: [number, number]; color: string }) {
  const x = (index: number) => 24 + index * (752 / Math.max(1, value.length - 1));
  const y = (number: number) => 69 - ((number - bounds[0]) / (bounds[1] - bounds[0])) * 48;
  return <div className="indicator-panel"><div className="indicator-panel-title">{title} <span>{value.at(-1)?.toFixed(1) ?? '—'}</span></div><svg viewBox="0 0 800 82" role="img" aria-label={`${title} calculated from local candle history`}><line x1="20" x2="790" y1="18" y2="18" className="chart-grid" /><line x1="20" x2="790" y1="69" y2="69" className="chart-grid" />{threshold && <><line x1="20" x2="790" y1={y(threshold[0])} y2={y(threshold[0])} stroke="#d8b5aa" strokeDasharray="3 4" /><line x1="20" x2="790" y1={y(threshold[1])} y2={y(threshold[1])} stroke="#d8b5aa" strokeDasharray="3 4" /></>}<path d={linePath(value, x, y)} fill="none" stroke={color} strokeWidth="1.7" /></svg></div>;
}

function MacdPanel({ macd, signal, histogram }: { macd: number[]; signal: number[]; histogram: number[] }) {
  const range = Math.max(...macd.map(Math.abs), ...signal.map(Math.abs), .00001) * 1.3;
  const y = (value: number) => 40 - value / range * 29;
  const x = (index: number) => 24 + index * (752 / Math.max(1, macd.length - 1));
  return <div className="indicator-panel"><div className="indicator-panel-title">MACD · 12 / 26 / 9 <span>{macd.at(-1)?.toFixed(5)}</span></div><svg viewBox="0 0 800 82" role="img" aria-label="MACD, signal line, and histogram calculated from local candle history"><line x1="20" x2="790" y1="40" y2="40" className="chart-grid" />{histogram.map((value, index) => <rect key={index} x={x(index) - 2} y={Math.min(40, y(value))} width="4" height={Math.max(1, Math.abs(40 - y(value)))} fill={value >= 0 ? '#5a917a' : '#c97668'} opacity=".56" />)}<path d={linePath(macd, x, y)} fill="none" stroke="#6886a0" strokeWidth="1.5" /><path d={linePath(signal, x, y)} fill="none" stroke="#bd9235" strokeWidth="1.5" /></svg></div>;
}

