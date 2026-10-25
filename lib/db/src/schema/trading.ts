import {
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const traderRoleEnum = pgEnum("trader_role", ["USER", "ADMIN"]);
export const orderTypeEnum = pgEnum("trader_order_type", ["MARKET", "LIMIT", "STOP_LOSS", "TAKE_PROFIT"]);
export const orderSideEnum = pgEnum("trader_order_side", ["BUY", "SELL"]);
export const orderStatusEnum = pgEnum("trader_order_status", ["OPEN", "FILLED", "CANCELLED", "LIQUIDATED", "CLOSED", "PENDING"]);

export const usersTable = pgTable(
  "trader_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: traderRoleEnum("role").notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("trader_users_email_idx").on(table.email)],
);

export const walletsTable = pgTable(
  "trader_wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 12 }).notNull().default("USD"),
    balance: real("balance").notNull().default(10000),
    frozenBalance: real("frozen_balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("trader_wallets_user_idx").on(table.userId)],
);

export const ordersTable = pgTable(
  "trader_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 32 }).notNull(),
    side: orderSideEnum("side").notNull(),
    type: orderTypeEnum("type").notNull(),
    status: orderStatusEnum("status").notNull().default("OPEN"),
    amount: real("amount").notNull(),
    leverage: integer("leverage").notNull().default(1),
    entryPrice: real("entry_price").notNull(),
    closePrice: real("close_price"),
    margin: real("margin").notNull(),
    stopLoss: real("stop_loss"),
    takeProfit: real("take_profit"),
    liquidationPx: real("liquidation_px"),
    realizedPnL: real("realized_pnl"),
    unrealizedPnL: real("unrealized_pnl").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("trader_orders_user_status_idx").on(table.userId, table.status),
    index("trader_orders_symbol_idx").on(table.symbol),
  ],
);

export const transactionsTable = pgTable(
  "trader_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    amount: real("amount").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("COMPLETED"),
    reference: varchar("reference", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trader_transactions_user_idx").on(table.userId, table.createdAt)],
);

export const insertTraderUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export const insertWalletSchema = createInsertSchema(walletsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  closedAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTraderUser = z.infer<typeof insertTraderUserSchema>;
export type TraderUser = typeof usersTable.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type TraderOrder = typeof ordersTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type TraderTransaction = typeof transactionsTable.$inferSelect;
