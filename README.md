# Aarohi — Online Store

A modern Indian e-commerce store built from the Inforge Architecture PRD v1.0.

**Stack:** Next.js 14 (storefront) · Express + TypeScript (REST `/api/v1`) · SQLite locally via `better-sqlite3` (switch `server/schema.sql` / `DATABASE_URL` to PostgreSQL on Inforge) · Cloudflare R2 (local `uploads/` fallback) · Cashfree (demo checkout when keys are absent)

`prisma/schema.prisma` documents the production PostgreSQL model from the PRD.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | priya@aarohi.in | Customer@123 |
| Admin | admin@aarohi.in | Admin@123456 |

Coupons: `AAROHI10` (10% over ₹1,999) · `FIRST500` (₹500 off over ₹2,999)

## Local development

```bash
npm install
npm run setup      # prisma generate + db push + seed
npm run dev        # API :4000 and Next.js :3000
```

Open [http://localhost:3000](http://localhost:3000). The Next.js app proxies `/api/v1/*` to Express.

## Environment

See `.env.example`. On Inforge set:

- `DATABASE_URL` — PostgreSQL
- `SESSION_SECRET`
- `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`
- `COOKIE_SECURE=true`, `DEMO_MODE=false`

Switch Prisma to Postgres by changing `provider = "postgresql"` in `prisma/schema.prisma`.

## Architecture

```
Customer → Cloudflare DNS/SSL/CDN → Inforge
  Next.js storefront
  Express /api/v1  (auth, catalog, cart, checkout, payments, orders, admin)
  PostgreSQL
  → Cloudflare R2 (media)
  → Cashfree (UPI / cards / net banking)
```

Orders are marked **PAID only after server-side verification** (Cashfree webhook, or the demo complete endpoint which still runs on the API). Inventory is reserved at checkout, deducted on payment, restored on failure/cancel.

## Routes

Storefront: `/` `/products` `/category/[slug]` `/product/[slug]` `/search` `/cart` `/checkout` `/order/success` `/orders` `/account` `/login` `/register`

Admin: `/admin` `/admin/products` `/admin/categories` `/admin/orders` `/admin/customers` `/admin/settings`
