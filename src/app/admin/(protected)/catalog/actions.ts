'use server';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  ensureUniqueSlug,
  type ProductInput,
} from '@/core/catalog';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/require-admin';

export async function createProductAction(
  input: ProductInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  // Resolve slug collisions automatically (kurtka → kurtka-2 → ...). The admin
  // never edits the slug; it is auto-generated from the name and uniquified here.
  let finalSlug = input.slug;
  try {
    finalSlug = await ensureUniqueSlug(input.slug);
    await createProduct({ ...input, slug: finalSlug }); // zod-validates inside
  } catch (e) {
    // 23505 = unique_violation: a race between ensureUniqueSlug and insert (two
    // tabs). Rare for a single admin, but the UNIQUE constraint is the last word.
    if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
      return { error: 'Не удалось подобрать уникальный slug, попробуйте другое название.' };
    }
    return { error: e instanceof Error ? e.message : 'Ошибка создания' };
  }

  // OUTSIDE try/catch — redirect() throws a control-flow exception a catch would
  // swallow. Land on the new product's edit page, at its ACTUAL (uniquified) slug.
  revalidatePath('/admin/catalog');
  revalidatePath('/catalog');
  redirect(`/admin/catalog/${finalSlug}/edit`);
}

export async function deleteProductAction(
  slug: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    // Cascade removes variants/skus/media_assets rows. NOTE: image files in
    // public/images/products/<slug>/ are NOT removed (known orphan-files debt,
    // see progress.md) — disk is cheap, a cleanup hook can be added later.
    await deleteProduct(slug);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка удаления' };
  }

  // OUTSIDE try/catch — redirect throws a control-flow exception.
  revalidatePath('/admin/catalog');
  revalidatePath('/catalog');
  redirect('/admin/catalog');
}

export async function updateProductAction(
  slug: string,
  input: ProductInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  // slug is the route identifier, NOT editable by the form. Force routeSlug,
  // ignoring input.slug — otherwise updateProduct (productColumns writes
  // slug = input.slug) would "move" the product to a new slug and break URLs.
  const safeInput = { ...input, slug };

  try {
    await updateProduct(slug, safeInput); // zod-validates inside; throws on error
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }

  // OUTSIDE try/catch — redirect() throws a control-flow exception that a catch
  // would swallow, leaving the redirect dead. Storefront is force-dynamic; the
  // revalidatePath calls are belt-and-braces for the router cache.
  revalidatePath('/catalog');
  revalidatePath(`/catalog/${slug}`);
  revalidatePath('/admin/catalog');
  redirect('/admin/catalog');
}
