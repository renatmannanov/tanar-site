// photogen public API. Server-only (the default provider does network I/O).
// Each function: source image bytes + params → generated image Buffer. The
// provider is injectable (DI) — defaults to Gemini, swap for tests or other
// vendors. Recipes own the prompts; this layer just wires recipe → provider.
//
// Boundary: this module does NOT import @/core/media (or any Tanar domain). It
// is the reusable engine; the Tanar-specific glue (read media_asset → Buffer →
// here → mediaStore.upload) lives in the catalog server actions.
import { GeminiProvider } from './gemini';
import { FakeProvider } from './fake';
import type { ImageGenProvider } from './provider';
import {
  flatPrompt,
  recolorFlatPrompt,
  recolorLifestylePrompt,
} from './recipes';
import type { ImageBytes, PhotoView, RecolorLock } from './types';

export type { ImageGenProvider } from './provider';
export type { PhotoView, RecipeKind, ImageBytes, RecolorLock } from './types';
export { GeminiProvider } from './gemini';

/**
 * Default recolor geometry-lock strength, from PHOTOGEN_RECOLOR_LOCK ('soft' |
 * 'hard'). Default is 'hard' — A/B (2026-06-05) found soft≈hard in quality but
 * hard holds geometry a touch better on close-hue recolors, and the real driver
 * of glitches is source→target contrast, not lock strength (see recipes doc).
 * Set PHOTOGEN_RECOLOR_LOCK=soft to override. Anything but 'soft' → 'hard'.
 */
function defaultLock(): RecolorLock {
  return process.env.PHOTOGEN_RECOLOR_LOCK === 'soft' ? 'soft' : 'hard';
}

/**
 * Lazily construct the default provider so importing this module never throws.
 * PHOTOGEN_FAKE=1 swaps in a no-op provider — used by e2e so the generation
 * flow runs end-to-end without calling (or paying for) Gemini.
 */
function defaultProvider(): ImageGenProvider {
  return process.env.PHOTOGEN_FAKE === '1'
    ? new FakeProvider()
    : new GeminiProvider();
}

/** Recipe 1: lifestyle shot → studio flat on white, same angle. */
export function lifestyleToFlat(
  src: ImageBytes,
  opts: { view: PhotoView; provider?: ImageGenProvider },
): Promise<Buffer> {
  const provider = opts.provider ?? defaultProvider();
  return provider.editImage(src, flatPrompt(opts.view));
}

/** Recipe 2: an existing flat → the same flat recolored to `hex`. */
export function recolorFlat(
  src: ImageBytes,
  opts: {
    hex: string;
    view: PhotoView;
    lock?: RecolorLock;
    provider?: ImageGenProvider;
  },
): Promise<Buffer> {
  const provider = opts.provider ?? defaultProvider();
  const lock = opts.lock ?? defaultLock();
  return provider.editImage(src, recolorFlatPrompt(opts.hex, opts.view, lock));
}

/** Recipe 3: a lifestyle shot recolored to `hex`, keeping person/pose/bg. */
export function recolorLifestyle(
  src: ImageBytes,
  opts: { hex: string; lock?: RecolorLock; provider?: ImageGenProvider },
): Promise<Buffer> {
  const provider = opts.provider ?? defaultProvider();
  const lock = opts.lock ?? defaultLock();
  return provider.editImage(src, recolorLifestylePrompt(opts.hex, lock));
}
