// Client-safe public API of the media module: types ONLY, NO sharp/fs/db.
// Import this from 'use client' components (e.g. VariantPhotos). Server code
// uses '@/core/media' (index.ts) which adds the DB read functions.
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
