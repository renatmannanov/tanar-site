'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CART_MAX_ITEMS,
  CART_MAX_QTY,
  cartCount,
  cartTotal,
  loadCart,
  saveCart,
  type CartItem,
} from '@/lib/cart';

type CartContextValue = {
  items: CartItem[];
  add(item: Omit<CartItem, 'qty'>, qty?: number): void;
  setQty(skuId: string, qty: number): void;
  remove(skuId: string): void;
  clear(): void;
  count: number;
  total: number;
  isOpen: boolean; // drawer state lives here: adding opens the drawer
  open(): void;
  close(): void;
};

const CartContext = createContext<CartContextValue | null>(null);

function clampQty(qty: number, item: Pick<CartItem, 'available'>): number {
  // Items without an `available` snapshot (old carts) get no client cap —
  // the server re-checks availability at checkout.
  const cap = Math.min(CART_MAX_QTY, item.available ?? CART_MAX_QTY);
  return Math.max(1, Math.min(cap, Math.round(qty)));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // [] on the server and until mount, then hydrate from localStorage in an
  // effect — no hydration mismatch; the badge fills in on the client.
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.skuId === item.skuId);
      if (existing) {
        // The product page's snapshot is fresher than the cart's — overwrite
        // `available` and clamp the merged qty against the new value.
        return prev.map((i) =>
          i.skuId === item.skuId
            ? { ...i, available: item.available, qty: clampQty(i.qty + qty, item) }
            : i,
        );
      }
      if (prev.length >= CART_MAX_ITEMS) return prev; // protective cap
      return [...prev, { ...item, qty: clampQty(qty, item) }];
    });
  }, []);

  const setQty = useCallback((skuId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.skuId === skuId ? { ...i, qty: clampQty(qty, i) } : i)),
    );
  }, []);

  const remove = useCallback((skuId: string) => {
    setItems((prev) => prev.filter((i) => i.skuId !== skuId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      count: cartCount(items),
      total: cartTotal(items),
      isOpen,
      open,
      close,
    }),
    [items, add, setQty, remove, clear, isOpen, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider> (public layout)');
  }
  return ctx;
}
