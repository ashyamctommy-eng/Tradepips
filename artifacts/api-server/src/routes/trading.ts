import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  AddDemoFundsBody,
  AddDemoFundsResponse,
  CancelOrderParams,
  CancelOrderResponse,
  CloseOrderAtExplicitPathBody,
  CloseOrderParams,
  CloseOrderResponse,
  CreateOrderBody,
  CreateOrderResponse,
  GetTraderSnapshotResponse,
} from "@workspace/api-zod";
import {
  db,
  ordersTable,
  transactionsTable,
  walletsTable,
  type TraderOrder,
} from "@workspace/db";
import { requireTraderAuth } from "../middlewares/trader-auth";
import { getMarket, isMarketSymbol } from "../lib/markets";

const router: IRouter = Router();
router.use(requireTraderAuth);

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function unrealized(order: TraderOrder, currentPrice: number): number {
  const direction = order.side === "BUY" ? 1 : -1;
  return roundMoney((currentPrice - order.entryPrice) * order.amount * order.leverage * direction);
}

function liquidationPrice(order: Pick<TraderOrder, "side" | "entryPrice" | "leverage">): number {
  const distance = order.entryPrice / Math.max(1, order.leverage * order.leverage);
  return order.side === "BUY" ? order.entryPrice - distance : order.entryPrice + distance;
}

function serializeOrder(order: TraderOrder) {
  const market = getMarket(order.symbol);
  return {
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    status: order.status,
    amount: order.amount,
    leverage: order.leverage,
    entryPrice: order.entryPrice,
    closePrice: order.closePrice,
    margin: order.margin,
    stopLoss: order.stopLoss,
    takeProfit: order.takeProfit,
    liquidationPx: order.liquidationPx,
    realizedPnL: order.realizedPnL,
    unrealizedPnL: order.status === "OPEN" && market ? unrealized(order, market.price) : 0,
    createdAt: order.createdAt.toISOString(),
    closedAt: order.closedAt?.toISOString() ?? null,
  };
}

router.get("/v1/trader/snapshot", async (_req, res): Promise<void> => {
  const userId = String(res.locals.userId);
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Demo wallet not found." });
    return;
  }

  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(100);
  const snapshot = {
    wallet: {
      currency: wallet.currency,
      balance: wallet.balance,
      frozenBalance: wallet.frozenBalance,
    },
    positions: rows.filter((order) => order.status === "OPEN").map(serializeOrder),
    pendingOrders: rows.filter((order) => order.status === "PENDING").map(serializeOrder),
    history: rows.filter((order) => ["CLOSED", "CANCELLED", "LIQUIDATED"].includes(order.status)).map(serializeOrder),
  };
  res.json(GetTraderSnapshotResponse.parse(snapshot));
});

router.post("/v1/wallet/demo-funds", async (req, res): Promise<void> => {
  const parsed = AddDemoFundsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Enter an amount up to $10,000." });
    return;
  }
  const amount = roundMoney(parsed.data.amount);
  const userId = String(res.locals.userId);
  const wallet = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).for("update").limit(1);
    if (!current) return null;
    const [updated] = await tx
      .update(walletsTable)
      .set({ balance: roundMoney(current.balance + amount), updatedAt: new Date() })
      .where(eq(walletsTable.id, current.id))
      .returning();
    if (!updated) return null;
    await tx.insert(transactionsTable).values({
      userId,
      type: "DEMO_TOP_UP",
      amount,
      status: "COMPLETED",
      reference: "demo-wallet",
    });
    return updated;
  });
  if (!wallet) {
    res.status(404).json({ error: "Demo wallet not found." });
    return;
  }
  res.json(AddDemoFundsResponse.parse({
    currency: wallet.currency,
    balance: wallet.balance,
    frozenBalance: wallet.frozenBalance,
  }));
});

