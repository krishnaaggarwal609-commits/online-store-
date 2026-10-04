import { Router } from "express";
import { all, get, run, tx, nid, now } from "../db";
import { wrap, HttpError } from "../middleware";
import { type AuthedRequest } from "../lib/auth";
import { createCashfreeOrder, verifyWebhookSignature } from "../lib/cashfree";
import { deductReserved, restoreReserved } from "../lib/inventory";
import { logger } from "../logger";

const router = Router();

type OrderRow = {
  id: string;
  orderNumber: string;
  userId: string | null;
  email: string;
  mobile: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number;
};

async function markPaid(orderId: string, providerPaymentId?: string, eventId?: string, payload?: unknown) {
  const order = get<OrderRow>("SELECT * FROM orders WHERE id = ? OR orderNumber = ?", [orderId, orderId]);
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.paymentStatus === "PAID") return order;
  const items = all<{ variantId: string; quantity: number }>("SELECT variantId, quantity FROM order_items WHERE orderId = ?", [order.id]);
  const payment = get<{ id: string }>("SELECT id FROM payments WHERE orderId = ?", [order.id]);
  const t = now();
  tx(() => {
    run("UPDATE orders SET paymentStatus = 'PAID', status = 'CONFIRMED', updatedAt = ? WHERE id = ?", [t, order.id]);
    run(
      "INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, createdAt) VALUES (?,?,?,?,?,?)",
      [nid(), order.id, order.status, "CONFIRMED", "Payment verified", t]
    );
    if (payment) {
      run("UPDATE payments SET status = 'PAID', providerPaymentId = COALESCE(?, providerPaymentId), rawPayload = ?, updatedAt = ? WHERE id = ?", [
        providerPaymentId || null,
        payload ? JSON.stringify(payload) : null,
        t,
        payment.id,
      ]);
      if (eventId) {
        run(
          "INSERT INTO payment_events (id, paymentId, eventId, eventType, payload, processedAt) VALUES (?,?,?,?,?,?)",
          [nid(), payment.id, eventId, "PAYMENT_SUCCESS", JSON.stringify(payload || {}), t]
        );
      }
    }
  });
  for (const item of items) {
    await deductReserved(item.variantId, item.quantity, order.id);
  }
  logger.payment("order marked paid", { orderId: order.id, orderNumber: order.orderNumber });
  return get<OrderRow>("SELECT * FROM orders WHERE id = ?", [order.id])!;
}

async function markFailed(orderId: string, eventId?: string, payload?: unknown) {
  const order = get<OrderRow>("SELECT * FROM orders WHERE id = ? OR orderNumber = ?", [orderId, orderId]);
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.paymentStatus === "PAID") return order;
  const items = all<{ variantId: string; quantity: number }>("SELECT variantId, quantity FROM order_items WHERE orderId = ?", [order.id]);
  const payment = get<{ id: string }>("SELECT id FROM payments WHERE orderId = ?", [order.id]);
  const t = now();
  tx(() => {
    run("UPDATE orders SET paymentStatus = 'FAILED', status = 'PAYMENT_FAILED', updatedAt = ? WHERE id = ?", [t, order.id]);
    run(
      "INSERT INTO order_status_history (id, orderId, fromStatus, toStatus, note, createdAt) VALUES (?,?,?,?,?,?)",
      [nid(), order.id, order.status, "PAYMENT_FAILED", "Payment failed or cancelled", t]
    );
    if (payment) {
      run("UPDATE payments SET status = 'FAILED', updatedAt = ? WHERE id = ?", [t, payment.id]);
      if (eventId) {
        run(
          "INSERT INTO payment_events (id, paymentId, eventId, eventType, payload, processedAt) VALUES (?,?,?,?,?,?)",
          [nid(), payment.id, eventId, "PAYMENT_FAILED", JSON.stringify(payload || {}), t]
        );
      }
    }
  });
  for (const item of items) {
    await restoreReserved(item.variantId, item.quantity, order.id, "Payment failed");
  }
  logger.payment("order payment failed", { orderId: order.id });
  return get<OrderRow>("SELECT * FROM orders WHERE id = ?", [order.id])!;
}

