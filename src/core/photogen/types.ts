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

/** Raw image bytes. Input accepts any byte view; output is always a Buffer. */
export type ImageBytes = Uint8Array;
