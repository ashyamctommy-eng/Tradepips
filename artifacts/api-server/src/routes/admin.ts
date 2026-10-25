import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AdjustAdminUserLedgerBody,
  AdjustAdminUserLedgerParams,
  AdjustAdminUserLedgerResponse,
  CreateBlogPostBody,
  CreateBlogPostResponse,
  DeleteBlogPostParams,
  GetAdminPostsResponse,
  GetAdminProfileResponse,
  GetAdminSettingsResponse,
  GetAdminSummaryResponse,
  GetAdminUserLedgerParams,
  GetAdminUserLedgerResponse,
  GetAdminUsersQueryParams,
  GetAdminUsersResponse,
  UpdateAdminSettingBody,
  UpdateAdminSettingParams,
  UpdateAdminSettingResponse,
  UpdateBlogPostBody,
  UpdateBlogPostParams,
  UpdateBlogPostResponse,
} from "@workspace/api-zod";
import {
  blogPostsTable,
  db,
  platformSettingsTable,
  transactionsTable,
  usersTable,
  walletsTable,
} from "@workspace/db";
import { requireAdminAuth } from "../middlewares/admin-auth";
import { requireTraderAuth } from "../middlewares/trader-auth";

const router: IRouter = Router();
router.use(requireTraderAuth, requireAdminAuth);

function serializePost(post: typeof blogPostsTable.$inferSelect) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
  };
}

function serializeLedgerEntry(entry: typeof transactionsTable.$inferSelect) {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    status: entry.status,
    reference: entry.reference,
    createdAt: entry.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

router.get("/v1/admin/me", async (_req, res): Promise<void> => {
  const userId = String(res.locals.userId);
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }
  res.json(GetAdminProfileResponse.parse({ ...user, role: "ADMIN" }));
});

router.get("/v1/admin/summary", async (_req, res): Promise<void> => {
  const [[users], [posts], [publishedPosts], [balance]] = await Promise.all([
    db.select({ value: count() }).from(usersTable),
    db.select({ value: count() }).from(blogPostsTable),
    db.select({ value: count() }).from(blogPostsTable).where(eq(blogPostsTable.status, "PUBLISHED")),
    db.select({ value: sql<number>`coalesce(sum(${walletsTable.balance}), 0)` }).from(walletsTable),
  ]);
  res.json(GetAdminSummaryResponse.parse({
    users: users?.value ?? 0,
    posts: posts?.value ?? 0,
    publishedPosts: publishedPosts?.value ?? 0,
    demoBalance: Number(balance?.value ?? 0),
  }));
});

router.get("/v1/admin/posts", async (_req, res): Promise<void> => {
  const posts = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.updatedAt)).limit(200);
  res.json(GetAdminPostsResponse.parse(posts.map(serializePost)));
});

router.post("/v1/admin/posts", async (req, res): Promise<void> => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid article." });
    return;
  }
  const input = parsed.data;
  try {
    const [post] = await db.insert(blogPostsTable).values({
      ...input,
      authorId: String(res.locals.userId),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    }).returning();
    if (!post) throw new Error("Article could not be created.");
    res.status(201).json(CreateBlogPostResponse.parse(serializePost(post)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That article URL is already in use." });
      return;
    }
    throw error;
  }
});

router.patch("/v1/admin/posts/:postId", async (req, res): Promise<void> => {
  const params = UpdateBlogPostParams.safeParse(req.params);
  const parsed = UpdateBlogPostBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Enter at least one valid article field." });
    return;
  }
  const [current] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.postId)).limit(1);
  if (!current) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  const nextStatus = parsed.data.status ?? current.status;
  try {
    const [post] = await db.update(blogPostsTable).set({
      ...parsed.data,
      updatedAt: new Date(),
      publishedAt: nextStatus === "PUBLISHED" ? current.publishedAt ?? new Date() : null,
    }).where(eq(blogPostsTable.id, params.data.postId)).returning();
    if (!post) {
      res.status(404).json({ error: "Article not found." });
      return;
    }
    res.json(UpdateBlogPostResponse.parse(serializePost(post)));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That article URL is already in use." });
      return;
    }
    throw error;
  }
});

router.delete("/v1/admin/posts/:postId", async (req, res): Promise<void> => {
  const params = DeleteBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid article identifier." });
    return;
  }
  const [deleted] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, params.data.postId)).returning({ id: blogPostsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Article not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/v1/admin/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(platformSettingsTable).orderBy(platformSettingsTable.key);
  res.json(GetAdminSettingsResponse.parse(rows.map((row) => ({
    key: row.key,
    value: row.value,
    updatedAt: row.updatedAt.toISOString(),
  }))));
});

