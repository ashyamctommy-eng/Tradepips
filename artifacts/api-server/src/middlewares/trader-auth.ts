import { sign, verify, type JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

function jwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function issueTraderToken(userId: string): string {
  return sign({ sub: userId }, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: "12h",
    issuer: "autopipsmarkets",
    audience: "autopipsmarkets-demo",
  });
}

export function requireTraderAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.header("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: "Sign in to your demo account to continue." });
    return;
  }
  try {
    const payload = verify(token, jwtSecret(), {
      algorithms: ["HS256"],
      issuer: "autopipsmarkets",
      audience: "autopipsmarkets-demo",
    }) as JwtPayload;
    if (typeof payload.sub !== "string") {
      res.status(401).json({ error: "This session is invalid. Please sign in again." });
      return;
    }
    res.locals.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "This session has expired. Please sign in again." });
  }
}
