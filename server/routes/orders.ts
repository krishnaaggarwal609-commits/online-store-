import { Router } from "express";
import { all, get, run, loadOrder } from "../db";
import { wrap, HttpError } from "../middleware";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { restock, restoreReserved } from "../lib/inventory";
import { logger } from "../logger";
import { parseJson } from "../lib/money";
import { nid, now } from "../db";

const router = Router();

function serializeOrder(order: NonNullable<ReturnType<typeof loadOrder>>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    email: order.email,
    mobile: order.mobile,
    customerName: order.customerName,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    total: order.total,
    couponCode: order.couponCode,
    shippingAddress: parseJson(String(order.shippingAddress || "{}"), {}),
    createdAt: order.createdAt,
    trackingNumber: (order.shipments[0] as { trackingNumber?: string } | undefined)?.trackingNumber || null,
    carrier: (order.shipments[0] as { carrier?: string } | undefined)?.carrier || null,
    items: (order.items as { id: string; name: string; variantName: string; sku: string; price: number; quantity: number; total: number; slug: string; image: string | null }[]).map((i) => ({
      id: i.id,
      name: i.name,
      variantName: i.variantName,
      sku: i.sku,
      price: i.price,
      quantity: i.quantity,
      total: i.total,
      slug: i.slug,
      image: i.image || "/media/placeholder.svg",
    })),
    history: order.statusHistory,
  };
}

router.get(
  "/",
  requireAuth,
  wrap(async (req: AuthedRequest, res) => {
    const ids = all<{ id: string }>("SELECT id FROM orders WHERE userId = ? ORDER BY createdAt DESC", [req.user!.id]);
    res.json({ data: ids.map((r) => serializeOrder(loadOrder(r.id)!)) });
  })
);

router.get(
  "/:id",
  wrap(async (req: AuthedRequest, res) => {
    const order = loadOrder(String(req.params.id));
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.userId) {
      if (!req.user || (req.user.role !== "ADMIN" && req.user.id !== order.userId)) {
        throw new HttpError(403, "You cannot view this order.");
      }
    }
    res.json({ data: serializeOrder(order) });
  })
);

router.post(
  "/:id/cancel",
  wrap(async (req: AuthedRequest, res) => {
    const order = get<{
      id: string;
      userId: string | null;
      status: string;
      paymentStatus: string;
    }>("SELECT * FROM orders WHERE id = ?", [String(req.params.id)]);
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.userId && req.user?.id !== order.userId && req.user?.role !== "ADMIN") {
      throw new HttpError(403, "You cannot cancel this order.");
    }
    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(order.status)) {
      throw new HttpError(400, "This order can no longer be cancelled.");
    }
    const items = all<{ variantId: string; quantity: number }>("SELECT variantId, quantity FROM order_items WHERE orderId = ?", [order.id]);
    run("UPDATE orders SET status = 'CANCELLED', updatedAt = ? WHERE id = ?", [now(), order.id]);
    run(
      "INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, actorId, createdAt) VALUES (?,?,?,?,?,?,?)",
      [nid(), order.id, order.status, "CANCELLED", "Cancelled by customer", req.user?.id || null, now()]
    );
    for (const item of items) {
      if (order.paymentStatus === "PAID") {
        await restock(item.variantId, item.quantity, order.id, req.user?.id);
      } else {
        await restoreReserved(item.variantId, item.quantity, order.id, "Order cancelled");
      }
    }
    logger.order("cancelled", { orderId: order.id });
    res.json({ data: serializeOrder(loadOrder(order.id)!) });
  })
);

export default router;
