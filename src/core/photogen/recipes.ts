// Prompt templates for the three proven recipes. Transcribed verbatim from the
// Phase-A experiments (internal/docs/nano-banana-recipes.md) — these exact
// wordings are what worked; do not "improve" them without re-testing. nano-banana
// is conservative: short, head-on prompts beat long "keep everything" caveats.
import type { PhotoView, RecolorLock } from './types';

// Geometry-preservation clause appended to recolor prompts. 'soft' is one line
// (safe — keeps the recolor working); 'hard' piles on pixel-faithful language
// (stronger preservation, but Phase-A warns long "keep identical" caveats can
// make nano-banana skip the recolor — A/B before trusting). recolor-lifestyle
// drifts more (it resynthesizes the whole scene), so it's the main target.
const SOFT_LOCK =
  'Keep the exact same shape, cut, volume, seams, stitching, zippers and the ' +
  'folds/wrinkles — change ONLY the fabric hue.';
const HARD_LOCK =
  'Recolor ONLY. Keep the garment pixel-identical: same silhouette, volume, cut, ' +
  'seams, stitching, zippers, hardware, pockets, and every fold and wrinkle in the ' +
  'exact same place. Do NOT redraw, restyle, reshape, or re-pose the garment. ' +
  'The ONLY change is the fabric hue.';

function lockClause(lock: RecolorLock): string {
  return lock === 'hard' ? HARD_LOCK : SOFT_LOCK;
}

// front removes the person cleanly with "remove the person"; side/back leave the
// head/hands behind unless every body part is named explicitly (Phase-A lesson).
const BODY_REMOVAL =
  'Remove the ENTIRE person — head, face, cap, sunglasses, hands, legs (and pants) — ' +
  'and the background. No human body parts visible anywhere. The empty hood keeps its shape.';

const FRONT_BODY_REMOVAL = 'Remove the person and the background.';

/**
 * Recipe 1 — lifestyle → studio flat (same garment, no person, white bg).
 * back needs an explicit "this is a back view / no front details" signal, else
 * the model regenerates a front and hallucinates a logo on the back.
 */
export function flatPrompt(view: PhotoView): string {
  if (view === 'back') {
    return [
      'This is a BACK VIEW of the garment.',
      BODY_REMOVAL,
      'Show only the garment from behind as a flat product shot, worn by an invisible',
      'body to keep its natural shape and proportions. The back has NO front zipper,',
      'NO chest logo, NO front pockets visible — only the back panel, the back of the',
      'hood, shoulder seams, and back yoke if present.',
      'Pure white seamless studio background. Soft even lighting, no harsh shadows.',
      'Keep exactly the same color, fabric texture, and seam placement as the original.',
      'Centered composition. Do NOT generate a front view. Do NOT add any logo or text on the back.',
    ].join(' ');
  }
  if (view === 'side') {
    // Without an explicit "side view" signal nano-banana regenerates a FRONT
    // (same failure mode that back had). Pin the profile angle hard and forbid
    // turning the garment to face the camera.
    return [
      'This is a SIDE (PROFILE) VIEW of the garment.',
      BODY_REMOVAL,
      'Show only the garment from the side as a flat product shot, worn by an invisible',
      'body to keep its natural shape and proportions. Keep the EXACT same profile angle',
      'as the input — one sleeve facing the camera, the front edge (zipper) on one side',
      'and the back panel on the other. Do NOT rotate the garment to face the camera.',
      'Do NOT generate a front view. The full front zipper must NOT be shown flat-on;',
      'only its edge is visible in profile.',
      'Pure white seamless studio background. Soft even lighting, no harsh shadows.',
      'Keep exactly the same color, fabric texture, zippers, logo, seams, cuffs, hood —',
      'pixel-faithful. Centered composition.',
    ].join(' ');
  }
  // front: the model infers the head-on angle from the input.
  return [
    FRONT_BODY_REMOVAL,
    'Show only the garment as a flat product shot, worn by an invisible body to keep',
    'its natural shape and proportions. The garment has a STRAIGHT, RELAXED, UNISEX cut —',
    'NOT tapered or fitted at the waist; roughly the same width at chest, waist and hem.',
    'Sleeves hang straight down.',
    'Pure white seamless studio background. Soft even lighting, no harsh shadows.',
    'Keep the exact garment: identical color, fabric texture, zippers, logo, seams,',
    'cuffs, hood — pixel-faithful. Centered composition.',
  ].join(' ');
}

/**
 * Recipe 2 — recolor a studio flat to a new hex. Short and head-on: long
 * "keep everything identical" caveats make nano-banana leave the color unchanged.
 * back: don't mention "back view" (already in the image) — just guard the trim.
 */
export function recolorFlatPrompt(
  hex: string,
  view: PhotoView,
  lock: RecolorLock = 'soft',
): string {
  if (view === 'back') {
    return [
      `Change the garment fabric color to hex ${hex}.`,
      'Hood lining and cuffs stay as they are.',
      lockClause(lock),
    ].join('\n');
  }
  return [
    `Change the garment fabric color to hex ${hex}.`,
    'Logo and zippers stay their original color.',
    lockClause(lock),
  ].join('\n');
}

/**
 * Recipe 3 — recolor the garment directly on the lifestyle shot, keeping the
 * person, pose, and background. Tighter recrop is fine (better for a card).
 * This recipe drifts the most (whole scene resynthesized) — the lock clause
 * matters here above all.
 */
export function recolorLifestylePrompt(
  hex: string,
  lock: RecolorLock = 'soft',
): string {
  return [
    `Change only the garment fabric color to hex ${hex}.`,
    'Keep the person, face, pose, other clothing, and the background exactly as they are.',
    lockClause(lock),
  ].join('\n');
}
