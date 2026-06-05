// Prompt templates for the three proven recipes. Transcribed verbatim from the
// Phase-A experiments (internal/docs/nano-banana-recipes.md) — these exact
// wordings are what worked; do not "improve" them without re-testing. nano-banana
// is conservative: short, head-on prompts beat long "keep everything" caveats.
import type { PhotoView } from './types';

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
  // front and side share the same prompt; the model infers the angle from input.
  const removal = view === 'side' ? BODY_REMOVAL : FRONT_BODY_REMOVAL;
  return [
    removal,
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
export function recolorFlatPrompt(hex: string, view: PhotoView): string {
  if (view === 'back') {
    return [
      `Change the garment fabric color to hex ${hex}.`,
      'Hood lining and cuffs stay as they are.',
    ].join('\n');
  }
  return [
    `Change the garment fabric color to hex ${hex}.`,
    'Logo and zippers stay their original color.',
  ].join('\n');
}

/**
 * Recipe 3 — recolor the garment directly on the lifestyle shot, keeping the
 * person, pose, and background. Tighter recrop is fine (better for a card).
 */
export function recolorLifestylePrompt(hex: string): string {
  return [
    `Change only the garment fabric color to hex ${hex}.`,
    'Keep the person, face, pose, other clothing, and the background exactly as they are.',
  ].join('\n');
}