router.put("/v1/admin/settings/:key", async (req, res): Promise<void> => {
  const params = UpdateAdminSettingParams.safeParse(req.params);
  const parsed = UpdateAdminSettingBody.safeParse(req.body);
  if (!params.success || !parsed.success || !/^[a-z][a-zA-Z0-9_.-]{0,79}$/.test(params.data?.key ?? "")) {
    res.status(400).json({ error: "Enter a valid setting key and value." });
    return;
  }
  const [setting] = await db.insert(platformSettingsTable).values({
    key: params.data.key,
    value: parsed.data.value,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: platformSettingsTable.key,
    set: { value: parsed.data.value, updatedAt: new Date() },
  }).returning();
  if (!setting) throw new Error("Setting could not be saved.");
  res.json(UpdateAdminSettingResponse.parse({
    key: setting.key,
    value: setting.value,
    updatedAt: setting.updatedAt.toISOString(),
  }));
});

router.get("/v1/admin/users", async (req, res): Promise<void> => {
  const parsed = GetAdminUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account search." });
    return;
  }
  const search = parsed.data.search?.trim();
  const filters = search ? or(ilike(usersTable.email, `%${search}%`)) : undefined;
  const rows = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
    currency: walletsTable.currency,
    balance: walletsTable.balance,
    frozenBalance: walletsTable.frozenBalance,
  }).from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(filters)
    .orderBy(desc(usersTable.createdAt))
    .limit(100);
  res.json(GetAdminUsersResponse.parse(rows.filter((row) => row.currency !== null && row.balance !== null && row.frozenBalance !== null).map((row) => ({
    ...row,
    currency: row.currency!,
    balance: row.balance!,
    frozenBalance: row.frozenBalance!,
    createdAt: row.createdAt.toISOString(),
  }))));
});

router.get("/v1/admin/users/:userId/ledger", async (req, res): Promise<void> => {
  const params = GetAdminUserLedgerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid account identifier." });
    return;
  }
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, params.data.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Account not found." });
    return;
  }
  const entries = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, params.data.userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);
  res.json(GetAdminUserLedgerResponse.parse(entries.map(serializeLedgerEntry)));
});

router.post("/v1/admin/users/:userId/ledger", async (req, res): Promise<void> => {
  const params = AdjustAdminUserLedgerParams.safeParse(req.params);
  const parsed = AdjustAdminUserLedgerBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Enter a valid demo-wallet adjustment." });
    return;
  }
  const amount = Math.round(parsed.data.amount * 100) / 100;
  if (amount <= 0) {
    res.status(400).json({ error: "Adjustment must be at least one cent." });
    return;
  }
  const signedAmount = parsed.data.direction === "CREDIT" ? amount : -amount;
  const adminId = String(res.locals.userId);
  const result = await db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(walletsTable)
      .where(eq(walletsTable.userId, params.data.userId))
      .for("update")
      .limit(1);
    if (!wallet) return { error: "NOT_FOUND" as const };
    const nextBalance = Math.round((wallet.balance + signedAmount + Number.EPSILON) * 100) / 100;
    if (nextBalance < wallet.frozenBalance) return { error: "LOCKED_FUNDS" as const };
    const [updatedWallet] = await tx.update(walletsTable).set({
      balance: nextBalance,
      updatedAt: new Date(),
    }).where(eq(walletsTable.id, wallet.id)).returning();
    if (!updatedWallet) return { error: "NOT_FOUND" as const };
    const [entry] = await tx.insert(transactionsTable).values({
      userId: params.data.userId,
      type: parsed.data.direction === "CREDIT" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
      amount: signedAmount,
      status: "COMPLETED",
      reference: `admin:${adminId}:${parsed.data.reason.trim()}`.slice(0, 128),
    }).returning();
    if (!entry) throw new Error("Ledger entry could not be created.");
    return { wallet: updatedWallet, entry };
  });
  if ("error" in result) {
    if (result.error === "LOCKED_FUNDS") {
      res.status(409).json({ error: "The adjustment cannot reduce the balance below locked demo funds." });
      return;
    }
    res.status(404).json({ error: "Account or demo wallet not found." });
    return;
  }
  res.json(AdjustAdminUserLedgerResponse.parse({
    wallet: {
      currency: result.wallet.currency,
      balance: result.wallet.balance,
      frozenBalance: result.wallet.frozenBalance,
    },
    entry: serializeLedgerEntry(result.entry),
  }));
});

export default router;
