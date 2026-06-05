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

// ── AI photo generation (photogen) — two-phase: generate → approve ───────────
// Step 6 splits generation in two so NOTHING is written until the owner approves
// (the main guard against bad AI photos): generate* reads the source, runs a
// photogen recipe, and returns the result as a base64 data-URL — no disk/DB
// write. The client holds the preview; on "Оставить" it calls approveGenerated*
// which decodes the bytes and uploads (aiGenerated=true). "Отмена" = the client
// drops the data-URL; nothing was persisted. The view is taken from the TARGET
// slot (back-flat logo fix), not the source.

/** Shared params identifying what to generate and where it will land. */
type GenTarget = {
  /** Source media_asset id to feed the recipe. */
  sourceId: string;
  /** Variant the NEW photo attaches to (same as source for flat). */
  variantId: string;
  /** Target slot's view — drives the recipe angle (back-flat logo fix). */
  view: PhotoView;
  slug: string;
  productId: string;
};

/** Result of a generate* action: a preview to show, plus role to persist. */
type GenPreview = {
  error?: string;
  /** data:image/webp;base64,… — held by the client, never written until approve. */
  previewDataUrl?: string;
  /** Role the approved photo gets (recipe 1/2 → flat, recipe 3 → lifestyle). */
  role?: 'lifestyle' | 'flat';
};

/** Resolve the source asset + its file bytes, with a friendly error. */
async function loadSource(sourceId: string) {
  const source = await mediaStore.get(sourceId);
  if (!source) return { error: 'Исходное фото не найдено' as const };
  const bytes = await mediaStore.readFile(sourceId);
  return { source, bytes };
}

// ── Generation limit (off by default) ────────────────────────────────────────
// A soft ceiling on Gemini calls, controlled by PHOTOGEN_DAILY_LIMIT. Unset or
// non-positive → unlimited (the default). This is a per-process counter (resets
// on restart) — a minimal brake, not a billing-grade quota. To enable, set the
// env var (e.g. PHOTOGEN_DAILY_LIMIT=50). Kept here so it wraps every recipe.
let generationCount = 0;
function generationLimitReached(): boolean {
  const raw = Number(process.env.PHOTOGEN_DAILY_LIMIT);
  if (!Number.isFinite(raw) || raw <= 0) return false; // disabled
  return generationCount >= raw;
}

/** Run a recipe to bytes → return a base64 data-URL preview (no persistence). */
function toDataUrl(buf: Buffer): string {
  return `data:image/webp;base64,${buf.toString('base64')}`;
}

/** Recipe 1 — lifestyle of this variant → studio flat on white, same view. */
export async function generateFlatAction(target: GenTarget): Promise<GenPreview> {
  await requireAdmin();
  try {
    if (generationLimitReached()) return { error: 'Достигнут лимит генераций' };
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const result = await lifestyleToFlat(loaded.bytes, { view: target.view });
    generationCount++;
    return { previewDataUrl: toDataUrl(result), role: 'flat' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
}

/** Recipe 2 — an existing flat (another variant) recolored to this hex. */
export async function recolorFlatAction(
  target: GenTarget & { hex: string },
): Promise<GenPreview> {
  await requireAdmin();
  try {
    if (generationLimitReached()) return { error: 'Достигнут лимит генераций' };
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const result = await recolorFlat(loaded.bytes, {
      hex: target.hex,
      view: target.view,
    });
    generationCount++;
    return { previewDataUrl: toDataUrl(result), role: 'flat' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
}

/** Recipe 3 — a lifestyle (another variant) recolored to this hex. */
export async function recolorLifestyleAction(
  target: GenTarget & { hex: string },
): Promise<GenPreview> {
  await requireAdmin();
  try {
    if (generationLimitReached()) return { error: 'Достигнут лимит генераций' };
    const loaded = await loadSource(target.sourceId);
    if ('error' in loaded) return loaded;
    const result = await recolorLifestyle(loaded.bytes, { hex: target.hex });
    generationCount++;
    return { previewDataUrl: toDataUrl(result), role: 'lifestyle' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка генерации' };
  }
}

/**
 * Persist an approved generation. Called ONLY on "Оставить": decodes the preview
 * data-URL and uploads it as an AI photo into the target slot.
 *  - replaceId set → replace flow: upload new, then remove the old asset (new
 *    first so a failure never leaves the slot empty).
 *  - replaceId absent → empty-slot flow: slotTaken guard rejects a duplicate
 *    (double-click / race).
 */
export async function approveGeneratedAction(input: {
  previewDataUrl: string;
  variantId: string;
  view: PhotoView;
  role: 'lifestyle' | 'flat';
  slug: string;
  productId: string;
  /** When replacing an occupied slot, the asset id to delete after upload. */
  replaceId?: string;
}): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    const m = /^data:image\/\w+;base64,([\s\S]+)$/.exec(input.previewDataUrl);
    if (!m) return { error: 'Некорректное превью' };
    const bytes = new Uint8Array(Buffer.from(m[1], 'base64'));

    if (!input.replaceId) {
      const taken = await mediaStore.slotTaken(
        input.variantId,
        input.role,
        input.view,
      );
      if (taken) return { error: 'Слот уже занят' };
    }

    await mediaStore.upload(bytes, {
      scope: 'product',
      slug: input.slug,
      productId: input.productId,
      variantId: input.variantId,
      role: input.role,
      view: input.view,
      aiGenerated: true,
      ...(input.role === 'flat' ? { model: 'flat' as const } : {}),
    });

    if (input.replaceId) await mediaStore.remove(input.replaceId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }
  revalidatePath(`/admin/catalog/${input.slug}/edit`);
  revalidatePath(`/catalog/${input.slug}`);
  return {};
}
