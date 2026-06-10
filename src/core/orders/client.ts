// Client-safe public API of the orders module: types ONLY, NO db.
// Import this from 'use client' components (checkout panel, admin status
// select). Server code uses '@/core/orders' (index.ts) which adds the DB
// read/write functions.

export type OrderStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Новый',
  confirmed: 'Подтверждён',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

export type OrderItemInput = { skuId: string; qty: number };

export type OrderItemView = {
  id: string;
  nameSnapshot: string;
  priceSnapshot: number;
  qty: number;
};

export type OrderView = {
  id: string;
  number: number;
  status: OrderStatus;
  total: number;
  createdAt: string; // ISO — Date does not serialize into client props
  items: OrderItemView[];
};

export type CreateOrderResult =
  | { ok: true; order: OrderView }
  | { ok: false; error: string; unavailableSkuIds?: string[] };

/** Per-position stock shortage surfaced to the admin status select. */
export type StatusShortage = {
  nameSnapshot: string;
  requested: number;
  available: number;
};

export type UpdateOrderStatusResult =
  | { ok: true }
  | { ok: false; error: string; shortages?: StatusShortage[] };
