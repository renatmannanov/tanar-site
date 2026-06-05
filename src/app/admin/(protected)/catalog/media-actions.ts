'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
// Import the writer DIRECTLY from store (NOT @/core/media) — store.ts pulls in
// sharp/node:fs and must never reach a client bundle via the index barrel.
import { mediaStore } from '@/core/media/store';
import {
  lifestyleToFlat,
  recolorFlat,
  recolorLifestyle,
  type PhotoView,
} from '@/core/photogen';

type PhotoRole = 'lifestyle' | 'flat';
const ROLES: readonly PhotoRole[] = ['lifestyle', 'flat'];
const VIEWS: readonly PhotoView[] = ['front', 'side', 'back'];

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
  const roleRaw = formData.get('role');
  const viewRaw = formData.get('view');

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

  // role/view come from the clicked slot. Validate against the known unions so
  // the photo lands in the right slot (a flat with view='back' is what fixes
  // the back-flat logo bug). Default to a plain lifestyle shot if absent.
  const role: PhotoRole =
    typeof roleRaw === 'string' && ROLES.includes(roleRaw as PhotoRole)
      ? (roleRaw as PhotoRole)
      : 'lifestyle';
  const view: PhotoView | undefined =
    typeof viewRaw === 'string' && VIEWS.includes(viewRaw as PhotoView)
      ? (viewRaw as PhotoView)
      : undefined;

  // Guard: never write two photos into the same (variantId, role, view) slot.
  // The UI hides the tile for an occupied slot, but a double-click or race
  // could still slip through. Replace goes through the explicit step-6 flow.
  if (view && (await mediaStore.slotTaken(variantId, role, view))) {
    return { error: 'Слот уже занят' };
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    await mediaStore.upload(buf, {
      scope: 'product',
      slug,
      productId,
      variantId,
      role,
      view,
      ...(role === 'flat' ? { model: 'flat' as const } : {}),
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

/**
 * Mark an existing photo as flat or lifestyle. Hand-uploaded photos default to
 * lifestyle; this lets the owner tag a manually-uploaded studio shot as flat so
 * recolor-flat can use it as a source (the minimal fix from the plan).
 */
export async function setVariantImageRoleAction(
  id: string,
  role: 'lifestyle' | 'flat',
  slug: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await mediaStore.setRole(id, role);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка смены типа фото' };
  }
  revalidatePath(`/admin/catalog/${slug}/edit`);
  revalidatePath(`/catalog/${slug}`);
  return {};
}

// ── AI photo generation (photogen) ──────────────────────────────────────────
// Each action is the Tanar-specific glue: read a source media_asset off disk →
// run a photogen recipe (domain-agnostic engine) → upload the result bound to
// the TARGET variant with the correct role/view. The view is inherited from the
// source asset — the admin never picks an angle, so a front can't be passed off
// as a back. revalidate refreshes the gallery; nothing publishes automatically
// (preview/approve is layered on in step 6).

/** Shared params identifying where the generated photo lands. */
type GenTarget = {
  /** Source media_asset id to feed the recipe. */
  sourceId: string;
  /** Variant the NEW photo attaches to (same as source for flat). */
  variantId: string;
  slug: string;
  productId: string;
};

/** Resolve the source asset + its file bytes, with a friendly error. */
async function loadSource(sourceId: string) {
  const source = await mediaStore.get(sourceId);
  if (!source) return { error: 'Исходное фото не найдено' as const };
  const bytes = await mediaStore.readFile(sourceId);
  return { source, bytes };
}

/**
 * Recipe 1 — lifestyle shot of this variant → studio flat on white, same view.
 * Source must be a lifestyle photo of the SAME variant.
 */
export async function generateFlatAction(
  target: GenTarget,
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const view = (loaded.source.view ?? 'front') as PhotoView;

    const result = await lifestyleToFlat(loaded.bytes, { view });
    await mediaStore.upload(new Uint8Array(result), {
      scope: 'product',
      slug: target.slug,
      productId: target.productId,
      variantId: target.variantId,
      role: 'flat',
      view,
      model: 'flat',
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
  revalidatePath(`/admin/catalog/${target.slug}/edit`);
  revalidatePath(`/catalog/${target.slug}`);
  return {};
}

/**
 * Recipe 2 — an existing flat (of ANOTHER variant) recolored to this variant's
 * hex. Source must be a flat photo; result is a flat of the target variant.
 */
export async function recolorFlatAction(
  target: GenTarget & { hex: string },
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const view = (loaded.source.view ?? 'front') as PhotoView;

    const result = await recolorFlat(loaded.bytes, { hex: target.hex, view });
    await mediaStore.upload(new Uint8Array(result), {
      scope: 'product',
      slug: target.slug,
      productId: target.productId,
      variantId: target.variantId,
      role: 'flat',
      view,
      model: 'flat',
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
  revalidatePath(`/admin/catalog/${target.slug}/edit`);
  revalidatePath(`/catalog/${target.slug}`);
  return {};
}

/**
 * Recipe 3 — a lifestyle shot (of ANOTHER variant) recolored to this variant's
 * hex, keeping person/pose/background. Result is a lifestyle of the target.
 */
export async function recolorLifestyleAction(
  target: GenTarget & { hex: string },
): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const view = (loaded.source.view ?? 'front') as PhotoView;

    const result = await recolorLifestyle(loaded.bytes, { hex: target.hex });
    await mediaStore.upload(new Uint8Array(result), {
      scope: 'product',
      slug: target.slug,
      productId: target.productId,
      variantId: target.variantId,
      role: 'lifestyle',
      view,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
  revalidatePath(`/admin/catalog/${target.slug}/edit`);
  revalidatePath(`/catalog/${target.slug}`);
  return {};
}
