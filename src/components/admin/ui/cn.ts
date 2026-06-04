// Tiny className joiner for admin UI primitives (no clsx dependency).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
