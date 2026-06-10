'use client';

import { useState, useTransition } from 'react';
// Client component → types from the client barrel, never '@/core/orders'
// (the server barrel pulls postgres into the bundle and breaks the build).
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type StatusShortage,
} from '@/core/orders/client';
import { Select } from '@/components/admin/ui/Select';
import { updateOrderStatusAction } from './actions';

export default function OrderStatusSelect({
  orderId,
  initial,
}: {
  orderId: string;
  initial: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initial);
  // Last SUCCESSFULLY applied status — the select rolls back to it when the
  // server refuses a transition (e.g. not enough stock to confirm).
  const [prev, setPrev] = useState<OrderStatus>(initial);
  const [error, setError] = useState<string | undefined>();
  const [shortages, setShortages] = useState<StatusShortage[]>([]);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Select
        aria-label="Статус заказа"
        data-testid="order-status"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as OrderStatus;
          setStatus(next); // optimistic
          setError(undefined);
          setShortages([]);
          startTransition(async () => {
            const result = await updateOrderStatusAction(orderId, next);
            if (result.ok) {
              setPrev(next);
            } else {
              setStatus(prev); // roll back — nothing was written
              setError(result.error);
              setShortages(result.shortages ?? []);
            }
          });
        }}
      >
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
          <option key={value} value={value}>
            {ORDER_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      {error && (
        <div data-testid="status-error" className="mt-1 text-xs text-red-600">
          <p>{error}</p>
          {shortages.map((s) => (
            <p key={s.nameSnapshot}>
              {s.nameSnapshot} — нужно {s.requested}, доступно {s.available}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
