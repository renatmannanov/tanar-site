# Шаг 6: Оформление — server action, текст заказа, экран «Заказ №N», QR, дедуп

> Зависит от: шаг 1 (createOrder), шаг 2 (whatsapp+waLink), шаг 3 (ДОПОЛНЯЕТ
> существующий `src/lib/cart.ts` — не создавать новый файл), шаг 5 (заменяет
> реализацию `CheckoutPanel.tsx`)
> Статус: [x] done

## Задача

### 0. Зависимости

```bash
npm i qrcode && npm i -D @types/qrcode
```

### 1. Server action — `src/app/(public)/order-actions.ts` ('use server')

```ts
export type CheckoutResult =
  | { ok: true; number: number; waUrl: string | null; waText: string; phone: string | null }
  | { ok: false; error: string; unavailableSkuIds?: string[] };

export async function checkoutAction(items: OrderItemInput[]): Promise<CheckoutResult>;
```

- Вызывает `createOrder(items)` из `@/core/orders`. `ok: false` — пробросить как есть.
- Читает `getSiteSettings()`; текст заказа строит СЕРВЕР из результата `createOrder`
  (данные БД — канон), клиентские снапшоты не используются:

```
Здравствуйте! Заказ №{number} с сайта tanar.kz:

• {nameSnapshot} — {qty} шт × {priceSnapshot форматом 89 000 ₸}
…по строке на позицию…

Итого: {total} ₸
Доставка/самовывоз: Алматы
```

- `waUrl` = `waLink(settings.whatsapp, text)`; whatsapp пуст → `waUrl: null`
  (UI покажет подтверждение без WhatsApp-кнопки), `phone` = `settings.whatsapp`.
- try/catch вокруг всего: непредвиденная ошибка → `{ ok: false, error: 'Не удалось
  оформить заказ, попробуйте ещё раз' }`.

### 2. Дедуп повторного оформления

В СУЩЕСТВУЮЩИЙ `src/lib/cart.ts` (создан шагом 3) дописать хранение последнего
заказа (ключ `tanar-cart-order`): `saveLastOrder({hash, number, waUrl, waText, phone})`,
`loadLastOrder()`. Отдельный файл НЕ заводить (типы корзины живут в одном месте).
Перед вызовом action клиент считает `cartHash(items)`;
совпал со слепком сохранённого — action НЕ зовётся, показывается сохранённое
подтверждение (тот же №). Не совпал — новый заказ, перезаписать.

### 3. UI: двухэкранный flow в drawer

`src/components/cart/CheckoutPanel.tsx` уже создан шагом 5 (заглушка с финальным
API, без props) — этот шаг заменяет ТОЛЬКО его реализацию, `CartDrawer.tsx` не
трогать. Состояния `'cart' | 'done'`:

- `'cart'`: кнопка «Оформить заказ в WhatsApp» (`checkout-button`, активна при
  непустой корзине) → дедуп-проверка → `checkoutAction` → `'done'`.
  **Гард от двойного сабмита:** state `pending`; обработчик клика при
  `pending === true` делает ранний `return`; кнопка `disabled={pending}` с текстом
  «Оформляем…». Серверного дедупа сознательно нет (MVP: дубль-заказ виден в
  админке и не теряет данных). `ok: false` c `unavailableSkuIds` → у соответствующих
  `cart-item` бейдж «Товар недоступен — удалите» (`data-testid="cart-item-unavailable"`),
  оформление не происходит; прочие ошибки — текст над кнопкой.
- `'done'` (`data-testid="checkout-done"`): «Заказ №{number} принят»; текст
  «Отправьте его нам в WhatsApp — обсудим наличие и доставку»;
  кнопка-ссылка «Открыть WhatsApp» (`data-testid="wa-link"`, href = waUrl,
  target=_blank; нет waUrl — не рендерится); QR-блок `hidden md:block`
  (`data-testid="wa-qr"`): `import QRCode from 'qrcode'` → `toDataURL(waUrl)` в
  `useEffect` → `<img>`, подпись «или отсканируйте с телефона»; кнопка
  «Скопировать текст заказа» (`navigator.clipboard.writeText(waText)`, после —
  «Скопировано ✓»); телефон текстом (если задан); кнопка «← Назад к корзине»
  (возврат в `'cart'`, корзина цела).
- Корзина после оформления НЕ очищается (решение зафиксировано). Изменение
  корзины (qty/удаление/добавление) при следующем оформлении даёт новый заказ —
  это и проверяет дедуп-хэш.

## Тесты

Дополнить `e2e/cart.spec.ts`:

- Добавить товар → оформить → `checkout-done` с текстом «Заказ №»; `wa-link` href:
  начинается с `https://wa.me/`, содержит только цифры до `?text=`, в decoded text —
  имя товара, «шт ×», «Итого», «Алматы».
- Назад к корзине → позиции на месте (не очищена); повторное оформление → ТОТ ЖЕ
  номер заказа (дедуп).
- Изменить qty → оформить → номер другой (новый заказ).
- QR: на 1280 `wa-qr` виден; `src` проверять через
  `await expect(img).toHaveAttribute('src', /^data:image\//)` (auto-wait —
  `toDataURL` асинхронный, ассерт сразу после клика флакует); на 375 — скрыт.
- Кнопка копирования: после клика текст «Скопировано» (clipboard-права:
  `context.grantPermissions(['clipboard-read','clipboard-write'])` в Chromium).

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/cart.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] Оформление создаёт заказ (видим «Заказ №N»; в БД проверит шаг 7 через админку)
- [ ] wa.me-href корректен: digits-only номер + URL-encoded текст с составом (e2e)
- [ ] Дедуп: неизменённая корзина → тот же №; изменённая → новый (e2e)
- [ ] Корзина не очищается после оформления (e2e)
- [ ] QR виден на десктопе, скрыт на мобильном (e2e)
- [ ] Цены в заказе — из БД: подменить price в localStorage перед оформлением →
      в waText цена из БД (e2e-тест на манипуляцию клиентом)
- [ ] typecheck, lint, build, test:e2e — exit 0