const createOrderHandler = async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid order details." });
    return;
  }

  const input = parsed.data;
  const symbol = input.symbol.toUpperCase();
  const market = getMarket(symbol);
  if (!market || !isMarketSymbol(symbol)) {
    res.status(400).json({ error: "Choose an available demo market." });
    return;
  }
  if (input.amount > 10000) {
    res.status(400).json({ error: "Order size exceeds the demo account limit." });
    return;
  }
  if (input.type === "LIMIT" && (!input.limitPrice || input.limitPrice <= 0)) {
    res.status(400).json({ error: "Enter a valid limit price." });
    return;
  }
  const entryPrice = input.type === "LIMIT" ? Number(input.limitPrice) : market.price;
  const margin = roundMoney((input.amount * entryPrice) / input.leverage);
  if (!Number.isFinite(margin) || margin <= 0) {
    res.status(400).json({ error: "Order margin is invalid." });
    return;
  }
  if (input.stopLoss != null && (input.side === "BUY" ? input.stopLoss >= entryPrice : input.stopLoss <= entryPrice)) {
    res.status(400).json({ error: "Stop loss must be below entry for a long or above entry for a short." });
    return;
  }
  if (input.takeProfit != null && (input.side === "BUY" ? input.takeProfit <= entryPrice : input.takeProfit >= entryPrice)) {
    res.status(400).json({ error: "Take profit must be above entry for a long or below entry for a short." });
    return;
  }

  const userId = String(res.locals.userId);
  const created = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).for("update").limit(1);
    if (!wallet) return { error: "DEMO_WALLET_MISSING" as const };
    if (margin > wallet.balance - wallet.frozenBalance) return { error: "INSUFFICIENT_MARGIN" as const };
    const [order] = await tx
      .insert(ordersTable)
      .values({
        userId,
        symbol,
        side: input.side,
        type: input.type,
        status: input.type === "LIMIT" ? "PENDING" : "OPEN",
        amount: input.amount,
        leverage: input.leverage,
        entryPrice,
        margin,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
        liquidationPx: liquidationPrice({ side: input.side, entryPrice, leverage: input.leverage }),
        unrealizedPnL: 0,
      })
      .returning();
    if (!order) throw new Error("Order could not be saved.");
    await tx
      .update(walletsTable)
      .set({ frozenBalance: roundMoney(wallet.frozenBalance + margin), updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id));
    return { order };
  });

  if ("error" in created) {
    if (created.error === "INSUFFICIENT_MARGIN") {
      res.status(409).json({ error: "Not enough available demo balance for this margin requirement." });
      return;
    }
    res.status(404).json({ error: "Demo wallet not found." });
    return;
  }
  res.status(201).json(CreateOrderResponse.parse(serializeOrder(created.order)));
};
router.post("/v1/orders", createOrderHandler);
router.post("/v1/orders/create", createOrderHandler);

async function settlePosition(
  userId: string,
  orderId: string,
  executionPrice: number,
  transactionType: "SIMULATED_CLOSE" | "SIMULATED_LIQUIDATION" | "SIMULATED_STOP" | "SIMULATED_TAKE_PROFIT",
) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, userId)))
      .for("update")
      .limit(1);
    if (!order || order.status !== "OPEN") return null;

    const [wallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).for("update").limit(1);
    if (!wallet) return null;
    const grossPnL = unrealized(order, executionPrice);
    const finalPnL = Math.max(grossPnL, -order.margin);
    const [settled] = await tx
      .update(ordersTable)
      .set({
        status: transactionType === "SIMULATED_LIQUIDATION" ? "LIQUIDATED" : "CLOSED",
        closePrice: executionPrice,
        realizedPnL: finalPnL,
        unrealizedPnL: 0,
        closedAt: new Date(),
      })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "OPEN")))
      .returning();
    if (!settled) return null;

    await tx
      .update(walletsTable)
      .set({
        balance: roundMoney(wallet.balance + finalPnL),
        frozenBalance: Math.max(0, roundMoney(wallet.frozenBalance - order.margin)),
        updatedAt: new Date(),
      })
      .where(eq(walletsTable.id, wallet.id));
    await tx.insert(transactionsTable).values({
      userId,
      type: transactionType,
      amount: finalPnL,
      status: "COMPLETED",
      reference: order.id,
    });
    return settled;
  });
}

