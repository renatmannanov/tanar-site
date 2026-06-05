// photogen — reusable AI image-generation engine. Domain-agnostic: knows
// nothing about Tanar's DB, sharp pipeline, slugs, or media_assets. The unit of
// exchange is bytes in → bytes out. Copy this folder into another project and
// it works with only a GEMINI_API_KEY.
//
// Pure type-level module — no SDK/runtime imports, safe to share anywhere.

/** Product photo angle. Source view is inherited by the generated result. */
export type PhotoView = 'front' | 'side' | 'back';

/** The three proven recipes (see internal/docs/nano-banana-recipes.md). */
export type RecipeKind = 'flat' | 'recolor-flat' | 'recolor-lifestyle';

/**
 * How hard a recolor prompt tries to freeze the garment geometry.
 * - 'soft': short prompt + one "keep shape/seams, change only hue" line.
 * - 'hard': strong pixel-faithful lock (more preservation, but Phase-A warns it
 *   can make nano-banana ignore the recolor entirely — A/B test before trusting).
 * Default is resolved from PHOTOGEN_RECOLOR_LOCK at the index layer.
 */
export type RecolorLock = 'soft' | 'hard';

/** Raw image bytes. Input accepts any byte view; output is always a Buffer. */
export type ImageBytes = Uint8Array;
