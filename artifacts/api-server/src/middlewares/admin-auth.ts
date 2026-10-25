import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";

export async function requireAdminAuth(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = res.locals.userId;
  if (typeof userId !== "string") {
    res.status(401).json({ error: "Sign in to an administrator account to continue." });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Administrator access is required." });
    return;
  }

  res.locals.adminEmail = user.email;
  next();
}
