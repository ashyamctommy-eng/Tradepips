import { Router, type IRouter } from "express";
import {
  GetCandlesQueryParams,
  GetCandlesResponse,
  GetMarketsResponse,
  GetOrderBookQueryParams,
  GetOrderBookResponse,
} from "@workspace/api-zod";
import { getCandles, getMarkets, getOrderBook } from "../lib/markets";

const router: IRouter = Router();

router.get("/v1/markets", (_req, res): void => {
  res.json(GetMarketsResponse.parse(getMarkets()));
});

router.get("/v1/markets/candles", (req, res): void => {
  const parsed = GetCandlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid chart parameters." });
    return;
  }
  const candles = getCandles(parsed.data.symbol, parsed.data.interval);
  if (!candles) {
    res.status(404).json({ error: "Market not found." });
    return;
  }
  res.json(GetCandlesResponse.parse(candles));
});

router.get("/v1/markets/orderbook", (req, res): void => {
  const parsed = GetOrderBookQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid order book parameters." });
    return;
  }
  const orderBook = getOrderBook(parsed.data.symbol);
  if (!orderBook) {
    res.status(404).json({ error: "Market not found." });
    return;
  }
  res.json(GetOrderBookResponse.parse(orderBook));
});

export default router;
