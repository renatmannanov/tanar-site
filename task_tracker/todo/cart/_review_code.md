# Review: Code

## Критичное (блокирует выполнение)

### 1. `layout.tsx` — server component, нельзя рендерить `CartProvider` (`'use client'`) напрямую как обёртку всего дерева

**Файл:** `src/app/layout.tsx`

Текущий `layout.tsx` — **server component** (нет `'use client'`). Это нормально для Next.js: server component _может_ импортировать client component и рендерить его как `{children}` wrapper. Это работает корректно. НО: в шаге 1 написано «обернуть `{children}` (и Header) в `<CartProvider>`». Если сделать так:

```tsx
// layout.tsx (server)
<CartProvider>
  <Header />          // ← Header сейчас server component
  <main>{children}</main>
  <Footer />
</CartProvider>
```

...то это корректно. НО шаг 3 говорит, что `CartDrawer` рендерится внутри `CartProvider` после `{children}`. Если `CartProvider` — client component и рендерит `CartDrawer` (client) — это всё ok, конфликта нет. Но **`{children}` переданные в client component из server layout — это тоже валидно** (паттерн "client boundary with server children"). Проблема не критичная, но надо убедиться что исполнитель знает: `children` из server layout передаются в `CartProvider` как уже сформированный React-node — они не становятся client-only. Это не блокер, но неочевидно и может вызвать путаницу.

**Реальный блокер:** В `layout.tsx` тег `<body>` — внутри server component. `CartProvider` с `useEffect`/localStorage нельзя вызвать прямо в `<html>/<body>`. Технически Next.js это разрешает (client component внутри server), но `<html>` и `<body>` особые теги — нужно убедиться что `CartProvider` оборачивает контент внутри `<body>`, а не сам `<body>`. В плане это не уточнено.

---

### 2. `ProductDetail.tsx` — уже является `'use client'`, но план описывает его неверно

**Файл:** `src/components/product/ProductDetail.tsx`, строка 1.

Файл уже помечен `'use client'`. Шаг 2 ни разу не упоминает это — он просто говорит «добавить в `ProductDetail.tsx` кнопку "В корзину"». Это ок. НО: `AddToCartButton` тоже будет `'use client'` — он может спокойно использоваться внутри уже client компонента. Проблем с вложенностью нет, но **создавать отдельный `AddToCartButton.tsx` и импортировать его в и без того client компонент — избыточно**: можно просто вставить inline. Это не блокер для выполнения, но план создаёт ненужный файл.

---

### 3. `AvailabilityButton` — принимает нулевые пропсы, план требует изменить стиль

**Файл:** `src/components/AvailabilityButton.tsx`

Текущая кнопка не принимает никаких пропсов. Шаг 2 требует сделать её «secondary: border-stone-300, текст stone-700» вместо текущего `bg-stone-900 text-stone-50`. Это потребует либо добавить пропс `variant` к `AvailabilityButton`, либо менять стиль напрямую. Шаг 2 этого не описывает явно — не указано нужно ли менять сигнатуру компонента или только стиль в месте использования. Если поменять стиль прямо в файле — сломается глобальный вид кнопки на всех товарах. Если добавить пропс — нужно обновить все места использования. **Текущий `AvailabilityButton` используется только в `ProductDetail.tsx`, но план не говорит менять сигнатуру компонента.**

---

### 4. `route.ts` — синтаксис Next.js 15 route handler: `Request` из Web API, не Next-специфичный

**Файл (будущий):** `src/app/api/order/route.ts`

Шаг 4 пишет `export async function POST(req: Request)`. В Next.js 15 с App Router правильная сигнатура:

```ts
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) { ... }
```

Можно использовать и нативный `Request`, но тогда для ответа нужно использовать `Response.json(...)` а не `NextResponse.json(...)`. Шаг 4 именно так и пишет (`Response.json({ error }, { status: 400 })`). В Next.js 15 это **работает** — Web `Response` принимается. Но `Response.json()` это статический метод который есть в Node 18+ (и используется в Next.js), поэтому проблем нет. Никакого блокера нет, просто уточнение.

---

## Важное (стоит исправить до начала)

### 5. `catalog.spec.ts` — тест `'no page or console errors on /catalog'` сломается от hydration

**Файл:** `e2e/catalog.spec.ts`, строка 27–32

Тест слушает `page.on('console', msg => { if (msg.type() === 'error') ... })`. При добавлении `CartProvider` с `localStorage` в `layout.tsx` может возникнуть hydration mismatch если `CartDrawer` рендерится без `mounted`-паттерна (план требует его только для `CartButton`/бейджа — шаг 3, но не для `CartDrawer` в целом). Если `CartDrawer` рендерит что-то из `localStorage` до mount — будет hydration warning в консоли, и тест упадёт. Шаг 3 упоминает `mounted`-паттерн только для бейджа счётчика, а не для всего drawer.

**Нужно убедиться:** `CartDrawer` во время SSR рендерится как `null` или как закрытый (без обращения к localStorage-данным) — иначе тест `no page or console errors on /catalog` красный.

---

### 6. `Header.tsx` — server component, `CartButton` (client) вставляется внутрь

**Файл:** `src/components/Header.tsx`

Шаг 3 говорит: «`Header.tsx` сейчас server component. Просто импортировать `CartButton` (client) и поставить рядом с `MobileNav`». Это корректный Next.js паттерн. НО:

`MobileNav` — `'use client'` (строка 1 `MobileNav.tsx`). `Header.tsx` — server component, который импортирует `MobileNav`. Это уже работает сейчас. `CartButton` добавится аналогично. **Проблем нет**, но исполнителю нужно знать что `Header` остаётся server component — не нужно добавлять `'use client'` в него.

Шаг 3 говорит разместить `CartButton` «вне `hidden lg:flex`» — текущая desktop nav обёрнута в `<nav className="hidden ... lg:flex">`. `MobileNav` стоит после nav и виден на mobile (`<div className="lg:hidden">`). Нужно разместить `CartButton` так, чтобы был виден всегда. Конкретного места в разметке план не указывает — придётся решать по ходу.

---

### 7. Нет продукта без вариантов в данных для тестирования сценария `colorId = ''`

**Файл:** `src/data/products.ts`

Шаг 2 говорит «проверить вручную: добавление товара без вариантов не падает (`colorId=''`)». Однако в `products.ts` все продукты с ценой (`!comingSoon`) имеют `variants`. Продукты без вариантов — только `comingSoon` (pants, shorts), а у них кнопки "В корзину" не будет по условию плана. Таким образом **сценарий `colorId=''` практически невозможен на реальных данных** — проверять его не на чем кроме ручного теста или создания тестового товара. Степень 6 e2e теоретически не покроет этот кейс.

---

### 8. `formatPrice` — импорт уже есть в `ProductDetail.tsx`, в `cart.ts` не нужен

**Файл:** `src/lib/product.ts`, строка 100; `src/components/product/ProductDetail.tsx`, строка 9

`formatPrice(price: number): string` существует в `src/lib/product.ts`. `CartDrawer` (шаг 3) должен вызывать `formatPrice` — нужно импортировать из `@/lib/product`. Это нигде не конфликтует, просто убедиться что исполнитель не создаёт дублирующую функцию в `cart.ts` или `CartDrawer.tsx`.

---

### 9. `playwright.config.ts` — порт 3001, а не 3000

**Файл:** `playwright.config.ts`, строка 10 + 15

Dev-сервер для e2e запускается на **порту 3001**, не 3000. В шаге 4 curl-команды для верификации написаны с `http://localhost:3000/api/order`. Это расхождение — тест e2e пойдёт на 3001, ручная верификация curl'ом по инструкции в шаге 4 будет давать connection refused если использовать стандартный `npm run dev` (порт 3000), а не e2e-сервер.

---

## Мелочи (можно по ходу)

### 10. `step_6_e2e.md` — сценарий 3 (персистентность) требует доступа к localStorage

**Файл:** `e2e/cart.spec.ts` (будущий)

Сценарий персистентности в шаге 6: «добавить товар, перезагрузить страницу, `cart-count` всё ещё показывает количество». После `page.reload()` `cart-count` badge не появится мгновенно — нужен `await page.waitForSelector('[data-testid="cart-count"]')` или `expect(...).toBeVisible()`. Это стандартная Playwright практика, просто нужно помнить что бейдж рендерится только после `mounted` (useEffect), т.е. не в SSR. Тест должен дождаться клиентской гидрации.

---

### 11. `step_1_cart_core.md` — `cartItemKey` vs `removeItem`/`setQty` ключ

В `cart.ts` `removeItem(items, key)` и `setQty(items, key, qty)` принимают `key: string`. Но нет уточнения как `CartDrawer` получит этот ключ для каждого `CartItem` — в типе `CartItem` нет поля `key`. Придётся либо добавлять вычисляемое поле, либо вызывать `cartItemKey(item.slug, item.colorId)` в компоненте. Это мелочь, но нужно быть последовательным.

---

### 12. Telegram notifier — `fetch` в Node.js

**Файл (будущий):** `src/lib/notify/telegram-notifier.ts`

`package.json` требует `node >= 20 < 21`. Node 20 поддерживает глобальный `fetch`. Next.js 15 тоже расширяет `fetch`. Никаких проблем с `fetch` в route handler нет.

---

## Не найдено проблем (если всё ок — скажи явно)

- **`getProductBySlug` / `formatPrice` сигнатуры** — совпадают с тем что ожидает план. `formatPrice(price: number): string` ✓, `getProductBySlug(slug): Product | undefined` ✓.
- **`Product` тип** — поля `slug`, `name`, `price`, `variants`, `comingSoon` присутствуют, совпадают с тем что план кладёт в `CartItem`. ✓
- **`reuseExistingServer: true`** в `playwright.config.ts` — есть. ✓
- **Паттерн server layout → client provider → server children** — в Next.js 15 App Router это стандартный и рабочий паттерн. ✓
- **`Response.json()` в Next.js 15** — поддерживается. ✓
- **Путь `/api/order`** — в Next.js App Router файл `src/app/api/order/route.ts` → URL `/api/order`. ✓
- **`MarketplaceLinks.tsx`** — server component (нет `'use client'`), используется внутри `ProductDetail.tsx` (client). Client component может рендерить server-defined component как import — это ок в Next.js ≥13. ✓
- **Существующие e2e тесты** — `catalog.spec.ts` и `product.spec.ts` не проверяют отсутствие `CartProvider` в дереве, не конфликтуют с добавлением нового провайдера напрямую. За исключением п.5 (console errors тест).
