'use client';

import { useState, useTransition } from 'react';
import type { OrderStatus } from '@/core/orders/client';
import { ConfirmButton } from '@/components/admin/ui/ConfirmButton';
import { deleteOrderAction } from './actions';

// Deleting moves stock differently per status — warn in the moment so the
// admin does not expect a done order's write-off to come back.
const DELETE_STOCK_NOTE: Partial<Record<OrderStatus, string>> = {
  confirmed: ' Резерв будет снят.',
  done: ' Списанный остаток на склад не вернётся.',
};

export default function DeleteOrderButton({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: number;
  status: OrderStatus;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <ConfirmButton
        variant="ghost"
        className="px-2 py-2 text-gray-400 hover:text-red-600"
        disabled={pending}
        aria-label={`Удалить заказ №${orderNumber}`}
        data-testid="delete-order"
        title={`Удалить заказ №${orderNumber}?`}
        description={`Заказ и его позиции будут удалены безвозвратно.${DELETE_STOCK_NOTE[status] ?? ''}`}
        onConfirm={() => {
          setError(undefined);
          startTransition(async () => {
            const result = await deleteOrderAction(orderId);
            if (result.error) setError(result.error);
          });
        }}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </ConfirmButton>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
