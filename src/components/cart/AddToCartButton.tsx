'use client';

import { useCart } from './CartProvider';
import type { CartItem } from '@/lib/cart';

export default function AddToCartButton({
  item,
}: {
  /** null until a size is picked — the button stays disabled. */
  item: Omit<CartItem, 'qty'> | null;
}) {
  const { add, open, items } = useCart();
  // Already-added SKU → «В корзине», disabled. Quantity changes happen in the
  // drawer; re-clicking the CTA must not silently bump qty.
  const inCart = item !== null && items.some((i) => i.skuId === item.skuId);

  return (
    <button
      type="button"
      disabled={item === null || inCart}
      onClick={() => {
        if (!item) return;
        add(item);
        open();
      }}
      data-testid="add-to-cart"
      className="w-full rounded-lg bg-stone-900 px-8 py-4 text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300"
    >
      {item === null ? 'Выберите размер' : inCart ? 'В корзине' : 'В корзину'}
    </button>
  );
}
