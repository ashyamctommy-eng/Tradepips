import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import {
  GetTraderProfileResponse,
  LoginTraderBody,
  LoginTraderResponse,
  RegisterTraderBody,
  RegisterTraderResponse,
} from "@workspace/api-zod";
import { db, usersTable, walletsTable } from "@workspace/db";
import { requireTraderAuth, issueTraderToken } from "../middlewares/trader-auth";

const router: IRouter = Router();

function toUserResponse(user: { id: string; email: string; createdAt: Date }) {
  return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
}

router.post("/v1/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterTraderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email and password." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hash(parsed.data.password, 12);
  try {
    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(usersTable)
        .values({ email, passwordHash })
        .returning();
      if (!created) throw new Error("Account could not be created.");
      await tx.insert(walletsTable).values({
        userId: created.id,
        currency: "USD",
        balance: 10000,
        frozenBalance: 0,
      });
      return created;
    });

    res.status(201).json(
      RegisterTraderResponse.parse({
        token: issueTraderToken(user.id),
        user: toUserResponse(user),
      }),
    );
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
    if (code === "23505") {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    throw error;
  }
});

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginTraderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  res.json(
    LoginTraderResponse.parse({
      token: issueTraderToken(user.id),
      user: toUserResponse(user),
    }),
  );
});

router.get("/v1/auth/me", requireTraderAuth, async (_req, res): Promise<void> => {
  const userId = String(res.locals.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [wallet] = await db
    .select()
    .from(walletsTable)
    .where(and(eq(walletsTable.userId, userId), eq(walletsTable.currency, "USD")))
    .limit(1);
  if (!user || !wallet) {
    res.status(404).json({ error: "Demo account not found." });
    return;
  }
  res.json(
    GetTraderProfileResponse.parse({
      user: toUserResponse(user),
      wallet: {
        currency: wallet.currency,
        balance: wallet.balance,
        frozenBalance: wallet.frozenBalance,
      },
    }),
  );
});

export default router;
