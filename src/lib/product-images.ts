// Server helpers to attach media_assets to storefront product lists without
// N+1: load all images for a set of products in ONE query, then index them.
import { listProductImagesForProducts, type MediaAsset } from '@/core/media';
import type { Product } from '@/core/catalog';

/** Groups a flat MediaAsset[] by productId. */
function byProduct(images: MediaAsset[]): Map<string, MediaAsset[]> {
  const map = new Map<string, MediaAsset[]>();
  for (const img of images) {
    if (!img.productId) continue;
    const list = map.get(img.productId) ?? [];
    list.push(img);
    map.set(img.productId, list);
  }
  return map;
}

/**
 * Picks the primary image for a product card: the first image (lowest
 * sortOrder) of the product's first variant that actually has photos.
 * `images` are sorted (variantId, sortOrder) by the read functions.
 */
function pickPrimary(product: Product, images: MediaAsset[]): MediaAsset | undefined {
  for (const variant of product.variants) {
    const first = images.find((img) => img.variantId === variant.variantId);
    if (first) return first;
  }
  return undefined;
}

/**
 * For a product list, returns a Map productId → primary MediaAsset. One DB
 * query for the whole list (no N+1). Products without photos are absent.
 */
export async function primaryImagesFor(
  products: Product[],
): Promise<Map<string, MediaAsset>> {
  if (products.length === 0) return new Map();
  const images = await listProductImagesForProducts(products.map((p) => p.id));
  const grouped = byProduct(images);
  const result = new Map<string, MediaAsset>();
  for (const product of products) {
    const primary = pickPrimary(product, grouped.get(product.id) ?? []);
    if (primary) result.set(product.id, primary);
  }
  return result;
}
