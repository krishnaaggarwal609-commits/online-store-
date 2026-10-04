import { Router } from "express";
import { z } from "zod";
import { all, get, run, nid, now } from "../db";
import { wrap, HttpError } from "../middleware";
import { ensureGuestId, type AuthedRequest } from "../lib/auth";
import { availableStock } from "../lib/inventory";
import { shippingFor } from "../lib/money";

const router = Router();

type CartRow = { id: string; userId: string | null; guestId: string | null; status: string };

function getOrCreateCart(req: AuthedRequest, res: Parameters<typeof ensureGuestId>[1]) {
  const guestId = ensureGuestId(req, res);
  if (req.user) {
    let cart = get<CartRow>("SELECT * FROM carts WHERE userId = ? AND status = 'ACTIVE'", [req.user.id]);
    if (!cart) {
      const id = nid();
      const t = now();
      run("INSERT INTO carts (id, userId, status, createdAt, updatedAt) VALUES (?,?,?,?,?)", [id, req.user.id, "ACTIVE", t, t]);
      cart = get<CartRow>("SELECT * FROM carts WHERE id = ?", [id]);
    }
    return cart!;
  }
  let cart = get<CartRow>("SELECT * FROM carts WHERE guestId = ? AND status = 'ACTIVE'", [guestId]);
  if (!cart) {
    const id = nid();
    const t = now();
    run("INSERT INTO carts (id, guestId, status, createdAt, updatedAt) VALUES (?,?,?,?,?)", [id, guestId, "ACTIVE", t, t]);
    cart = get<CartRow>("SELECT * FROM carts WHERE id = ?", [id]);
  }
  return cart!;
}

type CartItemLoaded = {
  id: string;
  quantity: number;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  productPrice: number;
  compareAtPrice: number | null;
  image: string | null;
  alt: string | null;
  variantName: string;
  sku: string;
  variantPrice: number | null;
  stockQuantity: number;
  reservedQuantity: number;
};

function loadItems(cartId: string) {
  return all<CartItemLoaded>(
    `SELECT ci.id, ci.quantity, ci.productId, ci.variantId,
            p.name, p.slug, p.price AS productPrice, p.compareAtPrice,
            (SELECT url FROM product_media m WHERE m.productId = p.id ORDER BY sortOrder LIMIT 1) AS image,
            (SELECT altText FROM product_media m WHERE m.productId = p.id ORDER BY sortOrder LIMIT 1) AS alt,
            v.variantName, v.sku, v.price AS variantPrice, v.stockQuantity, v.reservedQuantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.productId
     JOIN product_variants v ON v.id = ci.variantId
     WHERE ci.cartId = ?
     ORDER BY ci.createdAt ASC`,
    [cartId]
  );
}

export function cartSummary(cart: { id: string; items: CartItemLoaded[] }) {
  const items = cart.items.map((item) => {
    const unit = item.variantPrice ?? item.productPrice;
    const available = availableStock(item.stockQuantity, item.reservedQuantity);
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      slug: item.slug,
      variantName: item.variantName,
      sku: item.sku,
      price: unit,
      compareAtPrice: item.compareAtPrice,
      quantity: item.quantity,
      total: unit * item.quantity,
      available,
      image: item.image || "/media/placeholder.svg",
      alt: item.alt || item.name,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const shipping = shippingFor(subtotal);
  return {
    id: cart.id,
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    shipping,
    discount: 0,
    total: subtotal + shipping,
  };
}

function loadCart(req: AuthedRequest, res: Parameters<typeof ensureGuestId>[1]) {
  const cart = getOrCreateCart(req, res);
  return { ...cart, items: loadItems(cart.id) };
}

export async function mergeGuestCart(req: AuthedRequest, res: Parameters<typeof ensureGuestId>[1], userId: string) {
  const guestId = req.cookies?.aarohi_guest as string | undefined;
  if (!guestId) return;
  const guestCart = get<CartRow>("SELECT * FROM carts WHERE guestId = ? AND status = 'ACTIVE'", [guestId]);
  if (!guestCart) return;
  const guestItems = all<{ productId: string; variantId: string; quantity: number }>(
    "SELECT productId, variantId, quantity FROM cart_items WHERE cartId = ?",
    [guestCart.id]
  );
  if (guestItems.length === 0) return;
  let userCart = get<CartRow>("SELECT * FROM carts WHERE userId = ? AND status = 'ACTIVE'", [userId]);
  if (!userCart) {
    const id = nid();
    const t = now();
    run("INSERT INTO carts (id, userId, status, createdAt, updatedAt) VALUES (?,?,?,?,?)", [id, userId, "ACTIVE", t, t]);
    userCart = get<CartRow>("SELECT * FROM carts WHERE id = ?", [id]);
  }
  for (const item of guestItems) {
    const existing = get<{ id: string; quantity: number }>(
      "SELECT id, quantity FROM cart_items WHERE cartId = ? AND variantId = ?",
      [userCart!.id, item.variantId]
    );
    const t = now();
    if (existing) {
      run("UPDATE cart_items SET quantity = ?, updatedAt = ? WHERE id = ?", [existing.quantity + item.quantity, t, existing.id]);
    } else {
      run(
        "INSERT INTO cart_items (id, cartId, productId, variantId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)",
        [nid(), userCart!.id, item.productId, item.variantId, item.quantity, t, t]
      );
    }
  }
  run("UPDATE carts SET status = 'MERGED', updatedAt = ? WHERE id = ?", [now(), guestCart.id]);
}

const addSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string(),
  quantity: z.number().int().min(1).max(20).default(1),
});

