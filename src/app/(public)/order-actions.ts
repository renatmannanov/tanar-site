'use server';

import { createOrder, type OrderItemInput } from '@/core/orders';
import { getSiteSettings } from '@/core/site';
import { formatPrice } from '@/core/catalog/client';
import { waLink } from '@/lib/whatsapp';

export type CheckoutResult =
  | {
      ok: true;
      number: number;
      waUrl: string | null;
      waText: string;
      phone: string | null;
    }
  | { ok: false; error: string; unavailableSkuIds?: string[] };

/**
 * Storefront checkout: persists the order (DB is the source of truth — prices
 * and names come from createOrder, not the client cart), then builds the
 * WhatsApp message. No whatsapp number configured → waUrl is null and the UI
 * shows the confirmation without the WhatsApp button.
 */
export async function checkoutAction(
  items: OrderItemInput[],
): Promise<CheckoutResult> {
  try {
    const result = await createOrder(items);
    if (!result.ok) return result;

    const { order } = result;
    const lines = order.items.map(
      (i) => `• ${i.nameSnapshot} — ${i.qty} шт × ${formatPrice(i.priceSnapshot)}`,
    );
    const waText = [
      `Здравствуйте! Заказ №${order.number} с сайта tanar.kz:`,
      '',
      ...lines,
      '',
      `Итого: ${formatPrice(order.total)}`,
      'Доставка/самовывоз: Алматы',
    ].join('\n');

    const settings = await getSiteSettings();
    const phone = settings.whatsapp;
    return {
      ok: true,
      number: order.number,
      waUrl: phone ? waLink(phone, waText) : null,
      waText,
      phone,
    };
  } catch {
    return { ok: false, error: 'Не удалось оформить заказ, попробуйте ещё раз' };
  }
}
