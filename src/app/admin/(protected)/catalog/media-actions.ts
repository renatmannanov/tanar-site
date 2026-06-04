'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
// Import the writer DIRECTLY from store (NOT @/core/media) — store.ts pulls in
// sharp/node:fs and must never reach a client bundle via the index barrel.
import { mediaStore } from '@/core/media/store';

/**
 * Upload one variant image. Files travel via FormData (a controlled
 * ProductForm state can't hold a File), so this is a separate action invoked
 * straight from VariantPhotos — independent of the product-fields form.
 * No redirect: we stay on the edit page; revalidate refreshes the gallery.
 */
export async function uploadVariantImageAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();

  const file = formData.get('file');
  const slug = formData.get('slug');
  const productId = formData.get('productId');
  const variantId = formData.get('variantId');

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Файл не выбран' };
  }
  if (
    typeof slug !== 'string' ||
    typeof productId !== 'string' ||
    typeof variantId !== 'string'
  ) {
    return { error: 'Некорректные данные формы' };
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    await mediaStore.upload(buf, {
      scope: 'product',
      slug,
      productId,
      variantId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка загрузки' };
  }

  revalidatePath(`/admin/catalog/${slug}/edit`);
  revalidatePath(`/catalog/${slug}`);
  return {};
}

export async function removeVariantImageAction(
  id: string,
  slug: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await mediaStore.remove(id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка удаления' };
  }
  revalidatePath(`/admin/catalog/${slug}/edit`);
  revalidatePath(`/catalog/${slug}`);
  return {};
}

export async function reorderVariantImagesAction(
  items: { id: string; sortOrder: number }[],
  slug: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await mediaStore.reorder(items);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сортировки' };
  }
  revalidatePath(`/admin/catalog/${slug}/edit`);
  revalidatePath(`/catalog/${slug}`);
  return {};
}
