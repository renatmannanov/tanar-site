'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteOrder,
  updateOrderStatus,
  type OrderStatus,
  type UpdateOrderStatusResult,
} from '@/core/orders';
import { requireAdmin } from '@/lib/require-admin';

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  await requireAdmin();
  let result: UpdateOrderStatusResult;
  try {
    result = await updateOrderStatus(id, status);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Ошибка сохранения',
    };
  }
  if (result.ok) revalidatePath('/admin/orders');
  return result;
}

export async function deleteOrderAction(
  id: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await deleteOrder(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка удаления' };
  }
  revalidatePath('/admin/orders');
  return {};
}
