import { Router } from "express";
import multer from "multer";
import { all, get, run, nid, now, hydrateProduct, loadOrder, type ProductRow } from "../db";
import { wrap, HttpError } from "../middleware";
import { requireAdmin, type AuthedRequest } from "../lib/auth";
import { putMedia } from "../lib/storage";
import { logger } from "../logger";
import { parseJson } from "../lib/money";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.use(requireAdmin);

function logAdmin(req: AuthedRequest, action: string, entity?: string, entityId?: string, meta?: unknown) {
  run(
    "INSERT INTO admin_logs (id, actorId, action, entity, entityId, meta, createdAt) VALUES (?,?,?,?,?,?,?)",
    [nid(), req.user?.id || null, action, entity || null, entityId || null, meta ? JSON.stringify(meta) : null, now()]
  );
  logger.admin(action, { actorId: req.user?.id, entity, entityId });
}

router.get(
  "/dashboard",
  wrap(async (_req, res) => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();
    const orderCount = get<{ n: number }>("SELECT COUNT(*) as n FROM orders")?.n || 0;
    const customerCount = get<{ n: number }>("SELECT COUNT(*) as n FROM users WHERE role = 'CUSTOMER'")?.n || 0;
    const productCount = get<{ n: number }>("SELECT COUNT(*) as n FROM products WHERE status = 'ACTIVE'")?.n || 0;
    const paidOrders = all<{ total: number; createdAt: string }>(
      "SELECT total, createdAt FROM orders WHERE paymentStatus = 'PAID' AND createdAt >= ?",
      [sinceIso]
    );
    const recentOrders = all(
      "SELECT id, orderNumber, customerName, total, status, paymentStatus, createdAt FROM orders ORDER BY createdAt DESC LIMIT 8"
    );
    const lowStock = all(
      `SELECT v.id, p.name AS product, p.slug, v.variantName AS variant, v.stockQuantity AS stock, v.reservedQuantity AS reserved
       FROM product_variants v JOIN products p ON p.id = v.productId
       WHERE v.status = 'ACTIVE' AND v.stockQuantity <= 5
       ORDER BY v.stockQuantity ASC LIMIT 10`
    );
    const statusGroups = all<{ status: string; n: number }>("SELECT status, COUNT(*) as n FROM orders GROUP BY status");
    const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const revenueByDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      revenueByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const o of paidOrders) {
      const key = o.createdAt.slice(0, 10);
      if (key in revenueByDay) revenueByDay[key] += o.total;
    }
    res.json({
      data: {
        orders: orderCount,
        customers: customerCount,
        products: productCount,
        revenue,
        recentOrders,
        lowStock,
        statusCounts: Object.fromEntries(statusGroups.map((g) => [g.status, g.n])),
        revenueByDay,
      },
    });
  })
);

router.get(
  "/products/:id",
  wrap(async (req, res) => {
    const row = get<ProductRow>("SELECT * FROM products WHERE id = ?", [String(req.params.id)]);
    if (!row) throw new HttpError(404, "Product not found.");
    res.json({ data: hydrateProduct(row) });
  })
);

