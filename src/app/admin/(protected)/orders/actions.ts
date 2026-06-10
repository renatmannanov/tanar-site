'use server';

import { revalidatePath } from 'next/cache';
import { updateOrderStatus, type OrderStatus } from '@/core/orders';
import { requireAdmin } from '@/lib/require-admin';

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await updateOrderStatus(id, status);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }
  revalidatePath('/admin/orders');
  return {};
}
