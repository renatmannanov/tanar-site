'use server';

import { revalidatePath } from 'next/cache';
import {
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
} from '@/core/site';
import { requireAdmin } from '@/lib/require-admin';

function revalidate() {
  revalidatePath('/admin/faq');
  revalidatePath('/faq');
}

export async function createFaqItemAction(input: {
  question: string;
  answer: string;
  sortOrder: number;
}): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await createFaqItem(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка добавления' };
  }
  revalidate();
  return {};
}

export async function updateFaqItemAction(
  id: string,
  input: { question: string; answer: string; sortOrder: number },
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await updateFaqItem(id, input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }
  revalidate();
  return {};
}

export async function deleteFaqItemAction(
  id: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await deleteFaqItem(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка удаления' };
  }
  revalidate();
  return {};
}
