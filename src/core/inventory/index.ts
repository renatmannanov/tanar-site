// Server-side public API of the inventory module: transactional stock
// movements for order-status transitions plus the manual-adjustment journal.
// Client components import '@/core/inventory/client' (levels, no db).
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/core/db';

export * from './client';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Inventory effect of an order status: pending/cancelled hold nothing,
// confirmed holds a reservation, done has consumed physical stock.
export type InventoryState = 'none' | 'reserved' | 'sold';
export type StockShortage = { skuId: string; requested: number; available: number };
export type TransitionItem = { skuId: string; qty: number };

/**
 * Moves stock for an order's items from the effect of one status to the
 * effect of another, inside the caller's transaction. All-or-nothing: on any
 * shortage it performs NO updates and returns { ok: false } — the caller just
 * returns out of the transaction callback (nothing to roll back; drizzle's
 * tx.rollback() throws and is never used here).
 *
 * Idempotency: the caller passes the OLD status read from the order row
 * locked FOR UPDATE in the same transaction, so from === to is a no-op.
 */
export async function transitionOrderItems(
  tx: Tx,
  items: TransitionItem[],
  from: InventoryState,
  to: InventoryState,
  refOrderId: string,
): Promise<{ ok: true } | { ok: false; shortages: StockShortage[] }> {
  if (from === to) return { ok: true };

  // Aggregate per SKU (order items are deduped by the cart, but stay safe).
  const qtyBySkuId = new Map<string, number>();
  for (const item of items) {
    qtyBySkuId.set(item.skuId, (qtyBySkuId.get(item.skuId) ?? 0) + item.qty);
  }
  if (qtyBySkuId.size === 0) return { ok: true };

  const skuIds = [...qtyBySkuId.keys()];
  const rows = await tx
    .select({
      id: schema.skus.id,
      stockQty: schema.skus.stockQty,
      reservedQty: schema.skus.reservedQty,
    })
    .from(schema.skus)
    .where(inArray(schema.skus.id, skuIds))
    .for('update');
  const rowById = new Map(rows.map((r) => [r.id, r]));

  // The transition only shrinks availability when `to` takes stock that `from`
  // was not already holding; reserved→sold and sold→reserved keep available flat.
  const needsCheck = from === 'none' && to !== 'none';

  const shortages: StockShortage[] = [];
  const updates: { skuId: string; stockQty: number; reservedQty: number }[] = [];
  const logs: (typeof schema.inventoryLog.$inferInsert)[] = [];

  for (const [skuId, qty] of qtyBySkuId) {
    const row = rowById.get(skuId);
    if (!row) {
      // The order outlived its product — treat as nothing available.
      shortages.push({ skuId, requested: qty, available: 0 });
      continue;
    }

    // Revert the effect of `from`, then apply the effect of `to`.
    let stockQty = row.stockQty;
    let reservedQty = row.reservedQty;
    if (from === 'reserved') reservedQty -= qty;
    if (from === 'sold') stockQty += qty;
    if (needsCheck && stockQty - reservedQty < qty) {
      shortages.push({ skuId, requested: qty, available: stockQty - reservedQty });
      continue;
    }
    if (to === 'reserved') reservedQty += qty;
    if (to === 'sold') stockQty -= qty;
    updates.push({ skuId, stockQty, reservedQty });

    // Journal both halves of the move (reserved→sold = release + sale, etc.).
    if (from === 'reserved') {
      logs.push({ skuId, delta: -qty, reason: 'reservation_release', refOrderId });
    }
    if (from === 'sold') {
      logs.push({ skuId, delta: qty, reason: 'return', refOrderId });
    }
    if (to === 'reserved') {
      logs.push({ skuId, delta: qty, reason: 'reservation', refOrderId });
    }
    if (to === 'sold') {
      logs.push({ skuId, delta: -qty, reason: 'sale', refOrderId });
    }
  }

  if (shortages.length > 0) return { ok: false, shortages };

  const now = new Date();
  for (const u of updates) {
    await tx
      .update(schema.skus)
      .set({ stockQty: u.stockQty, reservedQty: u.reservedQty, updatedAt: now })
      .where(eq(schema.skus.id, u.skuId));
  }
  if (logs.length > 0) {
    await tx.insert(schema.inventoryLog).values(logs);
  }
  return { ok: true };
}

/**
 * Journals manual stock edits (admin product form) as reason='manual'.
 * Zero deltas are skipped — saving a product without touching stock must not
 * grow the log.
 */
export async function logManualAdjustments(
  tx: Tx,
  entries: { skuId: string; delta: number; note?: string }[],
): Promise<void> {
  const rows = entries
    .filter((e) => e.delta !== 0)
    .map((e) => ({
      skuId: e.skuId,
      delta: e.delta,
      reason: 'manual' as const,
      note: e.note,
    }));
  if (rows.length === 0) return;
  await tx.insert(schema.inventoryLog).values(rows);
}
