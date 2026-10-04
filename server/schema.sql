PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  emailVerified INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fullName TEXT,
  mobile TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokenHash TEXT UNIQUE NOT NULL,
  expiresAt TEXT NOT NULL,
  usedAt TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pinCode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  isDefault INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  imageUrl TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  categoryId TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL,
  compareAtPrice INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  featured INTEGER NOT NULL DEFAULT 0,
  seoTitle TEXT,
  seoDescription TEXT,
  specifications TEXT,
  tags TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  variantName TEXT NOT NULL,
  price INTEGER,
  stockQuantity INTEGER NOT NULL DEFAULT 0,
  reservedQuantity INTEGER NOT NULL DEFAULT 0,
  attributes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(productId);

CREATE TABLE IF NOT EXISTS product_media (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  mediaType TEXT NOT NULL DEFAULT 'IMAGE',
  r2Key TEXT NOT NULL,
  url TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  altText TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id) ON DELETE CASCADE,
  guestId TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cartId TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES products(id),
  variantId TEXT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(cartId, variantId)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cartId);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  orderNumber TEXT UNIQUE NOT NULL,
  userId TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  customerName TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  paymentStatus TEXT NOT NULL DEFAULT 'PENDING',
  subtotal INTEGER NOT NULL,
  shippingFee INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  couponCode TEXT,
  shippingAddress TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(createdAt);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES products(id),
  variantId TEXT NOT NULL REFERENCES product_variants(id),
  name TEXT NOT NULL,
  variantName TEXT NOT NULL,
  sku TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(orderId);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fromStatus TEXT,
  toStatus TEXT NOT NULL,
  note TEXT,
  actorId TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'CASHFREE',
  providerOrderId TEXT,
  providerPaymentId TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING',
  rawPayload TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  paymentId TEXT REFERENCES payments(id),
  eventId TEXT UNIQUE NOT NULL,
  eventType TEXT NOT NULL,
  payload TEXT NOT NULL,
  processedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  variantId TEXT NOT NULL REFERENCES product_variants(id),
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  orderId TEXT,
  actorId TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  trackingNumber TEXT,
  carrier TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  shippedAt TEXT,
  deliveredAt TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id TEXT PRIMARY KEY,
  shipmentId TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  minOrder INTEGER NOT NULL DEFAULT 0,
  maxDiscount INTEGER,
  expiresAt TEXT,
  usageLimit INTEGER,
  usedCount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  couponId TEXT NOT NULL REFERENCES coupons(id),
  userId TEXT REFERENCES users(id),
  orderId TEXT NOT NULL REFERENCES orders(id),
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  actorId TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entityId TEXT,
  meta TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
