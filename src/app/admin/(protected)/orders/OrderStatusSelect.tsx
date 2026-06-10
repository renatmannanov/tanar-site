'use client';

import { useState, useTransition } from 'react';
// Client component → types from the client barrel, never '@/core/orders'
// (the server barrel pulls postgres into the bundle and breaks the build).
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/core/orders/client';
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
  const [error, setError] = useState<string | undefined>();
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
          setStatus(next);
          setError(undefined);
          startTransition(async () => {
            const result = await updateOrderStatusAction(orderId, next);
            if (result.error) setError(result.error);
          });
        }}
      >
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
          <option key={value} value={value}>
            {ORDER_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
