// Server-side public API of the media module: types + DB read functions.
//
// IMPORTANT: this does NOT re-export ./store — store.ts pulls in sharp/node:fs,
// which must never reach a client bundle. Server actions import the writer
// (mediaStore) DIRECTLY from '@/core/media/store'. Client components import the
// MediaAsset type from '@/core/media/client'.
import { inArray, eq } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type { MediaAsset } from './types';

export type { MediaAsset, MediaUploadInput, MediaStore } from './types';

// Storefront photo order within a variant: lifestyle before flat, then
// front→side→back, then sortOrder as a tiebreaker. Mirrors PHOTO_SLOTS order
// (client.ts) so the admin grid and the gallery agree. Kept here (server) to
// avoid importing the client module; the two orderings must stay in sync.
const ROLE_RANK: Record<string, number> = { lifestyle: 0, flat: 1 };
const VIEW_RANK: Record<string, number> = { front: 0, side: 1, back: 2 };

function slotRank(a: MediaAsset): [number, number] {
  return [ROLE_RANK[a.role ?? 'lifestyle'] ?? 0, VIEW_RANK[a.view ?? 'front'] ?? 0];
}

/** Sort assets in slot order (life→flat, front→side→back, then sortOrder). */
function sortBySlot(assets: MediaAsset[]): MediaAsset[] {
  return assets.sort((a, b) => {
    if ((a.variantId ?? '') !== (b.variantId ?? '')) {
      return (a.variantId ?? '').localeCompare(b.variantId ?? '');
    }
    const [ar, av] = slotRank(a);
    const [br, bv] = slotRank(b);
    return ar - br || av - bv || a.sortOrder - b.sortOrder;
  });
}

function mapAssetRow(row: typeof schema.mediaAssets.$inferSelect): MediaAsset {
  return {
    id: row.id,
    scope: row.scope as MediaAsset['scope'],
    url: row.url,
    sortOrder: row.sortOrder,
    productId: row.productId ?? undefined,
    variantId: row.variantId ?? undefined,
    view: (row.view as MediaAsset['view']) ?? undefined,
    model: (row.model as MediaAsset['model']) ?? undefined,
    role: (row.role as MediaAsset['role']) ?? undefined,
    key: row.key ?? undefined,
    alt: row.alt ?? undefined,
  };
}

/**
 * All product images for one product, sorted in slot order (life→flat,
 * front→side→back, then sortOrder). The admin groups by slot itself so the
 * order is moot for it; the storefront gallery relies on this order.
 */
export async function listProductImages(productId: string): Promise<MediaAsset[]> {
  const rows = await db
    .select()
    .from(schema.mediaAssets)
    .where(eq(schema.mediaAssets.productId, productId));
  return sortBySlot(rows.map(mapAssetRow));
}

/**
 * Batch read for storefront lists (catalog/related/featured) — one query for
 * all products to avoid N+1. Sorted in slot order (see listProductImages).
 * Empty input → [].
 */
export async function listProductImagesForProducts(
  productIds: string[],
): Promise<MediaAsset[]> {
  if (productIds.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.mediaAssets)
    .where(inArray(schema.mediaAssets.productId, productIds));
  return sortBySlot(rows.map(mapAssetRow));
}
