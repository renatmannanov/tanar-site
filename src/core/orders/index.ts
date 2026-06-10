// Server-side public API of the orders module: order creation (storefront
// checkout) and admin reads/status updates. No node-only deps beyond the db
// client. Client components import types from '@/core/orders/client'.
import { z } from 'zod';
import { desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type {
  CreateOrderResult,
  OrderItemInput,
  OrderStatus,
  OrderView,
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
 * client-side cart snapshots are display-only). Stock is NOT checked or
 * reserved — availability is confirmed in the WhatsApp chat (Phase 2 adds
 * reservation here in one place).
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
  const unavailableSkuIds = skuIds.filter((id) => {
    const row = bySkuId.get(id);
    return !row || row.productStatus !== 'published';
  });
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
 * Admin-only status change — callers must requireAdmin first.
 *
 * PHASE 2 (stock/reserve) hooks in HERE. Planned mechanics (see
 * task_tracker/backlog/ARCHITECTURE-ecommerce.md «Как наличие считается»):
 *   pending   → confirmed: per item `skus.reservedQty += qty` (reserve)
 *   confirmed → done:      `stockQty -= qty; reservedQty -= qty` + inventory_log('sale')
 *   confirmed → cancelled: `reservedQty -= qty` + inventory_log('reservation_release')
 *   pending   → cancelled: no-op (nothing was reserved)
 * Each transition must run in ONE transaction with the status update, and be
 * idempotent against re-applying (compare old status inside the transaction).
 * deleteOrder of a confirmed order must release the reserve the same way.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<void> {
  const parsed = orderStatusSchema.parse(status);
  await db
    .update(schema.orders)
    .set({ status: parsed, updatedAt: new Date() })
    .where(eq(schema.orders.id, id));
}

/**
 * Admin-only order removal — callers must requireAdmin first. order_items go
 * via FK cascade. NOTE for Phase 2: deleting a `confirmed` order must first
 * release its reserve (see updateOrderStatus mechanics above).
 */
export async function deleteOrder(id: string): Promise<void> {
  await db.delete(schema.orders).where(eq(schema.orders.id, id));
}
