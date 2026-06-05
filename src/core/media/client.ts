// Client-safe public API of the media module: types ONLY, NO sharp/fs/db.
// Import this from 'use client' components (e.g. VariantPhotos). Server code
// uses '@/core/media' (index.ts) which adds the DB read functions.
import type { MediaAsset } from './types';
import type { ProductImageView } from '@/core/contracts';

export type { MediaAsset, MediaUploadInput, MediaStore } from './types';

// Output widths the store produces (kept in sync with store.ts WIDTHS).
const WIDTHS = [400, 800, 1600] as const;
const PRIMARY_WIDTH = 1600;

/** Public URL of a given width, derived by convention from the 1600 url. */
export function urlForWidth(url1600: string, width: number): string {
  return url1600.replace(`-${PRIMARY_WIDTH}.webp`, `-${width}.webp`);
}

/** Builds a srcSet string (400w/800w/1600w) from a stored 1600 url. */
export function srcSetFromUrl(url1600: string): string {
  return WIDTHS.map((w) => `${urlForWidth(url1600, w)} ${w}w`).join(', ');
}

// ── Photo slots (6 per variant: role × view) ────────────────────────────────
// Each color (variant) has exactly 6 slots: lifestyle/flat × front/side/back.
// A slot is the pair (role, view); "occupied" = a media_asset row with that
// variantId + role + view exists. Slots guarantee role+view on every photo,
// which is what fixes the view=null bug (back-flat drawing a logo on the back).
// Pure types + functions — NO sharp/db, safe for the client bundle.

export type PhotoRole = 'lifestyle' | 'flat';

export type PhotoSlotKey =
  | 'life_front'
  | 'life_side'
  | 'life_back'
  | 'flat_front'
  | 'flat_side'
  | 'flat_back';

export type PhotoSlot = {
  key: PhotoSlotKey;
  role: PhotoRole;
  view: ProductImageView;
  /** Russian label shown on the empty-slot tile. */
  label: string;
};

/**
 * The 6 slots in display order: lifestyle row (front→side→back) then flat row.
 * This order also drives the storefront sort (life→flat, front→side→back) so
 * the admin grid and the gallery agree.
 */
export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  { key: 'life_front', role: 'lifestyle', view: 'front', label: 'Живое · спереди' },
  { key: 'life_side', role: 'lifestyle', view: 'side', label: 'Живое · сбоку' },
  { key: 'life_back', role: 'lifestyle', view: 'back', label: 'Живое · сзади' },
  { key: 'flat_front', role: 'flat', view: 'front', label: 'На белом · спереди' },
  { key: 'flat_side', role: 'flat', view: 'side', label: 'На белом · сбоку' },
  { key: 'flat_back', role: 'flat', view: 'back', label: 'На белом · сзади' },
] as const;

/**
 * Slot an asset belongs to, or null when it can't be placed (no view, or a
 * role/view we don't model). A null-slot asset is "outside the grid" — shown in
 * a separate fallback block so it doesn't silently disappear from the admin.
 */
export function slotOf(asset: MediaAsset): PhotoSlotKey | null {
  const role: PhotoRole = (asset.role ?? 'lifestyle') === 'flat' ? 'flat' : 'lifestyle';
  if (!asset.view) return null; // legacy / hand-uploaded without a view
  const match = PHOTO_SLOTS.find((s) => s.role === role && s.view === asset.view);
  return match ? match.key : null;
}

/**
 * Group a variant's assets by slot. Each slot holds at most one photo in this
 * step (replace/multiple come in step 6); if duplicates exist we keep them all
 * in the array and let the UI surface the first. Assets with slotOf===null are
 * excluded — render those from `assetsOutsideGrid`.
 */
export function assetsBySlot(
  assets: MediaAsset[],
): Record<PhotoSlotKey, MediaAsset[]> {
  const out = {
    life_front: [],
    life_side: [],
    life_back: [],
    flat_front: [],
    flat_side: [],
    flat_back: [],
  } as Record<PhotoSlotKey, MediaAsset[]>;
  for (const a of assets) {
    const key = slotOf(a);
    if (key) out[key].push(a);
  }
  return out;
}

/** Assets that don't fit any slot (no view / legacy) — shown out of grid. */
export function assetsOutsideGrid(assets: MediaAsset[]): MediaAsset[] {
  return assets.filter((a) => slotOf(a) === null);
}
