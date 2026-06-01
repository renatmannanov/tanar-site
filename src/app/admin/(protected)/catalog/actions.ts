'use server';

import { createProduct, updateProduct, type ProductInput } from '@/core/catalog';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/require-admin';

export async function createProductAction(
  input: ProductInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    await createProduct(input); // zod-validates inside (incl. slug pattern)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка создания' };
  }

  // OUTSIDE try/catch — redirect() throws a control-flow exception a catch would
  // swallow. Land on the new product's edit page (where photos are uploaded).
  revalidatePath('/admin/catalog');
  revalidatePath('/catalog');
  redirect(`/admin/catalog/${input.slug}/edit`);
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
