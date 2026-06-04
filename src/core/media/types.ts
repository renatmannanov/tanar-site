// Media domain types. Pure type-level — NO sharp/fs/db imports, so this module
// is safe to pull into a client bundle (re-exported from both index.ts and
// client.ts). Mirrors the media_assets table (read projection).
import type {
  MediaScope,
  ProductImageView,
  ProductImageModel,
} from '@/core/contracts';

/** Stored image asset. Mirrors the media_assets table (read projection). */
export type MediaAsset = {
  id: string;
  scope: MediaScope; // 'product' | 'site' | 'blog'
  url: string;
  sortOrder: number;
  productId?: string;
  variantId?: string;
  view?: ProductImageView;
  model?: ProductImageModel | 'flat';
  role?: 'lifestyle' | 'flat';
  key?: string; // for site/blog scope
  alt?: string;
};

/**
 * Input for uploading a product image. `slug` builds the on-disk path
 * (public/images/products/<slug>/). productId/variantId bind the row.
 */
export type MediaUploadInput = {
  scope: 'product';
  slug: string;
  productId: string;
  variantId: string;
  alt?: string;
};

/**
 * Port for media storage. Implementation (sharp pipeline → public/, DB row)
 * lives in ./store. Defined here so callers can type against it.
 */
export interface MediaStore {
  list(filter: { scope: MediaScope; productId?: string }): Promise<MediaAsset[]>;
  upload(file: Uint8Array, input: MediaUploadInput): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
  reorder(items: { id: string; sortOrder: number }[]): Promise<void>;
}
