// Client-safe public API of the media module: types ONLY, NO sharp/fs/db.
// Import this from 'use client' components (e.g. VariantPhotos). Server code
// uses '@/core/media' (index.ts) which adds the DB read functions.
export type { MediaAsset, MediaUploadInput, MediaStore } from './types';