const closeOrderHandler = async (req: Request, res: Response): Promise<void> => {
  let orderId = req.params.orderId;
  if (typeof orderId !== "string" || !orderId) {
    const body = CloseOrderAtExplicitPathBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Provide a valid order identifier." });
      return;
    }
    orderId = body.data.orderId;
  }
  const params = CloseOrderParams.safeParse({ orderId });
  if (!params.success) {
    res.status(400).json({ error: "Invalid order identifier." });
    return;
  }
  const userId = String(res.locals.userId);
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.userId, userId), eq(ordersTable.status, "OPEN")))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "Open position not found." });
    return;
  }
  const market = getMarket(order.symbol);
  if (!market) {
    res.status(404).json({ error: "Market not found." });
    return;
  }
  const settled = await settlePosition(userId, order.id, market.price, "SIMULATED_CLOSE");
  if (!settled) {
    res.status(404).json({ error: "Open position not found." });
    return;
  }
  res.json(CloseOrderResponse.parse(serializeOrder(settled)));
};
router.post("/v1/orders/close", closeOrderHandler);
router.post("/v1/orders/:orderId/close", closeOrderHandler);

router.post("/v1/orders/:orderId/cancel", async (req, res): Promise<void> => {
  const params = CancelOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid order identifier." });
    return;
  }
  const userId = String(res.locals.userId);
  const cancelled = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.userId, userId), eq(ordersTable.status, "PENDING")))
      .for("update")
      .limit(1);
    if (!order) return null;
    const [wallet] = await tx.select().from(walletsTable).where(eq(walletsTable.userId, userId)).for("update").limit(1);
    if (!wallet) return null;
    const [updated] = await tx
      .update(ordersTable)
      .set({ status: "CANCELLED", closedAt: new Date() })
      .where(eq(ordersTable.id, order.id))
      .returning();
    if (!updated) return null;
    await tx
      .update(walletsTable)
      .set({ frozenBalance: Math.max(0, roundMoney(wallet.frozenBalance - order.margin)), updatedAt: new Date() })
      .where(eq(walletsTable.id, wallet.id));
    return updated;
  });
  if (!cancelled) {
    res.status(404).json({ error: "Pending order not found." });
    return;
  }
  res.json(CancelOrderResponse.parse(serializeOrder(cancelled)));
});

export async function processTriggeredOrders(): Promise<void> {
  const pending = await db.select().from(ordersTable).where(eq(ordersTable.status, "PENDING"));
  for (const order of pending) {
    const market = getMarket(order.symbol);
    if (!market) continue;
    const limitPrice = order.entryPrice;
    const triggered = order.side === "BUY" ? market.price <= limitPrice : market.price >= limitPrice;
    if (!triggered) continue;
    await db
      .update(ordersTable)
      .set({ status: "OPEN", entryPrice: market.price, liquidationPx: liquidationPrice({ side: order.side, entryPrice: market.price, leverage: order.leverage }) })
      .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "PENDING")));
  }
}

export async function processRiskTriggers(): Promise<void> {
  const positions = await db.select().from(ordersTable).where(inArray(ordersTable.status, ["OPEN"]));
  for (const order of positions) {
    const market = getMarket(order.symbol);
    if (!market) continue;
    const pnl = unrealized(order, market.price);
    const liquidated = pnl <= -order.margin;
    const stopTriggered = order.stopLoss != null && (order.side === "BUY" ? market.price <= order.stopLoss : market.price >= order.stopLoss);
    const takeTriggered = order.takeProfit != null && (order.side === "BUY" ? market.price >= order.takeProfit : market.price <= order.takeProfit);
    if (!liquidated && !stopTriggered && !takeTriggered) continue;
    const reason = liquidated ? "SIMULATED_LIQUIDATION" : stopTriggered ? "SIMULATED_STOP" : "SIMULATED_TAKE_PROFIT";
    await settlePosition(order.userId, order.id, market.price, reason);
  }
}

export default router;
