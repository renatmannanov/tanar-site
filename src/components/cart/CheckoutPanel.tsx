'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatPrice } from '@/core/catalog/client';
import { cartHash, loadLastOrder, saveLastOrder, type LastOrder } from '@/lib/cart';
import { checkoutAction } from '@/app/(public)/order-actions';
import { useCart } from './CartProvider';

// Drawer footer: total, checkout CTA, clear-cart. No props — everything comes
// from useCart(), so CartDrawer never changes. Two screens: 'cart' (the CTA)
// and 'done' (order №N + WhatsApp link/QR/copy). The cart is deliberately NOT
// cleared after checkout; re-submitting an unchanged cart reuses the same
// order (hash dedup via localStorage, see lib/cart).
export default function CheckoutPanel() {
  const { items, total, clear } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [screen, setScreen] = useState<'cart' | 'done'>('cart');
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);

  async function checkout() {
    if (pending) return; // double-submit guard (server has no dedup — MVP)
    setError(null);
    setUnavailable([]);

    const hash = cartHash(items);
    const last = loadLastOrder();
    if (last && last.hash === hash) {
      setOrder(last);
      setScreen('done');
      return;
    }

    setPending(true);
    try {
      const result = await checkoutAction(
        items.map((i) => ({ skuId: i.skuId, qty: i.qty })),
      );
      if (!result.ok) {
        setUnavailable(result.unavailableSkuIds ?? []);
        setError(result.error);
        return;
      }
      const placed: LastOrder = {
        hash,
        number: result.number,
        waUrl: result.waUrl,
        waText: result.waText,
        phone: result.phone,
      };
      saveLastOrder(placed);
      setOrder(placed);
      setScreen('done');
    } finally {
      setPending(false);
    }
  }

  if (screen === 'done' && order) {
    return (
      <OrderDone order={order} onBack={() => setScreen('cart')} />
    );
  }

  return (
    <div className="space-y-3 border-t border-stone-200 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-600">Итого:</span>
        <span data-testid="cart-total" className="font-display text-lg font-bold text-stone-900">
          {formatPrice(total)}
        </span>
      </div>
      <p className="text-xs text-stone-500">Доставка и самовывоз по Алматы</p>
      {unavailable.length > 0 && (
        <UnavailableMarks skuIds={unavailable} />
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={items.length === 0 || pending}
        onClick={checkout}
        data-testid="checkout-button"
        className="w-full rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {pending ? 'Оформляем…' : 'Оформить заказ в WhatsApp'}
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

/** Badge unavailable cart rows. Rendered inline in the footer (the rows
 * themselves live in CartDrawer) — lists the affected positions by name. */
function UnavailableMarks({ skuIds }: { skuIds: string[] }) {
  const { items } = useCart();
  const names = items
    .filter((i) => skuIds.includes(i.skuId))
    .map((i) => `${i.name} (${i.size})`);
  if (names.length === 0) return null;
  return (
    <div
      data-testid="cart-item-unavailable"
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      Товар недоступен — удалите: {names.join(', ')}
    </div>
  );
}

function OrderDone({ order, onBack }: { order: LastOrder; onBack: () => void }) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (order.waUrl) {
      // The wa.me URL embeds the whole order text → a dense QR. Low error
      // correction keeps the module count down and a 512px render gives mid-
      // range phone cameras enough pixels per module to lock on.
      QRCode.toDataURL(order.waUrl, {
        margin: 2,
        width: 512,
        errorCorrectionLevel: 'L',
      }).then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    } else {
      setQrSrc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [order.waUrl]);

  return (
    <div
      data-testid="checkout-done"
      className="space-y-3 overflow-y-auto border-t border-stone-200 px-4 py-4 sm:px-6"
    >
      <p className="font-display text-lg font-bold text-stone-900">
        Заказ №{order.number} принят
      </p>
      <p className="text-sm text-stone-600">
        Отправьте его нам в WhatsApp — обсудим наличие и доставку.
      </p>
      {order.waUrl && (
        <a
          href={order.waUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="wa-link"
          className="block w-full rounded-lg bg-stone-900 px-6 py-3 text-center text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
        >
          Открыть WhatsApp
        </a>
      )}
      {order.waUrl && (
        <div data-testid="wa-qr" className="hidden md:block">
          {qrSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrSrc}
              alt="QR-код для WhatsApp"
              className="mx-auto h-56 w-56"
            />
          )}
          <p className="mt-1 text-center text-xs text-stone-500">
            или отсканируйте с телефона
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(order.waText);
          setCopied(true);
        }}
        className="w-full rounded-lg border border-stone-300 px-6 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
      >
        {copied ? 'Скопировано ✓' : 'Скопировать текст заказа'}
      </button>
      {order.phone && (
        <p className="text-center text-xs text-stone-500">
          WhatsApp: {order.phone}
        </p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
      >
        ← Назад к корзине
      </button>
    </div>
  );
}
