// Public API of the media module. Other code must import only from here.
//
// Contract skeleton: types and ports only. The real implementation (sharp
// pipeline → public/, media_assets rows) lands in Plan C; the admin media-picker
// (Plan B) types against the MediaStore port defined here.
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

/** Input for uploading/registering an asset. File handling lands in Plan C. */
export type MediaUploadInput = {
  scope: MediaScope;
  productId?: string;
  variantId?: string;
  key?: string;
  alt?: string;
};

/**
 * Port for media storage. Implementation (sharp pipeline → public/, DB row)
 * lands in Plan C. Defined here so the admin media-picker (Plan B) can type
 * against it before the backend exists.
 */
export interface MediaStore {
  list(filter: { scope: MediaScope; productId?: string }): Promise<MediaAsset[]>;
  upload(file: Uint8Array, input: MediaUploadInput): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
}
