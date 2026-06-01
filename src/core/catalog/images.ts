// @deprecated — convention-based image paths ({view}-{model}-...webp). The
// storefront now reads real images from media_assets (see @/core/media and
// @/lib/product-images); these helpers have no live consumers. Kept (not
// deleted) so the convention-based demo folders in public/images/products/
// and the GalleryShot type remain available. Remove once those are gone.
import type { Product, ProductImageModel, ProductImageView, GalleryShot } from './types';

const PRODUCT_IMAGE_BASE = '/images/products';

/** Builds the path to a single product image variant file. */
export function productImagePath(slug: string, color: string, file: string): string {
  return `${PRODUCT_IMAGE_BASE}/${slug}/${color}/${file}`;
}

export function getProductCardImage(
  slug: string,
  color: string,
  model: ProductImageModel,
): { md: string; lg: string } {
  return {
    md: productImagePath(slug, color, `front-${model}-card-md.webp`),
    lg: productImagePath(slug, color, `front-${model}-card-lg.webp`),
  };
}

export function getProductGalleryShots(product: Product, color: string): GalleryShot[] {
  const variant = product.variants.find((v) => v.id === color);
  if (!variant) return [];
  const views: ProductImageView[] = ['front', 'side', 'back'];
  const viewLabel = (v: ProductImageView) =>
    v === 'front' ? 'спереди' : v === 'side' ? 'сбоку' : 'сзади';
  const shots: GalleryShot[] = [];

  // Lifestyle (with model, in nature) shots first
  for (const model of variant.models) {
    for (const view of views) {
      shots.push({
        view,
        model,
        src: productImagePath(product.slug, color, `${view}-${model}-full-lg.webp`),
        alt: `${product.name} — ${variant.label}, ${viewLabel(view)}`,
      });
    }
  }

  // Flat (studio, white background) shots after lifestyle
  if (variant.hasFlatShots) {
    for (const view of views) {
      shots.push({
        view,
        model: 'flat',
        src: productImagePath(product.slug, color, `${view}-flat-full-lg.webp`),
        alt: `${product.name} — ${variant.label}, студийное фото, ${viewLabel(view)}`,
      });
    }
  }

  return shots;
}
