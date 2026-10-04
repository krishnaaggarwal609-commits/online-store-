import { get, run, tx, nid, now, type VariantRow } from "../db";
import { logger } from "../logger";

export function availableStock(stock: number, reserved: number) {
  return Math.max(0, stock - reserved);
}

export async function reserveStock(variantId: string, quantity: number, orderId?: string) {
  const result = tx(() => {
    const variant = get<VariantRow>("SELECT * FROM product_variants WHERE id = ?", [variantId]);
    if (!variant) throw Object.assign(new Error("Variant not found"), { status: 404 });
    const available = availableStock(variant.stockQuantity, variant.reservedQuantity);
    if (available < quantity) {
      throw Object.assign(new Error(`Not enough stock for ${variant.variantName}`), { status: 409 });
    }
    run("UPDATE product_variants SET reservedQuantity = reservedQuantity + ? WHERE id = ?", [quantity, variantId]);
    run(
      "INSERT INTO inventory_transactions (id, variantId, type, quantity, reason, orderId, createdAt) VALUES (?,?,?,?,?,?,?)",
      [nid(), variantId, "RESERVE", quantity, "Checkout reservation", orderId || null, now()]
    );
    return get<VariantRow>("SELECT * FROM product_variants WHERE id = ?", [variantId]);
  });
  logger.inventory("reserved", { variantId, quantity, orderId });
  return result;
}

export async function deductReserved(variantId: string, quantity: number, orderId?: string) {
  tx(() => {
    const variant = get<VariantRow>("SELECT * FROM product_variants WHERE id = ?", [variantId]);
    if (!variant) return;
    const nextReserved = Math.max(0, variant.reservedQuantity - quantity);
    const nextStock = Math.max(0, variant.stockQuantity - quantity);
    run("UPDATE product_variants SET reservedQuantity = ?, stockQuantity = ? WHERE id = ?", [
      nextReserved,
      nextStock,
      variantId,
    ]);
    run(
      "INSERT INTO inventory_transactions (id, variantId, type, quantity, reason, orderId, createdAt) VALUES (?,?,?,?,?,?,?)",
      [nid(), variantId, "DEDUCT", quantity, "Payment confirmed", orderId || null, now()]
    );
  });
  logger.inventory("deducted", { variantId, quantity, orderId });
}

export async function restoreReserved(variantId: string, quantity: number, orderId?: string, reason = "Released reservation") {
  tx(() => {
    const variant = get<VariantRow>("SELECT * FROM product_variants WHERE id = ?", [variantId]);
    if (!variant) return;
    const nextReserved = Math.max(0, variant.reservedQuantity - quantity);
    run("UPDATE product_variants SET reservedQuantity = ? WHERE id = ?", [nextReserved, variantId]);
    run(
      "INSERT INTO inventory_transactions (id, variantId, type, quantity, reason, orderId, createdAt) VALUES (?,?,?,?,?,?,?)",
      [nid(), variantId, "RESTORE", quantity, reason, orderId || null, now()]
    );
  });
  logger.inventory("restored", { variantId, quantity, orderId });
}

export async function restock(variantId: string, quantity: number, orderId?: string, actorId?: string) {
  tx(() => {
    run("UPDATE product_variants SET stockQuantity = stockQuantity + ? WHERE id = ?", [quantity, variantId]);
    run(
      "INSERT INTO inventory_transactions (id, variantId, type, quantity, reason, orderId, actorId, createdAt) VALUES (?,?,?,?,?,?,?,?)",
      [nid(), variantId, "RESTOCK", quantity, "Order cancelled / returned", orderId || null, actorId || null, now()]
    );
  });
  logger.inventory("restocked", { variantId, quantity, orderId });
}
