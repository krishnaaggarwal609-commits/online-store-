import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, run, nid, now, get } from "../server/db";

type SeedProduct = {
  name: string;
  slug: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  featured?: boolean;
  description: string;
  tags: string;
  specs: Record<string, string>;
  variants?: { name: string; sku: string; stock: number; price?: number; attrs?: Record<string, string> }[];
  stock?: number;
};

const categories = [
  { name: "Bags & Leather", slug: "bags-leather", description: "Totes, backpacks and weekenders in full-grain leather and technical canvas.", sortOrder: 1 },
  { name: "Audio", slug: "audio", description: "Headphones, earphones and speakers tuned for everyday listening.", sortOrder: 2 },
  { name: "Timepieces", slug: "timepieces", description: "Automatic and quartz watches with considered details.", sortOrder: 3 },
  { name: "Home", slug: "home", description: "Textiles, ceramics and lighting for slower rooms.", sortOrder: 4 },
  { name: "Apparel", slug: "apparel", description: "Layering pieces in merino, linen and organic cotton.", sortOrder: 5 },
  { name: "Wellness", slug: "wellness", description: "Daily rituals — copper, cork, candlelight.", sortOrder: 6 },
];

const catalog: Record<string, SeedProduct[]> = {
  "bags-leather": [
    { name: "Heritage Leather Tote", slug: "heritage-leather-tote", sku: "BAG-TOTE-001", price: 8499, compareAtPrice: 9999, featured: true, tags: "leather,tote,work,women,men", description: "A structured tote in vegetable-tanned full-grain leather that softens with every commute. Dual rolled handles, a zip-top closure and a padded laptop sleeve keep the day organised without looking like luggage. Made in small batches in Kanpur.", specs: { Material: "Full-grain leather", Dimensions: "38 × 30 × 14 cm", Laptop: "Fits 14-inch", Origin: "Kanpur, India" }, stock: 18 },
    { name: "Urban Commute Backpack", slug: "urban-commute-backpack", sku: "BAG-BP-002", price: 4299, compareAtPrice: 5499, featured: true, tags: "backpack,commute,tech,travel", description: "A weather-ready backpack with a clamshell opening, hidden passport pocket and a 16-inch padded sleeve. The outer shell is recycled nylon; the lining is a quiet charcoal twill.", specs: { Material: "Recycled nylon", Capacity: "22 L", Laptop: "Fits 16-inch", Weight: "890 g" }, stock: 24 },
    { name: "Deccan Sling", slug: "deccan-sling", sku: "BAG-SLING-003", price: 2799, tags: "sling,canvas,everyday", description: "A compact olive canvas sling with a quick-access phone pocket and a leather strap that sits flat against the body. Sized for keys, a paperback and the day.", specs: { Material: "Waxed canvas + leather", Dimensions: "24 × 16 × 8 cm", Strap: "Adjustable" }, stock: 30 },
    { name: "Weekender Duffel", slug: "weekender-duffel", sku: "BAG-DFL-004", price: 6999, compareAtPrice: 8499, featured: true, tags: "travel,duffel,leather,weekend", description: "The two-night bag. Saddle-brown leather, a wide mouth, shoe compartment and a shoulder strap that actually stays on. Designed to look as good in a train berth as it does in a hotel lobby.", specs: { Material: "Saddle leather", Capacity: "40 L", Carry: "Handles + strap", Origin: "Chennai" }, stock: 12 },
  ],
  audio: [
    { name: "Aether Wireless Headphones", slug: "aether-wireless-headphones", sku: "AUD-HD-101", price: 12999, compareAtPrice: 15999, featured: true, tags: "headphones,wireless,anc,audio", description: "Over-ear wireless headphones with hybrid active noise cancellation, 40 mm drivers and 32 hours of listening. The headband is wrapped in lambskin; the cups in a matte black polymer that does not shout.", specs: { Drivers: "40 mm", ANC: "Hybrid", Battery: "32 hours", Connectivity: "Bluetooth 5.3" }, stock: 20 },
    { name: "Mini Pods Pro", slug: "mini-pods-pro", sku: "AUD-EB-102", price: 7499, compareAtPrice: 8999, featured: true, tags: "earbuds,wireless,anc", description: "Compact true-wireless earbuds with transparency mode, IPX4 and a case that charges twice over. Tuned slightly warm, for voices and city playlists.", specs: { Form: "In-ear", Water: "IPX4", Battery: "6 + 24 hours", Charging: "USB-C + wireless" }, stock: 40 },
    { name: "Desk Speaker Duo", slug: "desk-speaker-duo", sku: "AUD-SP-103", price: 5999, tags: "speakers,bluetooth,desk,walnut", description: "A pair of compact walnut-veneer speakers for the desk. Bluetooth 5.1, a 3.5 mm input, and enough low end for afternoon playlists without rattling the shelves.", specs: { Drivers: "2 × 2.5 inch", Input: "Bluetooth + AUX", Finish: "Walnut veneer", Power: "30 W" }, stock: 16 },
    { name: "Studio Monitor Earphones", slug: "studio-monitor-earphones", sku: "AUD-IE-104", price: 3499, tags: "earphones,wired,studio", description: "Wired in-ear monitors with a relatively flat response — for mixing on the metro, or just hearing what is actually in the track. Detachable cable, three ear-tip sizes.", specs: { Drivers: "Dual BA", Cable: "Detachable MMCX", Impedance: "16 Ω", Include: "3 tip sizes" }, stock: 28 },
  ],
  timepieces: [
    { name: "Chronos Automatic", slug: "chronos-automatic", sku: "WAT-CH-201", price: 18999, compareAtPrice: 22999, featured: true, tags: "watch,automatic,mechanical", description: "A 40 mm automatic with a sapphire crystal, exhibition caseback and a Miyota 9015 beating at 28,800 bph. The dial is a deep sunburst black; the indices are applied. 50 metres water resistance.", specs: { Movement: "Miyota 9015", Case: "40 mm stainless", Crystal: "Sapphire", Water: "50 m" }, stock: 10 },
    { name: "Midnight Mesh Watch", slug: "midnight-mesh-watch", sku: "WAT-MS-202", price: 9499, featured: true, tags: "watch,quartz,mesh,everyday", description: "A slim quartz watch on a milanaise mesh bracelet. 36 mm case, sunray midnight dial, and a clasp that micro-adjusts. Quiet enough for the office, finished enough for dinner.", specs: { Movement: "Japanese quartz", Case: "36 mm", Bracelet: "Steel mesh", Water: "30 m" }, stock: 22 },
    { name: "Field Watch Olive", slug: "field-watch-olive", sku: "WAT-FD-203", price: 7299, tags: "watch,field,olive,canvas", description: "A 38 mm field watch with a matte olive dial, cathedral hands and a canvas strap. Built to be worn, scratched and kept. 100 metres water resistance, screw-down crown.", specs: { Movement: "Quartz", Case: "38 mm", Strap: "Olive canvas", Water: "100 m" }, stock: 14 },
  ],
  home: [
    { name: "Handwoven Throw", slug: "handwoven-throw", sku: "HOM-TH-301", price: 3299, featured: true, tags: "throw,textile,handwoven,home", description: "A cotton-wool throw woven on a pit loom in Kutch. Terracotta and cream stripes that sit well on a dark sofa. Fringed ends, pre-washed, gets softer.", specs: { Size: "130 × 180 cm", Material: "Cotton-wool blend", Weave: "Handloom, Kutch", Care: "Cold wash" }, stock: 15 },
    { name: "Ceramic Pour-Over Set", slug: "ceramic-pour-over-set", sku: "HOM-CF-302", price: 2499, tags: "coffee,ceramic,pour-over,home", description: "A two-cup pour-over in speckled stoneware — dripper, carafe and a lid that doubles as a saucer. Fired in a small studio outside Pune.", specs: { Capacity: "600 ml", Material: "Stoneware", Includes: "Dripper, carafe, lid", Origin: "Pune" }, stock: 20 },
    { name: "Brass Diya Lamp", slug: "brass-diya-lamp", sku: "HOM-LP-303", price: 1899, tags: "brass,lamp,diya,lighting", description: "A sculptural brass diya that works as a lamp. Weighted base, removable oil cup, and a patina that will deepen. For the shelf, the entryway, or the puja room that is also a living room.", specs: { Material: "Solid brass", Height: "18 cm", Fuel: "Oil or tealight", Finish: "Hand-buffed" }, stock: 4 },
    { name: "Linen Cushion Set", slug: "linen-cushion-set", sku: "HOM-CU-304", price: 2199, tags: "linen,cushion,home,sage", description: "A pair of European flax linen cushions in sage. Knife edges, hidden zip, inserts included. They wrinkle on purpose.", specs: { Size: "45 × 45 cm", Material: "European flax linen", Set: "2 covers + inserts", Colour: "Sage" }, stock: 18 },
  ],
  apparel: [
    { name: "Merino Overshirt", slug: "merino-overshirt", sku: "APP-OS-401", price: 5499, compareAtPrice: 6499, featured: true, tags: "merino,overshirt,layer,men,women", description: "A mid-weight merino overshirt that works as a shirt or a jacket. Dual chest pockets, corozo buttons, and a cut that layers over a tee without looking costumey.", specs: { Material: "100% merino wool", Weight: "280 gsm", Care: "Hand wash / dry clean" }, variants: [
      { name: "Charcoal / S", sku: "APP-OS-401-S", stock: 6, attrs: { size: "S", color: "Charcoal" } },
      { name: "Charcoal / M", sku: "APP-OS-401-M", stock: 10, attrs: { size: "M", color: "Charcoal" } },
      { name: "Charcoal / L", sku: "APP-OS-401-L", stock: 8, attrs: { size: "L", color: "Charcoal" } },
      { name: "Charcoal / XL", sku: "APP-OS-401-XL", stock: 5, attrs: { size: "XL", color: "Charcoal" } },
    ] },
    { name: "Organic Cotton Tee", slug: "organic-cotton-tee", sku: "APP-TEE-402", price: 1299, tags: "tee,cotton,organic,basics", description: "A mid-weight organic cotton tee with a slightly longer back and a neckband that stays. Dyed in small lots — cream, not white.", specs: { Material: "Organic cotton", Weight: "180 gsm", Fit: "Regular", Origin: "Tiruppur" }, variants: [
      { name: "Cream / S", sku: "APP-TEE-402-CR-S", stock: 12, attrs: { size: "S", color: "Cream" } },
      { name: "Cream / M", sku: "APP-TEE-402-CR-M", stock: 16, attrs: { size: "M", color: "Cream" } },
      { name: "Cream / L", sku: "APP-TEE-402-CR-L", stock: 14, attrs: { size: "L", color: "Cream" } },
      { name: "Black / M", sku: "APP-TEE-402-BK-M", stock: 10, attrs: { size: "M", color: "Black" } },
      { name: "Black / L", sku: "APP-TEE-402-BK-L", stock: 10, attrs: { size: "L", color: "Black" } },
    ] },
    { name: "Linen Shirt White", slug: "linen-shirt-white", sku: "APP-LN-403", price: 2899, featured: true, tags: "linen,shirt,summer,white", description: "A white linen shirt with a camp collar and a boxy, unisex cut. Meant to be worn rumpled. Mother-of-pearl buttons, side vents.", specs: { Material: "European flax linen", Collar: "Camp", Fit: "Boxy unisex", Care: "Cold wash, hang dry" }, variants: [
      { name: "White / S", sku: "APP-LN-403-S", stock: 8, attrs: { size: "S", color: "White" } },
      { name: "White / M", sku: "APP-LN-403-M", stock: 12, attrs: { size: "M", color: "White" } },
      { name: "White / L", sku: "APP-LN-403-L", stock: 10, attrs: { size: "L", color: "White" } },
    ] },
    { name: "Everyday Chinos", slug: "everyday-chinos", sku: "APP-CH-404", price: 2499, tags: "chinos,pants,khaki,everyday", description: "Tapered chinos in a cotton-stretch twill that actually recovers. Mid-rise, 32-inch inseam, a colour between khaki and stone.", specs: { Material: "97% cotton, 3% elastane", Rise: "Mid", Inseam: "32 in", Fit: "Tapered" }, variants: [
      { name: "Khaki / 30", sku: "APP-CH-404-30", stock: 6, attrs: { size: "30", color: "Khaki" } },
      { name: "Khaki / 32", sku: "APP-CH-404-32", stock: 10, attrs: { size: "32", color: "Khaki" } },
      { name: "Khaki / 34", sku: "APP-CH-404-34", stock: 8, attrs: { size: "34", color: "Khaki" } },
      { name: "Khaki / 36", sku: "APP-CH-404-36", stock: 5, attrs: { size: "36", color: "Khaki" } },
    ] },
  ],
  wellness: [
    { name: "Ayurvedic Candle Trio", slug: "ayurvedic-candle-trio", sku: "WEL-CD-501", price: 1599, tags: "candle,ayurveda,home,gift", description: "Three soy candles scented with vetiver, sandalwood and sweet orange — notes pulled from a classic Ayurvedic palette. 25-hour burn each, poured in amber glass.", specs: { Wax: "Soy", Burn: "25 hours each", Set: "3 × 120 g", Scent: "Vetiver, sandalwood, orange" }, stock: 2 },
    { name: "Copper Water Bottle", slug: "copper-water-bottle", sku: "WEL-BT-502", price: 1199, tags: "copper,bottle,ayurveda,wellness", description: "A 900 ml hammered copper bottle with a leak-resistant cap. Traditional, but the proportions are contemporary. Hand-wash, let it patina.", specs: { Capacity: "900 ml", Material: "Pure copper", Finish: "Hammered", Care: "Hand wash" }, stock: 35 },
    { name: "Cork Yoga Mat", slug: "cork-yoga-mat", sku: "WEL-YG-503", price: 2799, compareAtPrice: 3299, featured: true, tags: "yoga,cork,mat,wellness", description: "A natural cork yoga mat over a natural rubber base. Grip improves with moisture. 4 mm, 1.8 kg, no PVC, no added fragrance.", specs: { Thickness: "4 mm", Size: "183 × 61 cm", Top: "Natural cork", Base: "Natural rubber" }, stock: 11 },
  ],
};

