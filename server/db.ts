import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "aarohi.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(process.cwd(), "server", "schema.sql"), "utf8");
db.exec(schema);

export function nid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}

export function now() {
  return new Date().toISOString();
}

export function bool(v: unknown) {
  return v === 1 || v === true;
}

type Params = unknown[];

export function get<T>(sql: string, params: Params = []) {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(sql: string, params: Params = []) {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, params: Params = []) {
  return db.prepare(sql).run(...params);
}

export function tx<T>(fn: () => T) {
  return db.transaction(fn)();
}

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  emailVerified: number;
  createdAt: string;
  updatedAt: string;
  fullName?: string | null;
  mobile?: string | null;
};

export type ProductRow = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  featured: number;
  seoTitle: string | null;
  seoDescription: string | null;
  specifications: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categorySlug?: string;
};

export type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  price: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  attributes: string | null;
  status: string;
};

export type MediaRow = {
  id: string;
  productId: string;
  mediaType: string;
  r2Key: string;
  url: string;
  sortOrder: number;
  altText: string | null;
};

export function userWithProfile(user: UserRow | undefined) {
  if (!user) return undefined;
  const profile = get<{ fullName: string | null; mobile: string | null }>(
    "SELECT fullName, mobile FROM profiles WHERE userId = ?",
    [user.id]
  );
  return { ...user, emailVerified: bool(user.emailVerified), profile, fullName: profile?.fullName, mobile: profile?.mobile };
}

export function hydrateProduct(p: ProductRow) {
  const category = get<{ id: string; name: string; slug: string }>(
    "SELECT id, name, slug FROM categories WHERE id = ?",
    [p.categoryId]
  ) || { id: p.categoryId, name: p.categoryName || "", slug: p.categorySlug || "" };
  const variants = all<VariantRow>(
    "SELECT * FROM product_variants WHERE productId = ?",
    [p.id]
  );
  const media = all<MediaRow>(
    "SELECT * FROM product_media WHERE productId = ? ORDER BY sortOrder ASC",
    [p.id]
  );
  return {
    ...p,
    featured: bool(p.featured),
    compareAtPrice: p.compareAtPrice,
    category,
    variants,
    media,
  };
}

export function loadOrder(idOrNumber: string) {
  const order = get<Record<string, unknown>>(
    "SELECT * FROM orders WHERE id = ? OR orderNumber = ?",
    [idOrNumber, idOrNumber]
  );
  if (!order) return undefined;
  const items = all<Record<string, unknown>>(
    `SELECT oi.*, p.slug,
            (SELECT url FROM product_media pm WHERE pm.productId = oi.productId ORDER BY sortOrder LIMIT 1) AS image
     FROM order_items oi
     JOIN products p ON p.id = oi.productId
     WHERE oi.orderId = ?`,
    [order.id]
  );
  const shipments = all("SELECT * FROM shipments WHERE orderId = ?", [order.id]);
  const statusHistory = all("SELECT * FROM order_status_history WHERE orderId = ? ORDER BY createdAt ASC", [order.id]);
  const payments = all("SELECT * FROM payments WHERE orderId = ?", [order.id]);
  return { ...order, items, shipments, statusHistory, payments };
}
