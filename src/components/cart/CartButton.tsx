'use client';

import { useCart } from './CartProvider';

export default function CartButton() {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      aria-label="Корзина"
      data-testid="cart-button"
      onClick={open}
      className="relative inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
        />
      </svg>
      {count > 0 && (
        <span
          data-testid="cart-count"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-xs font-semibold text-stone-50"
        >
          {count}
        </span>
      )}
    </button>
  );
}