router.get(
  "/products",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;
    const like = `%${q}%`;
    const where = q ? "WHERE name LIKE ? OR sku LIKE ? OR slug LIKE ?" : "";
    const params = q ? [like, like, like] : [];
    const total = get<{ n: number }>(`SELECT COUNT(*) as n FROM products ${where}`, params)?.n || 0;
    const rows = all<ProductRow>(
      `SELECT * FROM products ${where} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    res.json({
      data: rows.map((r) => hydrateProduct(r)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  })
);

router.post(
  "/products",
  wrap(async (req: AuthedRequest, res) => {
    const body = req.body || {};
    if (!body.name || !body.slug || !body.sku || !body.categoryId) {
      throw new HttpError(400, "Name, slug, SKU and category are required.");
    }
    const id = nid();
    const t = now();
    run(
      `INSERT INTO products (id, categoryId, name, slug, sku, description, price, compareAtPrice, status, featured, seoTitle, seoDescription, specifications, tags, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        body.categoryId,
        body.name,
        String(body.slug).toLowerCase(),
        body.sku,
        body.description || "",
        Number(body.price) || 0,
        body.compareAtPrice ? Number(body.compareAtPrice) : null,
        body.status || "ACTIVE",
        body.featured ? 1 : 0,
        body.seoTitle || body.name,
        body.seoDescription || "",
        typeof body.specifications === "string" ? body.specifications : JSON.stringify(body.specifications || {}),
        body.tags || "",
        t,
        t,
      ]
    );
    const variants = body.variants || [
      { variantName: "Default", sku: `${body.sku}-DEF`, stockQuantity: Number(body.stock) || 0, price: null },
    ];
    for (const v of variants) {
      run(
        "INSERT INTO product_variants (id, productId, sku, variantName, price, stockQuantity, reservedQuantity, attributes, status) VALUES (?,?,?,?,?,?,?,?,?)",
        [nid(), id, v.sku, v.variantName, v.price != null ? Number(v.price) : null, Number(v.stockQuantity) || 0, 0, JSON.stringify(v.attributes || {}), "ACTIVE"]
      );
    }
    logAdmin(req, "product.create", "product", id);
    res.status(201).json({ data: hydrateProduct(get<ProductRow>("SELECT * FROM products WHERE id = ?", [id])!) });
  })
);

router.patch(
  "/products/:id",
  wrap(async (req: AuthedRequest, res) => {
    const id = String(req.params.id);
    const existing = get<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
    if (!existing) throw new HttpError(404, "Product not found.");
    const body = req.body || {};
    run(
      `UPDATE products SET name=?, slug=?, sku=?, description=?, price=?, compareAtPrice=?, status=?, featured=?, seoTitle=?, seoDescription=?, specifications=?, tags=?, categoryId=?, updatedAt=? WHERE id=?`,
      [
        body.name ?? existing.name,
        body.slug ? String(body.slug).toLowerCase() : existing.slug,
        body.sku ?? existing.sku,
        body.description ?? existing.description,
        body.price != null ? Number(body.price) : existing.price,
        body.compareAtPrice === "" || body.compareAtPrice === null ? null : body.compareAtPrice != null ? Number(body.compareAtPrice) : existing.compareAtPrice,
        body.status ?? existing.status,
        body.featured != null ? (body.featured ? 1 : 0) : existing.featured,
        body.seoTitle ?? existing.seoTitle,
        body.seoDescription ?? existing.seoDescription,
        body.specifications != null ? (typeof body.specifications === "string" ? body.specifications : JSON.stringify(body.specifications)) : existing.specifications,
        body.tags ?? existing.tags,
        body.categoryId ?? existing.categoryId,
        now(),
        id,
      ]
    );
    if (Array.isArray(body.variants)) {
      for (const v of body.variants) {
        if (v.id) {
          run(
            "UPDATE product_variants SET variantName=?, sku=?, stockQuantity=?, price=?, status=? WHERE id=?",
            [v.variantName, v.sku, Number(v.stockQuantity), v.price != null && v.price !== "" ? Number(v.price) : null, v.status || "ACTIVE", v.id]
          );
        } else {
          run(
            "INSERT INTO product_variants (id, productId, sku, variantName, price, stockQuantity, reservedQuantity, status) VALUES (?,?,?,?,?,?,?,?)",
            [nid(), id, v.sku, v.variantName, v.price ? Number(v.price) : null, Number(v.stockQuantity) || 0, 0, "ACTIVE"]
          );
        }
      }
    }
    logAdmin(req, "product.update", "product", id);
    res.json({ data: hydrateProduct(get<ProductRow>("SELECT * FROM products WHERE id = ?", [id])!) });
  })
);

router.delete(
  "/products/:id",
  wrap(async (req: AuthedRequest, res) => {
    run("UPDATE products SET status = 'ARCHIVED', updatedAt = ? WHERE id = ?", [now(), String(req.params.id)]);
    logAdmin(req, "product.archive", "product", String(req.params.id));
    res.json({ data: { ok: true } });
  })
);

