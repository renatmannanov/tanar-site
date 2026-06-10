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
        variant="secondary"
        disabled={pending}
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
        Удалить
      </ConfirmButton>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