router.post(
  "/create",
  wrap(async (req: AuthedRequest, res) => {
    const orderId = String(req.body?.orderId || "");
    const order = get<OrderRow>("SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order) throw new HttpError(404, "Order not found.");
    if (req.user && order.userId && order.userId !== req.user.id) {
      throw new HttpError(403, "You cannot pay for this order.");
    }
    if (order.paymentStatus === "PAID") throw new HttpError(400, "This order is already paid.");

    const cf = await createCashfreeOrder({
      orderId: order.orderNumber,
      amount: order.total,
      customerId: order.userId || `guest_${order.id}`,
      customerName: order.customerName,
      customerEmail: order.email,
      customerPhone: order.mobile,
      returnUrl: `${process.env.STORE_URL || ""}/order/success?orderId=${order.id}`,
    });
    if (cf.demo) {
      cf.paymentUrl = `/checkout/pay/${order.id}`;
    }

    let payment = get<{ id: string }>("SELECT id FROM payments WHERE orderId = ?", [order.id]);
    const t = now();
    if (!payment) {
      const id = nid();
      run(
        "INSERT INTO payments (id, orderId, provider, providerOrderId, amount, currency, status, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)",
        [id, order.id, "CASHFREE", cf.cfOrderId || order.orderNumber, order.total, "INR", "PENDING", t, t]
      );
      payment = { id };
    } else {
      run("UPDATE payments SET providerOrderId = ?, amount = ?, updatedAt = ? WHERE id = ?", [
        cf.cfOrderId || order.orderNumber,
        order.total,
        t,
        payment.id,
      ]);
    }

    logger.payment("payment session created", { orderId: order.id, demo: cf.demo });
    res.json({
      data: {
        paymentId: payment.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        currency: "INR",
        paymentSessionId: cf.paymentSessionId,
        paymentUrl: cf.paymentUrl || `/checkout/pay/${order.id}`,
        demo: cf.demo,
      },
    });
  })
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    const payment = get<{
      id: string;
      status: string;
      amount: number;
      orderId: string;
      orderNumber: string;
      orderStatus: string;
      paymentStatus: string;
    }>(
      `SELECT p.id, p.status, p.amount, p.orderId, o.orderNumber, o.status AS orderStatus, o.paymentStatus
       FROM payments p JOIN orders o ON o.id = p.orderId WHERE p.id = ?`,
      [String(req.params.id)]
    );
    if (!payment) throw new HttpError(404, "Payment not found.");
    res.json({ data: payment });
  })
);

router.post(
  "/cashfree/webhook",
  wrap(async (req, res) => {
    const signature = (req.headers["x-webhook-signature"] || req.headers["x-cf-signature"]) as string | undefined;
    const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    if (!verifyWebhookSignature(raw, timestamp, signature) && process.env.DEMO_MODE !== "true") {
      logger.payment("webhook signature failed");
      throw new HttpError(401, "Invalid webhook signature.");
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventId = String(body?.data?.cf_payment_id || body?.eventId || body?.data?.order?.order_id || `evt_${Date.now()}`);
    const existing = get("SELECT id FROM payment_events WHERE eventId = ?", [eventId]);
    if (existing) {
      logger.payment("webhook ignored duplicate", { eventId });
      return res.json({ data: { ok: true, duplicate: true } });
    }

    const type = String(body?.type || body?.event || body?.data?.payment?.payment_status || "").toUpperCase();
    const orderNumber = String(body?.data?.order?.order_id || body?.orderNumber || body?.data?.order_id || "");
    const order =
      (orderNumber && get<OrderRow>("SELECT * FROM orders WHERE orderNumber = ?", [orderNumber])) ||
      (body?.orderId && get<OrderRow>("SELECT * FROM orders WHERE id = ?", [String(body.orderId)]));

    if (!order) {
      run(
        "INSERT INTO payment_events (id, eventId, eventType, payload, processedAt) VALUES (?,?,?,?,?)",
        [nid(), eventId, type || "UNKNOWN", JSON.stringify(body || {}), now()]
      );
      return res.json({ data: { ok: true, ignored: true } });
    }

    const success = type.includes("SUCCESS") || type === "PAID" || body?.success === true;
    const failed = type.includes("FAILED") || type.includes("CANCEL") || body?.success === false;

    if (success) await markPaid(order.id, String(body?.data?.cf_payment_id || ""), eventId, body);
    else if (failed) await markFailed(order.id, eventId, body);
    else {
      run(
        "INSERT INTO payment_events (id, eventId, eventType, payload, processedAt) VALUES (?,?,?,?,?)",
        [nid(), eventId, type || "UNKNOWN", JSON.stringify(body || {}), now()]
      );
    }
    res.json({ data: { ok: true } });
  })
);

router.post(
  "/demo/complete",
  wrap(async (req, res) => {
    if (process.env.DEMO_MODE !== "true") throw new HttpError(403, "Demo payments are disabled.");
    const orderId = String(req.body?.orderId || "");
    const success = req.body?.success !== false;
    const eventId = `demo_${orderId}_${Date.now()}`;
    const order = success
      ? await markPaid(orderId, `demo_pay_${orderId}`, eventId, { demo: true })
      : await markFailed(orderId, eventId, { demo: true });
    res.json({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
      },
    });
  })
);

export default router;
