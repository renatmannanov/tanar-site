// Server-side public API of the orders module: order creation (storefront
// checkout) and admin reads/status updates. No node-only deps beyond the db
// client. Client components import types from '@/core/orders/client'.
import { z } from 'zod';
import { desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import { transitionOrderItems, type InventoryState } from '@/core/inventory';
import type {
  CreateOrderResult,
  OrderItemInput,
  OrderStatus,
  OrderView,
  UpdateOrderStatusResult,
} from './client';

export * from './client';

const orderItemsInputSchema = z
  .array(
    z.object({
      skuId: z.string().uuid(),
      qty: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(30);

const orderStatusSchema = z.enum(['pending', 'confirmed', 'done', 'cancelled']);

type OrderRow = typeof schema.orders.$inferSelect;
type OrderItemRow = typeof schema.orderItems.$inferSelect;

function mapOrder(row: OrderRow, items: OrderItemRow[]): OrderView {
  return {
    id: row.id,
    number: row.number,
    status: row.status as OrderStatus,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    items: items.map((i) => ({
      id: i.id,
      nameSnapshot: i.nameSnapshot,
      priceSnapshot: i.priceSnapshot,
      qty: i.qty,
    })),
  };
}

/**
 * Create an order from cart items. Prices and names come from the DB (the
 * client-side cart snapshots are display-only). Availability IS checked
 * (stockQty - reservedQty >= qty per position) but nothing is reserved here —
 * the reserve is taken only when the admin confirms the order.
 */
export async function createOrder(
  items: OrderItemInput[],
): Promise<CreateOrderResult> {
  const parsed = orderItemsInputSchema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: 'Некорректный заказ' };
  }

  const skuIds = parsed.data.map((i) => i.skuId);
  const rows = await db
    .select({
      skuId: schema.skus.id,
      size: schema.skus.size,
      ruSize: schema.skus.ruSize,
      priceOverride: schema.skus.priceOverride,
      stockQty: schema.skus.stockQty,
      reservedQty: schema.skus.reservedQty,
      colorLabel: schema.productVariants.colorLabel,
      productName: schema.products.name,
      productStatus: schema.products.status,
      priceBase: schema.products.priceBase,
    })
    .from(schema.skus)
    .innerJoin(
      schema.productVariants,
      eq(schema.skus.variantId, schema.productVariants.id),
    )
    .innerJoin(
      schema.products,
      eq(schema.productVariants.productId, schema.products.id),
    )
    .where(inArray(schema.skus.id, skuIds));

  const bySkuId = new Map(rows.map((r) => [r.skuId, r]));
  const unavailableSkuIds = parsed.data
    .filter((input) => {
      const row = bySkuId.get(input.skuId);
      return (
        !row ||
        row.productStatus !== 'published' ||
        row.stockQty - row.reservedQty < input.qty
      );
    })
    .map((input) => input.skuId);
  if (unavailableSkuIds.length > 0) {
    return { ok: false, error: 'Часть товаров недоступна', unavailableSkuIds };
  }

  const lines = parsed.data.map((input) => {
    const row = bySkuId.get(input.skuId)!;
    const price = row.priceOverride ?? row.priceBase;
    const sizeLabel = row.ruSize ? `${row.size}/${row.ruSize}` : row.size;
    return {
      skuId: input.skuId,
      qty: input.qty,
      priceSnapshot: price,
      nameSnapshot: `${row.productName} (${row.colorLabel}, ${sizeLabel})`,
    };
  });
  const total = lines.reduce((sum, l) => sum + l.priceSnapshot * l.qty, 0);

  const order = await db.transaction(async (tx) => {
    const [orderRow] = await tx
      .insert(schema.orders)
      .values({ source: 'site', total })
      .returning();
    const itemRows = await tx
      .insert(schema.orderItems)
      .values(lines.map((l) => ({ ...l, orderId: orderRow.id })))
      .returning();
    return mapOrder(orderRow, itemRows);
  });

  return { ok: true, order };
}

/**
 * Orders newest-first with their items. Returns [] on any DB error so the
 * admin page never crashes a build without DATABASE_URL (getSiteSettings
 * pattern).
 */
export async function listOrders(limit = 100): Promise<OrderView[]> {
  try {
    const orderRows = await db
      .select()
      .from(schema.orders)
      .orderBy(desc(schema.orders.createdAt))
      .limit(limit);
    if (orderRows.length === 0) return [];
    const itemRows = await db
      .select()
      .from(schema.orderItems)
      .where(
        inArray(
          schema.orderItems.orderId,
          orderRows.map((o) => o.id),
        ),
      );
    const byOrderId = new Map<string, OrderItemRow[]>();
    for (const item of itemRows) {
      const list = byOrderId.get(item.orderId) ?? [];
      list.push(item);
      byOrderId.set(item.orderId, list);
    }
    return orderRows.map((o) => mapOrder(o, byOrderId.get(o.id) ?? []));
  } catch {
    return [];
  }
}

/**
 * Number of `pending` («Новый») orders — drives the sidebar badge in the
 * admin shell. 0 on any DB error (build without DATABASE_URL must not crash).
 */
export async function countPendingOrders(): Promise<number> {
  try {
    return await db.$count(
      schema.orders,
      eq(schema.orders.status, 'pending'),
    );
  } catch {
    return 0;
  }
}

// Inventory effect of each order status — the effect model lives in
// @/core/inventory (transitionOrderItems): a status change reverts the old
// status' effect and applies the new one, so ANY select jump works.
const STATUS_INVENTORY_STATE: Record<OrderStatus, InventoryState> = {
  pending: 'none',
  cancelled: 'none',
  confirmed: 'reserved',
  done: 'sold',
};

/**
 * Admin-only status change — callers must requireAdmin first.
 *
 * Runs in ONE transaction: the order row is locked FOR UPDATE, the old status
 * is read under that lock (idempotency: old === new is a no-op), then
 * transitionOrderItems moves stock/reserve and journals to inventory_log.
 * On shortage it performs no updates and we return { ok: false } out of the
 * transaction callback — no explicit rollback (nothing changed).
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  const parsed = orderStatusSchema.parse(status);
  return db.transaction(async (tx): Promise<UpdateOrderStatusResult> => {
    const [order] = await tx
      .select({ status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .for('update');
    if (!order) return { ok: false, error: 'Заказ не найден' };
    const old = order.status as OrderStatus;
    if (old === parsed) return { ok: true };

    const items = await tx
      .select({
        skuId: schema.orderItems.skuId,
        qty: schema.orderItems.qty,
        nameSnapshot: schema.orderItems.nameSnapshot,
      })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, id));

    const result = await transitionOrderItems(
      tx,
      items,
      STATUS_INVENTORY_STATE[old],
      STATUS_INVENTORY_STATE[parsed],
      id,
    );
    if (!result.ok) {
      const nameBySkuId = new Map(items.map((i) => [i.skuId, i.nameSnapshot]));
      return {
        ok: false,
        error: 'Не хватает остатка',
        shortages: result.shortages.map((s) => ({
          nameSnapshot: nameBySkuId.get(s.skuId) ?? s.skuId,
          requested: s.requested,
          available: s.available,
        })),
      };
    }

    await tx
      .update(schema.orders)
      .set({ status: parsed, updatedAt: new Date() })
      .where(eq(schema.orders.id, id));
    return { ok: true };
  });
}

/**
 * Admin-only order removal — callers must requireAdmin first. order_items go
 * via FK cascade. A `confirmed` order releases its reserve first (the order
 * disappears — the reserve must not dangle). A `done` order does NOT return
 * stock: the goods were physically sold; deleting the record is not a refund
 * (to restock, switch to «Отменён» first, then delete). inventory_log rows
 * keep their history but lose the order reference (FK has no cascade).
 */
export async function deleteOrder(id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .for('update');
    if (!order) return;

    if (order.status === 'confirmed') {
      const items = await tx
        .select({ skuId: schema.orderItems.skuId, qty: schema.orderItems.qty })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, id));
      await transitionOrderItems(tx, items, 'reserved', 'none', id);
    }

    await tx
      .update(schema.inventoryLog)
      .set({ refOrderId: null })
      .where(eq(schema.inventoryLog.refOrderId, id));
    await tx.delete(schema.orders).where(eq(schema.orders.id, id));
  });
}
