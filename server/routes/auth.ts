import { Router } from "express";
import { z } from "zod";
import { get, run, nid, now, type UserRow, userWithProfile } from "../db";
import { logger } from "../logger";
import {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  sha256,
  randomToken,
  type AuthedRequest,
} from "../lib/auth";
import { wrap, HttpError } from "../middleware";
import { mergeGuestCart } from "./cart";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2).max(80),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user: { id: string; email: string; role: string; fullName?: string | null; mobile?: string | null; profile?: { fullName?: string | null; mobile?: string | null } | null }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || user.profile?.fullName,
    mobile: user.mobile || user.profile?.mobile,
  };
}

router.post(
  "/register",
  wrap(async (req: AuthedRequest, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Please check the form and try again.", parsed.error.flatten());
    const { email, password, fullName, mobile } = parsed.data;
    const existing = get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing) throw new HttpError(409, "An account with this email already exists.");
    const id = nid();
    const t = now();
    run(
      "INSERT INTO users (id, email, passwordHash, role, status, emailVerified, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
      [id, email.toLowerCase(), await hashPassword(password), "CUSTOMER", "ACTIVE", process.env.DEMO_MODE === "true" ? 1 : 0, t, t]
    );
    run("INSERT INTO profiles (id, userId, fullName, mobile) VALUES (?,?,?,?)", [nid(), id, fullName, mobile]);
    const token = signToken({ id, email: email.toLowerCase(), role: "CUSTOMER" });
    setSessionCookie(res, token);
    await mergeGuestCart(req, res, id);
    logger.auth("register", { userId: id, email });
    res.status(201).json({ data: { id, email: email.toLowerCase(), role: "CUSTOMER", fullName, mobile } });
  })
);

router.post(
  "/login",
  wrap(async (req: AuthedRequest, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Enter a valid email and password.");
    const email = parsed.data.email.toLowerCase();
    const user = userWithProfile(get<UserRow>("SELECT * FROM users WHERE email = ?", [email]));
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      logger.auth("login failed", { email });
      throw new HttpError(401, "Invalid email or password.");
    }
    if (user.status === "SUSPENDED") throw new HttpError(403, "This account has been suspended.");
    const token = signToken(user);
    setSessionCookie(res, token);
    await mergeGuestCart(req, res, user.id);
    logger.auth("login", { userId: user.id });
    res.json({ data: publicUser(user) });
  })
);

router.post(
  "/logout",
  wrap(async (req: AuthedRequest, res) => {
    logger.auth("logout", { userId: req.user?.id });
    clearSessionCookie(res);
    res.json({ data: { ok: true } });
  })
);

router.get(
  "/me",
  wrap(async (req: AuthedRequest, res) => {
    if (!req.user) return res.json({ data: null });
    const user = userWithProfile(get<UserRow>("SELECT * FROM users WHERE id = ?", [req.user.id]));
    if (!user) return res.json({ data: null });
    res.json({
      data: {
        ...publicUser(user),
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  })
);

router.post(
  "/forgot-password",
  wrap(async (req, res) => {
    const email = String(req.body?.email || "").toLowerCase();
    const user = get<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
    let demoLink: string | undefined;
    if (user) {
      const token = randomToken();
      run(
        "INSERT INTO password_resets (id, userId, tokenHash, expiresAt, createdAt) VALUES (?,?,?,?,?)",
        [nid(), user.id, sha256(token), new Date(Date.now() + 60 * 60 * 1000).toISOString(), now()]
      );
      demoLink = `/reset-password?token=${token}`;
      logger.auth("password reset requested", { userId: user.id, demoLink });
    }
    res.json({
      data: {
        ok: true,
        message: "If an account exists, a reset link has been generated.",
        ...(process.env.DEMO_MODE === "true" && demoLink ? { demoLink } : {}),
      },
    });
  })
);

router.post(
  "/reset-password",
  wrap(async (req, res) => {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    const row = get<{ id: string; userId: string; usedAt: string | null; expiresAt: string }>(
      "SELECT * FROM password_resets WHERE tokenHash = ?",
      [sha256(token)]
    );
    if (!row || row.usedAt || row.expiresAt < now()) {
      throw new HttpError(400, "This reset link is invalid or has expired.");
    }
    run("UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?", [await hashPassword(password), now(), row.userId]);
    run("UPDATE password_resets SET usedAt = ? WHERE id = ?", [now(), row.id]);
    logger.auth("password reset completed", { userId: row.userId });
    res.json({ data: { ok: true } });
  })
);

router.post(
  "/change-password",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const current = String(req.body?.currentPassword || "");
    const next = String(req.body?.newPassword || "");
    if (next.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    const user = get<UserRow>("SELECT * FROM users WHERE id = ?", [req.user!.id]);
    if (!user || !(await verifyPassword(current, user.passwordHash))) {
      throw new HttpError(400, "Current password is incorrect.");
    }
    run("UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?", [await hashPassword(next), now(), user.id]);
    logger.auth("password changed", { userId: user.id });
    res.json({ data: { ok: true } });
  })
);

export default router;
