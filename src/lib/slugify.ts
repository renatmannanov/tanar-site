/**
 * Cyrillic → latin slug generator. Client-safe (no node/server imports) — used
 * in the admin ProductForm to auto-generate a slug from the product name.
 *
 * The transliteration table below is CANONICAL: e2e tests assert exact output
 * (e.g. "Тестовая Куртка X1" → "testovaya-kurtka-x1"). Do not change a mapping
 * without updating the tests that pin it.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
};

/**
 * Produces a URL-safe slug from arbitrary text. Lowercases, transliterates
 * Cyrillic, keeps `[a-z0-9]`, turns everything else into a hyphen, collapses
 * repeats and trims edge hyphens. Returns `''` when the input has no usable
 * characters (e.g. "®™ /") — the caller disables submit on an empty slug.
 *
 * The result, when non-empty, always matches `^[a-z0-9-]+$`.
 */
export function slugify(input: string): string {
  const lower = input.toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (ch in TRANSLIT) {
      out += TRANSLIT[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += '-';
    }
  }
  return out.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}
