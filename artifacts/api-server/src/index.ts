import app from "./app";
import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { getMarkets, getOrderBook, tickMarkets } from "./lib/markets";
import { processRiskTriggers, processTriggeredOrders } from "./routes/trading";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
const webSockets = new WebSocketServer({ server, path: "/ws" });

webSockets.on("connection", (socket) => {
  socket.send(JSON.stringify({ event: "market.snapshot", data: getMarkets() }));
});

const marketLoop = setInterval(() => {
  const markets = tickMarkets();
  for (const market of markets) {
    const payloads = [
      { event: "ticker", data: market },
      {
        event: "@kline",
        data: {
          symbol: market.symbol,
          time: Math.floor(Date.now() / 60_000) * 60,
          open: market.price,
          high: market.high24h,
          low: market.low24h,
          close: market.price,
          volume: market.volume / 1440,
        },
      },
      { event: "orderbook", data: getOrderBook(market.symbol) },
    ];
    for (const client of webSockets.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      for (const payload of payloads) client.send(JSON.stringify(payload));
    }
  }
  void Promise.all([processTriggeredOrders(), processRiskTriggers()]).catch((err: unknown) => {
    logger.error({ err }, "Simulated order risk processing failed");
  });
}, 1_000);
marketLoop.unref();

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
