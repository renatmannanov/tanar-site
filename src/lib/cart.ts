// Cart types and pure logic (no React). The single home of CartItem — cart
// components import from here. Storage is localStorage; the cart lives only
// in the browser.

export type CartItem = {
  skuId: string; // position key (product × color × size)
  productId: string;
  slug: string;
  name: string; // snapshots below are display-only;
  colorId: string; // checkout re-reads prices/names from the DB
  colorLabel: string;
  size: string;
  ruSize?: string;
  price: number; // KZT, whole units
  qty: number; // 1..CART_MAX_QTY
  imageUrl?: string; // first photo of the active color at add time
};

export const CART_STORAGE_KEY = 'tanar-cart';
export const CART_MAX_QTY = 20;
export const CART_MAX_ITEMS = 30;

type StoredCart = { v: 1; items: CartItem[] };

export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredCart> | null;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    const stored: StoredCart = { v: 1, items };
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage full / unavailable — the in-memory cart still works
  }
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** Stable cart fingerprint for order dedup: JSON of sorted [skuId, qty]. */
export function cartHash(items: CartItem[]): string {
  const pairs = items
    .map((i) => [i.skuId, i.qty] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(pairs);
}
