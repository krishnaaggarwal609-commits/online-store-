import { logger } from "../logger";

const ENV = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
const BASE =
  ENV === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

export function cashfreeConfigured() {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

export async function createCashfreeOrder(input: {
  orderId: string;
  amount: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}) {
  if (!cashfreeConfigured()) {
    logger.payment("demo cashfree order created", { orderId: input.orderId });
    return {
      demo: true,
      paymentSessionId: `demo_${input.orderId}`,
      paymentUrl: `/checkout/pay/${input.orderId}`,
      cfOrderId: `demo_${input.orderId}`,
    };
  }

  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.CASHFREE_APP_ID as string,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY as string,
      "x-api-version": "2023-08-01",
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
      },
      order_meta: { return_url: input.returnUrl },
    }),
  });

  const data = (await res.json()) as {
    payment_session_id?: string;
    cf_order_id?: string;
    message?: string;
    payment_link?: string;
  };

  if (!res.ok) {
    logger.payment("cashfree order failed", { status: res.status, data });
    throw Object.assign(new Error(data.message || "Unable to create Cashfree order"), { status: 502 });
  }

  logger.payment("cashfree order created", { orderId: input.orderId });
  return {
    demo: false,
    paymentSessionId: data.payment_session_id,
    paymentUrl: data.payment_link,
    cfOrderId: data.cf_order_id,
  };
}

export function verifyWebhookSignature(rawBody: string, timestamp: string | undefined, signature: string | undefined) {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret) {
    return process.env.DEMO_MODE === "true";
  }
  if (!timestamp || !signature) return false;
  const crypto = require("crypto") as typeof import("crypto");
  const signed = timestamp + rawBody;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("base64");
  return expected === signature;
}