router.post(
  "/products/:id/media",
  upload.single("file"),
  wrap(async (req: AuthedRequest, res) => {
    const product = get<ProductRow>("SELECT * FROM products WHERE id = ?", [String(req.params.id)]);
    if (!product) throw new HttpError(404, "Product not found.");
    const file = req.file;
    if (!file) throw new HttpError(400, "Choose a file to upload.");
    const ext = (file.originalname.split(".").pop() || "jpg").toLowerCase();
    const mediaType = file.mimetype.startsWith("video") ? "VIDEO" : String(req.body.mediaType || "IMAGE").toUpperCase();
    const key = `products/${product.slug}/${Date.now()}.${ext}`;
    const stored = await putMedia(key, file.buffer, file.mimetype);
    const id = nid();
    run(
      "INSERT INTO product_media (id, productId, mediaType, r2Key, url, altText, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?,?)",
      [id, product.id, mediaType, stored.key, stored.url, req.body.altText || product.name, Number(req.body.sortOrder) || 0, now()]
    );
    logAdmin(req, "product.media", "product", product.id);
    res.status(201).json({ data: get("SELECT * FROM product_media WHERE id = ?", [id]) });
  })
);

router.get(
  "/categories",
  wrap(async (_req, res) => {
    const rows = all(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.categoryId = c.id) AS productCount
       FROM categories c ORDER BY sortOrder ASC`
    );
    res.json({ data: rows });
  })
);

router.post(
  "/categories",
  wrap(async (req: AuthedRequest, res) => {
    const { name, slug, description, imageUrl, status, sortOrder } = req.body || {};
    if (!name || !slug) throw new HttpError(400, "Name and slug are required.");
    const id = nid();
    const t = now();
    run(
      "INSERT INTO categories (id, name, slug, description, imageUrl, status, sortOrder, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, name, String(slug).toLowerCase(), description || "", imageUrl || "", status || "ACTIVE", Number(sortOrder) || 0, t, t]
    );
    logAdmin(req, "category.create", "category", id);
    res.status(201).json({ data: get("SELECT * FROM categories WHERE id = ?", [id]) });
  })
);

router.patch(
  "/categories/:id",
  wrap(async (req: AuthedRequest, res) => {
    const existing = get<Record<string, unknown>>("SELECT * FROM categories WHERE id = ?", [String(req.params.id)]);
    if (!existing) throw new HttpError(404, "Category not found.");
    run(
      "UPDATE categories SET name=?, slug=?, description=?, imageUrl=?, status=?, sortOrder=?, updatedAt=? WHERE id=?",
      [
        req.body.name ?? existing.name,
        req.body.slug ? String(req.body.slug).toLowerCase() : existing.slug,
        req.body.description ?? existing.description,
        req.body.imageUrl ?? existing.imageUrl,
        req.body.status ?? existing.status,
        req.body.sortOrder != null ? Number(req.body.sortOrder) : existing.sortOrder,
        now(),
        String(req.params.id),
      ]
    );
    logAdmin(req, "category.update", "category", String(req.params.id));
    res.json({ data: get("SELECT * FROM categories WHERE id = ?", [String(req.params.id)]) });
  })
);

router.get(
  "/orders/:id",
  wrap(async (req, res) => {
    const order = loadOrder(String(req.params.id));
    if (!order) throw new HttpError(404, "Order not found.");
    res.json({ data: { ...order, shippingAddress: parseJson(String(order.shippingAddress || "{}"), {}) } });
  })
);

router.get(
  "/orders",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;
    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (q) {
      where.push("(orderNumber LIKE ? OR email LIKE ? OR customerName LIKE ? OR mobile LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = get<{ n: number }>(`SELECT COUNT(*) as n FROM orders ${whereSql}`, params)?.n || 0;
    const rows = all(
      `SELECT * FROM orders ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    res.json({ data: rows, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  })
);

router.patch(
  "/orders/:id",
  wrap(async (req: AuthedRequest, res) => {
    const order = get<{ id: string; status: string }>("SELECT * FROM orders WHERE id = ?", [String(req.params.id)]);
    if (!order) throw new HttpError(404, "Order not found.");
    const status = req.body.status as string | undefined;
    const trackingNumber = req.body.trackingNumber as string | undefined;
    const carrier = req.body.carrier as string | undefined;
    const note = req.body.note as string | undefined;
    const t = now();
    if (status) run("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?", [status, t, order.id]);
    if (status && status !== order.status) {
      run(
        "INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, actorId, createdAt) VALUES (?,?,?,?,?,?,?)",
        [nid(), order.id, order.status, status, note || `Status updated to ${status}`, req.user?.id || null, t]
      );
    }
    if (trackingNumber || ["SHIPPED", "OUT_FOR_DELIVERY"].includes(status || "")) {
      const existing = get<{ id: string; trackingNumber: string | null; carrier: string | null; status: string }>(
        "SELECT * FROM shipments WHERE orderId = ?",
        [order.id]
      );
      if (existing) {
        run("UPDATE shipments SET trackingNumber=?, carrier=?, status=?, shippedAt=COALESCE(shippedAt, ?) WHERE id=?", [
          trackingNumber || existing.trackingNumber,
          carrier || existing.carrier,
          status || existing.status,
          t,
          existing.id,
        ]);
        run("INSERT INTO shipment_events (id, shipmentId, status, note, createdAt) VALUES (?,?,?,?,?)", [
          nid(),
          existing.id,
          status || "UPDATED",
          trackingNumber || note || null,
          t,
        ]);
      } else {
        const sid = nid();
        run(
          "INSERT INTO shipments (id, orderId, trackingNumber, carrier, status, shippedAt, createdAt) VALUES (?,?,?,?,?,?,?)",
          [sid, order.id, trackingNumber || `TRK${Date.now().toString().slice(-10)}`, carrier || "Delhivery", status || "SHIPPED", t, t]
        );
        run("INSERT INTO shipment_events (id, shipmentId, status, note, createdAt) VALUES (?,?,?,?,?)", [
          nid(),
          sid,
          status || "SHIPPED",
          "Shipment created",
          t,
        ]);
      }
    }
    logAdmin(req, "order.update", "order", order.id, { status, trackingNumber });
    const fresh = loadOrder(order.id)!;
    res.json({ data: { ...fresh, shippingAddress: parseJson(String(fresh.shippingAddress || "{}"), {}) } });
  })
);

router.get(
  "/customers",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 20;
    const where = q
      ? "WHERE u.role = 'CUSTOMER' AND (u.email LIKE ? OR IFNULL(p.fullName,'') LIKE ? OR IFNULL(p.mobile,'') LIKE ?)"
      : "WHERE u.role = 'CUSTOMER'";
    const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
    const total = get<{ n: number }>(
      `SELECT COUNT(*) as n FROM users u LEFT JOIN profiles p ON p.userId = u.id ${where}`,
      params
    )?.n || 0;
    const rows = all<Record<string, unknown>>(
      `SELECT u.id, u.email, u.status, u.createdAt, p.fullName, p.mobile,
              (SELECT COUNT(*) FROM orders o WHERE o.userId = u.id) AS orderCount
       FROM users u LEFT JOIN profiles p ON p.userId = u.id
       ${where}
       ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    res.json({ data: rows, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  })
);

router.patch(
  "/customers/:id",
  wrap(async (req: AuthedRequest, res) => {
    const status = String(req.body.status || "");
    if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new HttpError(400, "Invalid status.");
    run("UPDATE users SET status = ?, updatedAt = ? WHERE id = ?", [status, now(), String(req.params.id)]);
    logAdmin(req, "customer.status", "user", String(req.params.id), { status });
    res.json({ data: { id: String(req.params.id), status } });
  })
);

router.get(
  "/settings",
  wrap(async (_req, res) => {
    const rows = all<{ key: string; value: string }>("SELECT key, value FROM settings");
    res.json({ data: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  })
);

router.patch(
  "/settings",
  wrap(async (req: AuthedRequest, res) => {
    for (const [key, value] of Object.entries(req.body || {})) {
      const existing = get("SELECT key FROM settings WHERE key = ?", [key]);
      if (existing) run("UPDATE settings SET value = ? WHERE key = ?", [String(value), key]);
      else run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, String(value)]);
    }
    logAdmin(req, "settings.update", "settings");
    const rows = all<{ key: string; value: string }>("SELECT key, value FROM settings");
    res.json({ data: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  })
);

export default router;
