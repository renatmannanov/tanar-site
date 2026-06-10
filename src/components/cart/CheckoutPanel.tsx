'use client';

import { useState } from 'react';
import { formatPrice } from '@/core/catalog/client';
import { useCart } from './CartProvider';

// Drawer footer: total, checkout CTA, clear-cart. No props — everything comes
// from useCart(), so step 6 swaps the checkout logic without touching
// CartDrawer. The checkout button is a stub until then.
export default function CheckoutPanel() {
  const { total, clear } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-3 border-t border-stone-200 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-600">Итого:</span>
        <span data-testid="cart-total" className="font-display text-lg font-bold text-stone-900">
          {formatPrice(total)}
        </span>
      </div>
      <p className="text-xs text-stone-500">Доставка и самовывоз по Алматы</p>
      <button
        type="button"
        disabled
        title="Скоро"
        data-testid="checkout-button"
        className="w-full rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Оформить заказ в WhatsApp
      </button>
      <button
        type="button"
        data-testid="clear-cart"
        onClick={() => {
          if (!confirmClear) {
            setConfirmClear(true);
            return;
          }
          clear();
          setConfirmClear(false);
        }}
        onBlur={() => setConfirmClear(false)}
        className={`w-full text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
          confirmClear
            ? 'font-medium text-red-600 hover:text-red-700'
            : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        {confirmClear ? 'Точно очистить?' : 'Очистить корзину'}
      </button>
    </div>
  );
}
