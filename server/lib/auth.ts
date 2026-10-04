import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { get, type UserRow, userWithProfile } from "../db";

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-only";
const COOKIE_NAME = "aarohi_session";
const GUEST_COOKIE = "aarohi_guest";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  fullName?: string | null;
};

export type AuthedRequest = Request & {
  user?: AuthUser | null;
  guestId?: string;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, SESSION_SECRET, {
    expiresIn: "7d",
  });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function ensureGuestId(req: AuthedRequest, res: Response) {
  if (req.guestId) return req.guestId;
  let guestId = req.cookies?.[GUEST_COOKIE] as string | undefined;
  if (!guestId) {
    guestId = crypto.randomUUID();
    res.cookie(GUEST_COOKIE, guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    req.cookies = { ...(req.cookies || {}), [GUEST_COOKIE]: guestId };
  }
  req.guestId = guestId;
  return guestId;
}

export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || req.cookies?.[COOKIE_NAME];
    if (!token) {
      req.user = null;
      return next();
    }
    const payload = jwt.verify(token, SESSION_SECRET) as { sub: string };
    const user = userWithProfile(get<UserRow>("SELECT * FROM users WHERE id = ?", [payload.sub]));
    if (!user || user.status === "SUSPENDED") {
      req.user = null;
      return next();
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      fullName: user.fullName,
    };
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}
