import { Router } from "express";
import { z } from "zod";
import { all, get, run, tx, nid, now } from "../db";
import { wrap, HttpError } from "../middleware";
import { type AuthedRequest, ensureGuestId } from "../lib/auth";
import { availableStock, reserveStock } from "../lib/inventory";
import { shippingFor } from "../lib/money";
import { logger } from "../logger";

const router = Router();

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().min(4),
  line2: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().default("India"),
});

const checkoutSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  address: addressSchema,
  couponCode: z.string().optional().nullable(),
  saveAddress: z.boolean().optional(),
});

function nextOrderNumber() {
  const year = new Date().getFullYear();
  const name = `order-${year}`;
  const existing = get<{ value: number }>("SELECT value FROM counters WHERE name = ?", [name]);
  let value = 1;
  if (!existing) run("INSERT INTO counters (name, value) VALUES (?, 1)", [name]);
  else {
    value = existing.value + 1;
    run("UPDATE counters SET value = ? WHERE name = ?", [value, name]);
  }
  return `ORD-${year}-${String(value).padStart(6, "0")}`;
}

export function applyCoupon(
  coupon: { type: string; value: number; minOrder: number; maxDiscount: number | null; status: string; expiresAt: string | null; usageLimit: number | null; usedCount: number },
  subtotal: number
) {
  if (coupon.status !== "ACTIVE") throw new HttpError(400, "This coupon is not active.");
  if (coupon.expiresAt && coupon.expiresAt < now()) throw new HttpError(400, "This coupon has expired.");
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new HttpError(400, "This coupon is no longer available.");
  }
  if (subtotal < coupon.minOrder) {
    throw new HttpError(400, `This coupon requires a minimum order of ₹${coupon.minOrder}.`);
  }
  let discount = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, subtotal));
}

router.post(
  "/",
  wrap(async (req: AuthedRequest, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Please complete all checkout fields.", parsed.error.flatten());
    const guestId = ensureGuestId(req, res);

    const cart = req.user
      ? get<{ id: string }>("SELECT id FROM carts WHERE userId = ? AND status = 'ACTIVE'", [req.user.id])
      : get<{ id: string }>("SELECT id FROM carts WHERE guestId = ? AND status = 'ACTIVE'", [guestId]);
    if (!cart) throw new HttpError(400, "Your cart is empty.");
    const items = all<{
      productId: string;
      variantId: string;
      quantity: number;
      name: string;
      variantName: string;
      sku: string;
      productStatus: string;
      variantStatus: string;
      productPrice: number;
      variantPrice: number | null;
      stockQuantity: number;
      reservedQuantity: number;
    }>(
      `SELECT ci.productId, ci.variantId, ci.quantity, p.name, p.status AS productStatus, p.price AS productPrice,
              v.variantName, v.sku, v.status AS variantStatus, v.price AS variantPrice, v.stockQuantity, v.reservedQuantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.productId
       JOIN product_variants v ON v.id = ci.variantId
       WHERE ci.cartId = ?`,
      [cart.id]
    );
    if (items.length === 0) throw new HttpError(400, "Your cart is empty.");

    const priced = items.map((item) => {
      const price = item.variantPrice ?? item.productPrice;
      const available = availableStock(item.stockQuantity, item.reservedQuantity);
      if (item.productStatus !== "ACTIVE" || item.variantStatus !== "ACTIVE") {
        throw new HttpError(409, `${item.name} is no longer available.`);
      }
      if (available < item.quantity) {
        throw new HttpError(409, `${item.name} does not have enough stock.`);
      }
      return { item, price, total: price * item.quantity };
    });

    const subtotal = priced.reduce((s, p) => s + p.total, 0);
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: string | null = null;
    if (parsed.data.couponCode) {
      const coupon = get<{
        id: string;
        code: string;
        type: string;
        value: number;
        minOrder: number;
        maxDiscount: number | null;
        status: string;
        expiresAt: string | null;
        usageLimit: number | null;
        usedCount: number;
      }>("SELECT * FROM coupons WHERE code = ?", [parsed.data.couponCode.trim().toUpperCase()]);
      if (!coupon) throw new HttpError(400, "Invalid coupon code.");
      discount = applyCoupon(coupon, subtotal);
      couponCode = coupon.code;
      couponId = coupon.id;
    }
    const shippingFee = shippingFor(subtotal - discount);
    const total = Math.max(0, subtotal + shippingFee - discount);
    const orderId = nid();
    const t = now();
    const orderNumber = tx(() => nextOrderNumber());

    tx(() => {
      run(
        `INSERT INTO orders (id, orderNumber, userId, email, mobile, customerName, status, paymentStatus, subtotal, shippingFee, discount, total, couponCode, shippingAddress, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          orderNumber,
          req.user?.id || null,
          parsed.data.email.toLowerCase(),
          parsed.data.mobile,
          parsed.data.name,
          "PENDING",
          "PENDING",
          subtotal,
          shippingFee,
          discount,
          total,
          couponCode,
          JSON.stringify(parsed.data.address),
          t,
          t,
        ]
      );
      for (const p of priced) {
        run(
          `INSERT INTO order_items (id, orderId, productId, variantId, name, variantName, sku, price, quantity, total)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [nid(), orderId, p.item.productId, p.item.variantId, p.item.name, p.item.variantName, p.item.sku, p.price, p.item.quantity, p.total]
        );
      }
      run(
        "INSERT INTO order_status_history (id, orderId, toStatus, note, createdAt) VALUES (?,?,?,?,?)",
        [nid(), orderId, "PENDING", "Order created, awaiting payment", t]
      );
      if (couponId) {
        run("UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?", [couponId]);
        run(
          "INSERT INTO coupon_usages (id, couponId, userId, orderId, createdAt) VALUES (?,?,?,?,?)",
          [nid(), couponId, req.user?.id || null, orderId, t]
        );
      }
      run("UPDATE carts SET status = 'CHECKED_OUT', updatedAt = ? WHERE id = ?", [t, cart.id]);
    });

    const orderItems = all<{ variantId: string; quantity: number }>("SELECT variantId, quantity FROM order_items WHERE orderId = ?", [orderId]);
    for (const item of orderItems) {
      await reserveStock(item.variantId, item.quantity, orderId);
    }

    if (req.user && parsed.data.saveAddress) {
      run("UPDATE addresses SET isDefault = 0 WHERE userId = ?", [req.user.id]);
      const a = parsed.data.address;
      run(
        `INSERT INTO addresses (id, userId, fullName, phone, line1, line2, city, state, pinCode, country, isDefault, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [nid(), req.user.id, a.fullName, a.phone, a.line1, a.line2 || null, a.city, a.state, a.pinCode, a.country || "India", 1, t, t]
      );
    }

    logger.order("created", { orderId, orderNumber, total });
    res.status(201).json({ data: { id: orderId, orderNumber, total } });
  })
);

export default router;
