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
  /** True when produced by photogen (AI) — drives the "ИИ" badge/marker. */
  aiGenerated?: boolean;
  key?: string; // for site/blog scope
  alt?: string;
};

/**
 * Input for uploading a product image. `slug` builds the on-disk path
 * (public/images/products/<slug>/). productId/variantId bind the row.
 *
 * role/view/model default to a hand-uploaded lifestyle shot. AI-generated
 * photos (photogen) and explicit flat uploads pass them so the row is written
 * correctly in one INSERT — no follow-up UPDATE needed. (The "AI-generated"
 * marker itself is a separate column added in step 6.)
 */
export type MediaUploadInput = {
  scope: 'product';
  slug: string;
  productId: string;
  variantId: string;
  alt?: string;
  role?: 'lifestyle' | 'flat';
  view?: ProductImageView;
  model?: ProductImageModel | 'flat';
  /** True for AI-generated photos (photogen). Manual uploads omit / pass false. */
  aiGenerated?: boolean;
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
  /** One asset by id, or null. For server-side reads (e.g. photogen source). */
  get(id: string): Promise<MediaAsset | null>;
  /** Read the primary-width file of an asset off disk as bytes. */
  readFile(id: string): Promise<Uint8Array>;
  /** Flip an asset's role; keeps the variant's hasFlatShots flag in sync. */
  setRole(id: string, role: 'lifestyle' | 'flat'): Promise<void>;
  /** True if a photo already occupies the (variantId, role, view) slot. */
  slotTaken(
    variantId: string,
    role: 'lifestyle' | 'flat',
    view: ProductImageView,
  ): Promise<boolean>;
}
