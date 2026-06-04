# Progress Log — Корзина

## Контекст для агента

### Где что лежит
- Типы продукта: `src/lib/product.ts` — `Product`, `ProductColor`, `formatPrice(price)`, `getProductBySlug(slug)`.
- Данные продуктов: `src/data/products.ts`.
- Страница товара (client): `src/components/product/ProductDetail.tsx` — здесь живёт выбор цвета (`activeColor`, `activeVariant`), кнопка `AvailabilityButton`, и (новое) `MarketplaceLinks`.
- Header (server component): `src/components/Header.tsx`. Мобильное меню: `src/components/MobileNav.tsx` (client). Layout: `src/app/layout.tsx` — оборачивает всё в `<Header/> <main> <Footer/>`.
- E2E: папка `e2e/`, конфиг Playwright с `reuseExistingServer: true`. Образец теста: `e2e/product.spec.ts`.

### Ключевые ограничения (НЕ нарушать)
- **Нет бэкенда и БД.** Состояние корзины — только `localStorage` + Context.
- **Tailwind v3**, есть `tailwind.config.ts`? — НЕТ, его намеренно нет (см. CLAUDE.md). Классы пишутся напрямую, palette stone/emerald/slate.
- `Product.price` для comingSoon = 0, у них `comingSoon: true`. Такие товары в корзину НЕ кладём.
- `Product.variants` опционально. Если нет вариантов — colorId пустая строка.
- Цена форматируется ТОЛЬКО через `formatPrice` (₸, ru-RU).
- `'use client'` обязателен для всего что трогает localStorage / useState / Context-хуки. Layout — server, поэтому `CartProvider` должен быть `'use client'` и импортироваться в server layout (это ок в Next 15).

### Решения этой сессии
- Line item ключ = `slug + colorId`. Дубликат → qty++.
- Корзина = drawer справа, не страница.
- Контакт в чекауте = одно обязательное поле `contact` (имя + телефон/телеграм), min 5 симв.
- Notifier: env-driven. Default `console`, Telegram если есть `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.
- Мессенджер абстрагирован интерфейсом `Notifier` — WhatsApp добавится позже как ещё одна реализация.

### Что НЕ ломать
- Существующие e2e (home, catalog, product, blog, layout, responsive, smoke).
- `MarketplaceLinks` уже добавлен в ProductDetail (задача №0, отдельно от корзины) — не трогать.
- Логику выбора цвета / галереи в ProductDetail.

## Learnings
(заполняется в процессе работы)
---
