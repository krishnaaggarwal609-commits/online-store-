import { Router } from "express";
import { z } from "zod";
import { all, get, run, nid, now } from "../db";
import { wrap, HttpError } from "../middleware";
import { requireAuth, type AuthedRequest } from "../lib/auth";

const router = Router();

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  line1: z.string().min(4),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().regex(/^\d{6}$/),
  country: z.string().default("India"),
  isDefault: z.boolean().optional(),
});

router.patch(
  "/profile",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const fullName = String(req.body?.fullName || "").trim();
    const mobile = String(req.body?.mobile || "").trim();
    if (fullName.length < 2) throw new HttpError(400, "Enter your full name.");
    if (!/^[6-9]\d{9}$/.test(mobile)) throw new HttpError(400, "Enter a valid mobile number.");
    const existing = get<{ id: string }>("SELECT id FROM profiles WHERE userId = ?", [req.user!.id]);
    if (existing) run("UPDATE profiles SET fullName = ?, mobile = ? WHERE userId = ?", [fullName, mobile, req.user!.id]);
    else run("INSERT INTO profiles (id, userId, fullName, mobile) VALUES (?,?,?,?)", [nid(), req.user!.id, fullName, mobile]);
    const profile = get("SELECT * FROM profiles WHERE userId = ?", [req.user!.id]);
    res.json({ data: profile });
  })
);

router.get(
  "/addresses",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const addresses = all(
      "SELECT * FROM addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC",
      [req.user!.id]
    ).map((a: Record<string, unknown>) => ({ ...a, isDefault: Boolean(a.isDefault) }));
    res.json({ data: addresses });
  })
);

router.post(
  "/addresses",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Please check the address details.", parsed.error.flatten());
    if (parsed.data.isDefault) run("UPDATE addresses SET isDefault = 0 WHERE userId = ?", [req.user!.id]);
    const id = nid();
    const t = now();
    const d = parsed.data;
    run(
      `INSERT INTO addresses (id, userId, fullName, phone, line1, line2, city, state, pinCode, country, isDefault, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, req.user!.id, d.fullName, d.phone, d.line1, d.line2 || null, d.city, d.state, d.pinCode, d.country || "India", d.isDefault ? 1 : 0, t, t]
    );
    res.status(201).json({ data: get("SELECT * FROM addresses WHERE id = ?", [id]) });
  })
);

router.patch(
  "/addresses/:id",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const existing = get("SELECT * FROM addresses WHERE id = ? AND userId = ?", [String(req.params.id), req.user!.id]);
    if (!existing) throw new HttpError(404, "Address not found.");
    const parsed = addressSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Please check the address details.");
    if (parsed.data.isDefault) run("UPDATE addresses SET isDefault = 0 WHERE userId = ?", [req.user!.id]);
    const d = { ...(existing as Record<string, unknown>), ...parsed.data };
    run(
      `UPDATE addresses SET fullName=?, phone=?, line1=?, line2=?, city=?, state=?, pinCode=?, country=?, isDefault=?, updatedAt=? WHERE id=?`,
      [d.fullName, d.phone, d.line1, d.line2 || null, d.city, d.state, d.pinCode, d.country || "India", d.isDefault ? 1 : 0, now(), String(req.params.id)]
    );
    res.json({ data: get("SELECT * FROM addresses WHERE id = ?", [String(req.params.id)]) });
  })
);

router.delete(
  "/addresses/:id",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    run("DELETE FROM addresses WHERE id = ? AND userId = ?", [String(req.params.id), req.user!.id]);
    res.json({ data: { ok: true } });
  })
);

export default router;