async function main() {
  console.log("Seeding Aarohi…");
  db.exec(`
    DELETE FROM payment_events; DELETE FROM payments; DELETE FROM order_status_history;
    DELETE FROM order_items; DELETE FROM shipment_events; DELETE FROM shipments;
    DELETE FROM coupon_usages; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM carts;
    DELETE FROM inventory_transactions; DELETE FROM product_media; DELETE FROM product_variants;
    DELETE FROM products; DELETE FROM categories; DELETE FROM addresses; DELETE FROM password_resets;
    DELETE FROM admin_logs; DELETE FROM profiles; DELETE FROM users; DELETE FROM coupons;
    DELETE FROM settings; DELETE FROM counters;
  `);

  const t = now();
  const adminHash = await bcrypt.hash("Admin@123456", 12);
  const customerHash = await bcrypt.hash("Customer@123", 12);
  const adminId = nid();
  const priyaId = nid();

  run("INSERT INTO users (id, email, passwordHash, role, status, emailVerified, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
    [adminId, "admin@aarohi.in", adminHash, "ADMIN", "ACTIVE", 1, t, t]);
  run("INSERT INTO profiles (id, userId, fullName, mobile) VALUES (?,?,?,?)", [nid(), adminId, "Aarohi Admin", "9876543210"]);

  run("INSERT INTO users (id, email, passwordHash, role, status, emailVerified, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)",
    [priyaId, "priya@aarohi.in", customerHash, "CUSTOMER", "ACTIVE", 1, t, t]);
  run("INSERT INTO profiles (id, userId, fullName, mobile) VALUES (?,?,?,?)", [nid(), priyaId, "Priya Sharma", "9811112233"]);
  run(`INSERT INTO addresses (id, userId, fullName, phone, line1, line2, city, state, pinCode, country, isDefault, createdAt, updatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [nid(), priyaId, "Priya Sharma", "9811112233", "14, Palm Grove Apartments", "Koramangala 4th Block", "Bengaluru", "Karnataka", "560034", "India", 1, t, t]);

  run("INSERT INTO coupons (id, code, type, value, minOrder, maxDiscount, usageLimit, usedCount, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [nid(), "AAROHI10", "PERCENT", 10, 1999, 1500, 1000, 0, "ACTIVE", t]);
  run("INSERT INTO coupons (id, code, type, value, minOrder, usageLimit, usedCount, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
    [nid(), "FIRST500", "FIXED", 500, 2999, 500, 0, "ACTIVE", t]);

  for (const [k, v] of Object.entries({ storeName: "Aarohi", supportEmail: "hello@aarohi.in", supportPhone: "+91 80 4123 0000", freeShippingMin: "1999", gstin: "29AAROHI1234Z5" })) {
    run("INSERT INTO settings (key, value) VALUES (?, ?)", [k, v]);
  }

  let toteId = "";
  let toteVarId = "";

  for (const cat of categories) {
    const catId = nid();
    run("INSERT INTO categories (id, name, slug, description, imageUrl, status, sortOrder, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
      [catId, cat.name, cat.slug, cat.description, `/media/categories/${cat.slug}.jpg`, "ACTIVE", cat.sortOrder, t, t]);
    for (const p of catalog[cat.slug] || []) {
      const pid = nid();
      run(`INSERT INTO products (id, categoryId, name, slug, sku, description, price, compareAtPrice, status, featured, seoTitle, seoDescription, specifications, tags, createdAt, updatedAt)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [pid, catId, p.name, p.slug, p.sku, p.description, p.price, p.compareAtPrice || null, "ACTIVE", p.featured ? 1 : 0, `${p.name} | Aarohi`, p.description.slice(0, 155), JSON.stringify(p.specs), p.tags, t, t]);
      const variants = p.variants || [{ name: "Default", sku: `${p.sku}-DEF`, stock: p.stock ?? 10, attrs: {} }];
      for (const v of variants) {
        const vid = nid();
        run("INSERT INTO product_variants (id, productId, sku, variantName, price, stockQuantity, reservedQuantity, attributes, status) VALUES (?,?,?,?,?,?,?,?,?)",
          [vid, pid, v.sku, v.name, v.price ?? null, v.stock, 0, JSON.stringify(v.attrs || {}), "ACTIVE"]);
        if (p.slug === "heritage-leather-tote") {
          toteId = pid;
          toteVarId = vid;
        }
      }
      run("INSERT INTO product_media (id, productId, mediaType, r2Key, url, sortOrder, altText, createdAt) VALUES (?,?,?,?,?,?,?,?)",
        [nid(), pid, "IMAGE", `products/${p.slug}/${p.slug}.jpg`, `/media/products/${p.slug}.jpg`, 0, p.name, t]);
    }
  }

  if (toteId && toteVarId) {
    const oid = nid();
    run(`INSERT INTO orders (id, orderNumber, userId, email, mobile, customerName, status, paymentStatus, subtotal, shippingFee, discount, total, shippingAddress, createdAt, updatedAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [oid, "ORD-2026-000001", priyaId, "priya@aarohi.in", "9811112233", "Priya Sharma", "SHIPPED", "PAID", 8499, 0, 0, 8499,
        JSON.stringify({ fullName: "Priya Sharma", phone: "9811112233", line1: "14, Palm Grove Apartments", city: "Bengaluru", state: "Karnataka", pinCode: "560034", country: "India" }), t, t]);
    run("INSERT INTO order_items (id, orderId, productId, variantId, name, variantName, sku, price, quantity, total) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [nid(), oid, toteId, toteVarId, "Heritage Leather Tote", "Default", "BAG-TOTE-001-DEF", 8499, 1, 8499]);
    run("INSERT INTO payments (id, orderId, provider, providerOrderId, providerPaymentId, amount, currency, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [nid(), oid, "CASHFREE", "ORD-2026-000001", "cf_demo_1", 8499, "INR", "PAID", t, t]);
    run("INSERT INTO shipments (id, orderId, trackingNumber, carrier, status, shippedAt, createdAt) VALUES (?,?,?,?,?,?,?)",
      [nid(), oid, "DLV123456789IN", "Delhivery", "SHIPPED", t, t]);
    run("INSERT INTO order_status_history (id, orderId, toStatus, note, createdAt) VALUES (?,?,?,?,?)", [nid(), oid, "PENDING", "Order created", t]);
    run("INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, createdAt) VALUES (?,?,?,?,?,?)", [nid(), oid, "PENDING", "CONFIRMED", "Payment verified", t]);
    run("INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, createdAt) VALUES (?,?,?,?,?,?)", [nid(), oid, "CONFIRMED", "SHIPPED", "Handed to Delhivery", t]);
    run("INSERT INTO counters (name, value) VALUES (?, ?)", ["order-2026", 1]);
  }

  console.log("Seed complete.");
  console.log("Admin:    admin@aarohi.in / Admin@123456");
  console.log("Customer: priya@aarohi.in / Customer@123");
  void get;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
