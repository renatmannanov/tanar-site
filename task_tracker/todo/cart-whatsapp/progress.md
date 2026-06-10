# Progress Log — cart-whatsapp

## Контекст для агента

Факты, которые не очевидны из кода (детали решений — в PLAN.md «Ключевые решения»):

- **Таблицы `orders`/`order_items` УЖЕ есть** в `src/core/db/schema.ts` с миграции
  0000 — шаг 1 только добавляет `orders.number` (serial) и `site_settings.whatsapp`.
  Дефолт статуса `'pending'` НЕ менять — это «Новый».
- **`products.marketplaces` уже сквозной**: схема → тип → zod → mapper → компонент
  `MarketplaceLinks` уже рендерится в `ProductDetail.tsx:200`. Шаг 8 — только UI
  формы админки.
- **Client-компоненты НЕ импортят server-barrel'ы**: `@/core/catalog` →
  `@/core/catalog/client`, `@/core/orders` → `@/core/orders/client`. typecheck/lint
  это НЕ ловят — ловит только `npm run build`. Гонять build на каждом шаге.
- **Предусловие dev/e2e/build-рантайма**: `.env.local` (DATABASE_URL,
  ADMIN_PASSWORD, ADMIN_SESSION_SECRET ≥32) + `npm run db:up && npm run db:migrate
  && npm run db:seed && npm run db:seed-site`. Порты Postgres: 5442/5443.
- **e2e**: `data-testid="availability-button"` в спеках НЕ используется
  (`e2e/product.spec.ts` — только 404-тест); удаление компонента в шаге 4 спеки
  не ломает, но `storefront-completion.spec.ts:107-108` проверяет текст размера
  `getByText('M', { exact: true })` — кнопки размеров должны сохранить текст.
  Playwright `reuseExistingServer: true`.
- **`updateSiteSettings()` зовут ДВА сида**: `seed-site.ts` И `seedSiteContent()`
  внутри `seed.ts` — менять `SiteSettingsInput` → править оба (шаг 2).
- В сиде каталога ВСЕ 12 товаров published — coming_soon-товар для e2e создаётся
  самим спеком через админ-UI (шаг 4).
- **Старый план `task_tracker/todo/cart/`** (удалён; в git — коммит `2b36391`)
  устарел: писался до БД/размеров, отправка была в Telegram. Не использовать.
- Витрина не импортирует компоненты из `src/components/admin/**` (и наоборот).
  Нужен confirm-паттерн в drawer — писать локально, не тащить admin/ui.
- Деплой плана на прод: build `--no-cache` + tools-сервис `migrate`
  (см. CLAUDE.md «Прод-деплой»); whatsapp-номер заказчица заполняет в админке.

## Learnings

(заполняется в процессе работы)

---
