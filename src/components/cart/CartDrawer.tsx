'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/core/catalog/client';
import { CART_MAX_QTY } from '@/lib/cart';
import { useCart } from './CartProvider';
import CheckoutPanel from './CheckoutPanel';

export default function CartDrawer() {
  const { items, isOpen, close, setQty, remove } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes; body scroll is locked while open; focus moves into the
  // drawer (the «×» button) so keyboard users are not left behind the modal.
  // Hiding the scrollbar shrinks the body width and shifts the page — pad the
  // body by the scrollbar width while locked to compensate.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('overflow-hidden');
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
      document.body.style.paddingRight = '';
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        data-testid="cart-backdrop"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Корзина"
        data-testid="cart-drawer"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-stone-50 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-4 sm:px-6">
          <h2 className="font-display text-lg font-bold text-stone-900">
            Корзина
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Закрыть корзину"
            onClick={close}
            className="rounded-md p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <p className="text-stone-500">Корзина пуста</p>
            <Link
              href="/catalog"
              onClick={close}
              className="rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800"
            >
              В каталог
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-stone-200 overflow-y-auto px-4 sm:px-6">
              {items.map((item) => {
                // Stepper cap: the availability snapshot taken at add time
                // (CartProvider clamps the state the same way). Old carts
                // without the field only get the protective CART_MAX_QTY cap.
                const cap = Math.min(CART_MAX_QTY, item.available ?? CART_MAX_QTY);
                const atStockLimit = item.qty >= cap && cap < CART_MAX_QTY;
                return (
                <li
                  key={item.skuId}
                  data-testid="cart-item"
                  className="flex gap-4 py-4"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 flex-shrink-0 rounded-md bg-stone-200" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {item.colorLabel} · {item.size}
                      {item.ruSize ? ` / ${item.ruSize}` : ''}
                    </p>
                    <p className="mt-1 text-sm font-medium text-stone-900">
                      {formatPrice(item.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Уменьшить"
                        onClick={() =>
                          item.qty === 1
                            ? remove(item.skuId)
                            : setQty(item.skuId, item.qty - 1)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded border border-stone-300 text-stone-700 transition-colors hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm text-stone-900">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Увеличить"
                        disabled={item.qty >= cap}
                        onClick={() => setQty(item.skuId, item.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-stone-300 text-stone-700 transition-colors hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-300"
                      >
                        +
                      </button>
                    </div>
                    {atStockLimit && (
                      <p
                        data-testid="qty-limit"
                        className="mt-1 text-xs text-stone-400"
                      >
                        Больше нет в наличии
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить из корзины"
                    onClick={() => remove(item.skuId)}
                    className="self-start rounded p-1 text-stone-400 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
                );
              })}
            </ul>
            <CheckoutPanel />
          </>
        )}
      </div>
    </div>
  );
}
