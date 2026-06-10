'use client';

import { useState, useTransition } from 'react';
import { ConfirmButton } from '@/components/admin/ui/ConfirmButton';
import { deleteOrderAction } from './actions';

export default function DeleteOrderButton({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: number;
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
        description="Заказ и его позиции будут удалены безвозвратно."
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