router.get(
  "/",
  wrap(async (req: AuthedRequest, res) => {
    res.json({ data: cartSummary(loadCart(req, res)) });
  })
);

router.post(
  "/items",
  wrap(async (req: AuthedRequest, res) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Select a product variant.");
    const variant = get<{
      id: string;
      productId: string;
      status: string;
      stockQuantity: number;
      reservedQuantity: number;
      productStatus: string;
    }>(
      `SELECT v.*, p.status AS productStatus FROM product_variants v JOIN products p ON p.id = v.productId WHERE v.id = ?`,
      [parsed.data.variantId]
    );
    if (!variant || variant.status !== "ACTIVE" || variant.productStatus !== "ACTIVE") {
      throw new HttpError(404, "This product is no longer available.");
    }
    const available = availableStock(variant.stockQuantity, variant.reservedQuantity);
    if (available <= 0) throw new HttpError(409, "This product is currently out of stock.");
    const cart = getOrCreateCart(req, res);
    const existing = get<{ id: string; quantity: number }>(
      "SELECT id, quantity FROM cart_items WHERE cartId = ? AND variantId = ?",
      [cart.id, variant.id]
    );
    const nextQty = (existing?.quantity || 0) + parsed.data.quantity;
    if (nextQty > available) throw new HttpError(409, `Only ${available} left in stock.`);
    const t = now();
    if (existing) {
      run("UPDATE cart_items SET quantity = ?, updatedAt = ? WHERE id = ?", [nextQty, t, existing.id]);
    } else {
      run(
        "INSERT INTO cart_items (id, cartId, productId, variantId, quantity, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)",
        [nid(), cart.id, variant.productId, variant.id, parsed.data.quantity, t, t]
      );
    }
    res.status(201).json({ data: cartSummary(loadCart(req, res)) });
  })
);

router.patch(
  "/items/:id",
  wrap(async (req: AuthedRequest, res) => {
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
      throw new HttpError(400, "Enter a valid quantity.");
    }
    const cart = getOrCreateCart(req, res);
    const item = get<{ id: string; stockQuantity: number; reservedQuantity: number }>(
      `SELECT ci.id, v.stockQuantity, v.reservedQuantity
       FROM cart_items ci JOIN product_variants v ON v.id = ci.variantId
       WHERE ci.id = ? AND ci.cartId = ?`,
      [String(req.params.id), cart.id]
    );
    if (!item) throw new HttpError(404, "Cart item not found.");
    if (quantity === 0) {
      run("DELETE FROM cart_items WHERE id = ?", [item.id]);
    } else {
      const available = availableStock(item.stockQuantity, item.reservedQuantity);
      if (quantity > available) throw new HttpError(409, `Only ${available} left in stock.`);
      run("UPDATE cart_items SET quantity = ?, updatedAt = ? WHERE id = ?", [quantity, now(), item.id]);
    }
    res.json({ data: cartSummary(loadCart(req, res)) });
  })
);

router.delete(
  "/items/:id",
  wrap(async (req: AuthedRequest, res) => {
    const cart = getOrCreateCart(req, res);
    run("DELETE FROM cart_items WHERE id = ? AND cartId = ?", [String(req.params.id), cart.id]);
    res.json({ data: cartSummary(loadCart(req, res)) });
  })
);

export default router;
