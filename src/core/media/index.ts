// Server-side public API of the media module: types + DB read functions.
//
// IMPORTANT: this does NOT re-export ./store — store.ts pulls in sharp/node:fs,
// which must never reach a client bundle. Server actions import the writer
// (mediaStore) DIRECTLY from '@/core/media/store'. Client components import the
// MediaAsset type from '@/core/media/client'.
import { inArray, eq, asc } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type { MediaAsset } from './types';

export type { MediaAsset, MediaUploadInput, MediaStore } from './types';

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

/** All product images for one product, sorted by (variantId, sortOrder). */
export async function listProductImages(productId: string): Promise<MediaAsset[]> {
  const rows = await db
    .select()
    .from(schema.mediaAssets)
    .where(eq(schema.mediaAssets.productId, productId))
    .orderBy(asc(schema.mediaAssets.variantId), asc(schema.mediaAssets.sortOrder));
  return rows.map(mapAssetRow);
}

/**
 * Batch read for storefront lists (catalog/related/featured) — one query for
 * all products to avoid N+1. Sorted by (variantId, sortOrder). Empty input → [].
 */
export async function listProductImagesForProducts(
  productIds: string[],
): Promise<MediaAsset[]> {
  if (productIds.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.mediaAssets)
    .where(inArray(schema.mediaAssets.productId, productIds))
    .orderBy(asc(schema.mediaAssets.variantId), asc(schema.mediaAssets.sortOrder));
  return rows.map(mapAssetRow);
}
