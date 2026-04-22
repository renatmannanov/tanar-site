export const OUTDOOR_GRADIENTS = [
  'from-stone-600 to-stone-900',
  'from-emerald-800 to-stone-900',
  'from-slate-700 to-emerald-900',
  'from-amber-800 to-stone-900',
  'from-neutral-600 to-slate-900',
  'from-stone-500 to-emerald-800',
  'from-slate-600 to-stone-800',
  'from-emerald-700 to-slate-900',
  'from-amber-700 to-stone-800',
  'from-neutral-700 to-emerald-900',
] as const;

export type Gradient = typeof OUTDOOR_GRADIENTS[number];

export function gradientFromString(input: string): Gradient {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return OUTDOOR_GRADIENTS[Math.abs(hash) % OUTDOOR_GRADIENTS.length];
}
