import { Router } from "express";
import { all, get, hydrateProduct, type ProductRow } from "../db";
import { wrap, HttpError } from "../middleware";
import { parseJson } from "../lib/money";
import { availableStock } from "../lib/inventory";

const router = Router();

function productPayload(product: ReturnType<typeof hydrateProduct>) {
  const variants = product.variants.map((v) => ({
    ...v,
    price: v.price ?? product.price,
    available: availableStock(v.stockQuantity, v.reservedQuantity),
    attributes: parseJson(v.attributes, {} as Record<string, string>),
  }));
  const inStock = variants.some((v) => v.available > 0 && v.status === "ACTIVE");
  return {
    ...product,
    specifications: parseJson(product.specifications, {} as Record<string, string>),
    tags: product.tags ? product.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    variants,
    media: product.media,
    inStock,
    image: product.media.find((m) => m.mediaType === "IMAGE")?.url || "/media/placeholder.svg",
  };
}

router.get(
  "/categories",
  wrap(async (_req, res) => {
    const categories = all<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      productCount: number;
    }>(
      `SELECT c.id, c.name, c.slug, c.description, c.imageUrl,
              (SELECT COUNT(*) FROM products p WHERE p.categoryId = c.id AND p.status = 'ACTIVE') AS productCount
       FROM categories c WHERE c.status = 'ACTIVE' ORDER BY c.sortOrder ASC`
    );
    res.json({ data: categories });
  })
);

router.get(
  "/categories/:slug/products",
  wrap(async (req, res) => {
    const category = get<{ id: string; name: string; slug: string; description: string | null; imageUrl: string | null; status: string }>(
      "SELECT * FROM categories WHERE slug = ?",
      [String(req.params.slug)]
    );
    if (!category || category.status !== "ACTIVE") throw new HttpError(404, "Category not found.");
    req.query.category = category.slug;
    return listProducts(req, res, category);
  })
);

router.get(
  "/products",
  wrap(async (req, res) => {
    await listProducts(req, res);
  })
);

async function listProducts(
  req: { query: Record<string, unknown> },
  res: { json: (v: unknown) => void },
  category?: { id: string; name: string; slug: string; description: string | null; imageUrl: string | null }
) {
  const q = String(req.query.q || req.query.search || "").trim();
  const slug = String(req.query.category || "");
  const sort = String(req.query.sort || "newest");
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(req.query.pageSize) || 12));
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
  const featured = req.query.featured === "true";
  const inStock = req.query.inStock === "true";

  const where: string[] = ["p.status = 'ACTIVE'"];
  const params: unknown[] = [];

  if (category) {
    where.push("p.categoryId = ?");
    params.push(category.id);
  } else if (slug) {
    const cat = get<{ id: string }>("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (cat) {
      where.push("p.categoryId = ?");
      params.push(cat.id);
    }
  }
  if (featured) where.push("p.featured = 1");
  if (q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR IFNULL(p.tags,'') LIKE ? OR p.description LIKE ? OR c.name LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  if (minPrice != null && !Number.isNaN(minPrice)) {
    where.push("p.price >= ?");
    params.push(minPrice);
  }
  if (maxPrice != null && !Number.isNaN(maxPrice)) {
    where.push("p.price <= ?");
    params.push(maxPrice);
  }
  if (inStock) {
    where.push("EXISTS (SELECT 1 FROM product_variants v WHERE v.productId = p.id AND v.status = 'ACTIVE' AND v.stockQuantity > 0)");
  }

  const orderBy =
    sort === "price_asc"
      ? "p.price ASC"
      : sort === "price_desc"
        ? "p.price DESC"
        : sort === "name"
          ? "p.name ASC"
          : sort === "featured"
            ? "p.featured DESC, p.createdAt DESC"
            : "p.createdAt DESC";

  const whereSql = where.join(" AND ");
  const total = get<{ n: number }>(
    `SELECT COUNT(*) as n FROM products p JOIN categories c ON c.id = p.categoryId WHERE ${whereSql}`,
    params
  )?.n || 0;
  const rows = all<ProductRow>(
    `SELECT p.* FROM products p JOIN categories c ON c.id = p.categoryId WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  res.json({
    data: rows.map((r) => productPayload(hydrateProduct(r))),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    category: category || null,
  });
}

router.get(
  "/products/:slug",
  wrap(async (req, res) => {
    const row = get<ProductRow>("SELECT * FROM products WHERE slug = ?", [String(req.params.slug)]);
    if (!row || row.status !== "ACTIVE") throw new HttpError(404, "Product not found.");
    const product = hydrateProduct(row);
    const related = all<ProductRow>(
      "SELECT * FROM products WHERE categoryId = ? AND status = 'ACTIVE' AND id != ? LIMIT 4",
      [product.categoryId, product.id]
    );
    res.json({
      data: productPayload(product),
      related: related.map((r) => productPayload(hydrateProduct(r))),
    });
  })
);

router.get(
  "/search/suggest",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ data: { products: [], categories: [] } });
    const like = `%${q}%`;
    const products = all<{ id: string; name: string; slug: string; price: number; image: string | null }>(
      `SELECT p.id, p.name, p.slug, p.price,
              (SELECT url FROM product_media m WHERE m.productId = p.id ORDER BY sortOrder LIMIT 1) AS image
       FROM products p
       WHERE p.status = 'ACTIVE' AND (p.name LIKE ? OR p.sku LIKE ? OR IFNULL(p.tags,'') LIKE ?)
       LIMIT 6`,
      [like, like, like]
    );
    const categories = all<{ name: string; slug: string }>(
      "SELECT name, slug FROM categories WHERE status = 'ACTIVE' AND name LIKE ? LIMIT 4",
      [like]
    );
    res.json({ data: { products, categories } });
  })
);

export default router;
