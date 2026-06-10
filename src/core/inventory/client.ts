// Client-safe public API of the inventory module: availability math and the
// stock-level traffic light. NO db imports — 'use client' components import
// this entry; server code uses '@/core/inventory' (index.ts).

export type StockLevel = 'high' | 'medium' | 'low' | 'out';

// Пороги зафиксированы заказчиком 2026-06-11: «больше 10 / 9–3 / меньше 3»;
// значение 10 отнесено к зелёному. Менять — только эти константы.
export const STOCK_LEVEL_HIGH_MIN = 10;
export const STOCK_LEVEL_MEDIUM_MIN = 3;

/** Units a customer can actually order right now. */
export function availableQty(sku: {
  stockQty: number;
  reservedQty: number;
}): number {
  return sku.stockQty - sku.reservedQty;
}

export function stockLevel(available: number): StockLevel {
  if (available >= STOCK_LEVEL_HIGH_MIN) return 'high';
  if (available >= STOCK_LEVEL_MEDIUM_MIN) return 'medium';
  if (available >= 1) return 'low';
  return 'out';
}
