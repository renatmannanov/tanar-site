# Review: Code

## Критичное (блокирует выполнение)

### 1. `siteSettings` не имеет поля `whatsapp` — `updateSiteSettingsAction` сломается
**Файл:** `src/app/admin/(protected)/settings/actions.ts` (строка 4)

`updateSiteSettingsAction` принимает `SiteSettingsInput` и передаёт его напрямую в `updateSiteSettings(input)`. После шага 2 в `SiteSettingsInput` появится поле `whatsapp`, но `updateSiteSettings` строит `values = { ...input, updatedAt: new Date() }` и делает upsert в таблицу `site_settings`. Пока колонки `whatsapp` нет в схеме (шаг 1 добавит её), всё ок. Но: шаг 2 добавляет поле в TypeScript-тип и в форму, а шаг 1 добавляет колонку в схему. Если выполнять шаги не по порядку или пропустить `db:migrate` между шагами 1 и 2 — Drizzle кинет ошибку на лишнее поле. Это не баг плана, но надо проверить порядок явно. **Не блокер при правильном порядке выполнения, но риск при параллельном запуске шагов 1–2.**

### 2. `seed.ts` (db:seed) знает о `whatsapp` только через `seedSiteContent` — после шага 2 сломается typecheck
**Файл:** `src/core/db/seed.ts` строки 110-127 и `src/core/db/seed-site.ts` строки 27-40

Оба файла вызывают `updateSiteSettings(...)` с объектом, в котором нет `whatsapp`. После того как в шаге 2 `SiteSettingsInput` пополнится обязательным (`whatsapp: string | null`) полем, оба файла сломают typecheck — поле не передаётся. Шаг 2 в разделе «4. Сид» описывает исправление только `seed-site.ts`, но не упоминает `seed.ts`. При этом именно `seed.ts` (через `seedSiteContent`) используется в `afterAll` всех e2e-спеков. **Блокирует `npm run typecheck` и `npm run test:e2e` после шага 2.**

### 3. `storefront-completion.spec.ts` тест `publish -> visible with sizes` сломается после шага 4
**Файл:** `e2e/storefront-completion.spec.ts` строки 107-108

```ts
await expect(page.getByText('Размеры')).toBeVisible();
await expect(page.getByText('M', { exact: true })).toBeVisible(); // size chip
```

Сейчас «M» рендерится как `<span>` (строки 160-168 в `ProductDetail.tsx`). Шаг 4 заменяет `<span>` на `<button>` с `aria-pressed`. Содержимое кнопки всё так же содержит текст «M», поэтому `getByText('M', { exact: true })` найдёт его — это безопасно. НО: шаг 4 также добавляет `ruSize` к тексту в формате `{sku.size} / {sku.ruSize}`. Если у тестового продукта (который создаётся в `fillNewProduct`) есть `ruSize`, то `exact: true` перестанет матчить «M». По факту тестовый продукт создаётся без `ruSize`, поэтому текст останется «M» — проблемы нет. **Не блокер, но нужно отследить при внедрении шага 4.**

### 4. `ProductDetailComingSoon` принимает только `{ product }` — нельзя добавить `whatsapp`
**Файл:** `src/components/product/ProductDetail.tsx` строки 58-59, 210-233

Компонент `ProductDetailComingSoon` вызывается так: `return <ProductDetailComingSoon product={product} />;`. Шаг 4 требует передать в него `whatsapp`, но вызов находится **внутри** `ProductDetail` (строка 59). Чтобы передать `whatsapp`, нужно добавить `whatsapp` в пропсы самого `ProductDetail` и пробросить его в `ProductDetailComingSoon`. Шаг 4 это описывает («принять `whatsapp`; если заполнен — кнопка-ссылка»), но не уточняет, что `ProductDetail` тоже получает новый prop. Страница `catalog/[slug]/page.tsx` должна прокидывать `whatsapp` в `<ProductDetail whatsapp={...}>`. **Это именно то, что описано в шаге 4 п.1 — прокинуть whatsapp через страницу в компонент. Конфликтов нет, но вся цепочка prop-drilling должна быть сделана согласованно в одном шаге.**

---

## Важное (стоит исправить до начала)

### 5. `site-admin.spec.ts` afterAll не восстанавливает `whatsapp` — e2e site-content сломается
**Файл:** `e2e/site-admin.spec.ts` строки 24-30

```ts
test.afterAll(() => {
  execSync('... DELETE FROM site_settings; DELETE FROM faq_items; ...');
  execSync('npm run db:seed', { stdio: 'ignore' });
});
```

После teardown `site_settings` удаляется и восстанавливается через `npm run db:seed` (который внутри вызывает `seedSiteContent` — тот же idempotent insert). После шага 2 в `seed.ts` должно появиться поле `whatsapp`. Если оно не появится — после afterAll будет строка без `whatsapp`, и последующие тесты из `site-content.spec.ts`, которые проверяют footer (`a[href*="instagram.com"]`), пройдут нормально, но тест «wa.me-ссылка в футере» (новый из шага 2) не пройдёт при перезапуске, если teardown `site-admin` выполнился первым. Шаг 2 описывает добавление нового теста в `site-admin.spec.ts`, но не описывает синхронизацию afterAll.

### 6. `seed-site.ts` — отдельный файл `src/core/db/seed-site.ts` не упомянут в шаге 2 для исправления
**Файл:** `src/core/db/seed-site.ts` строки 27-40

Шаг 2, пункт 4 «Сид» говорит: «в `src/core/db/seed-site.ts` добавить `whatsapp` = значение первого телефона». Это правильно. Но в `src/core/db/seed.ts` функция `seedSiteContent()` (строки 109-145) — это **дублирование той же логики**, и она тоже вызывает `updateSiteSettings` без `whatsapp`. При добавлении `whatsapp` в `SiteSettingsInput` оба файла сломают typecheck. Шаг 2 должен исправить оба файла.

### 7. Шаг 4 ссылается на строки ProductDetail.tsx которые не точны
**Файл:** `task_tracker/todo/cart-whatsapp/step_4_product_add_to_cart.md` строки 19-20

Шаг 4 пишет: «Сейчас размеры активного цвета рендерятся как `<span>` (строки 156-170)». По факту это строки 156-169 в текущей версии файла. Строка 202 («Доставка по Казахстану. Возврат 30 дней.») — фактически строка 202 в `ProductDetail.tsx`, что совпадает. **Незначительное расхождение, не блокер.**

### 8. `OrderView.createdAt` — Date vs string потребует внимания в маппере
**Файл:** `src/core/db/schema.ts` строки 189-193

Схема `orders.createdAt` — это `timestamp` с `withTimezone`. Drizzle возвращает `Date`. Шаг 1 описывает `OrderView.createdAt: string // ISO — Date не сериализуется в client props` — правильно, нужен ручной маппер в `mapOrderToView`. Но при реализации `listOrders` нужно явно звать `.toISOString()` — иначе TypeScript пропустит (Drizzle типизирует как `Date`), а runtime сломается при передаче в клиентские props. Описание шага 1 это не акцентирует.

### 9. Шаг 7 предлагает `@/components/admin/ui/Select` для `OrderStatusSelect` — компонент существует
**Файл:** `src/components/admin/ui/Select.tsx`

`Select` экспортируется через `named export` (`export const Select`), не default. Шаг 7 пишет «`<Select>` из `@/components/admin/ui/Select`» — это правильно. Подтверждено.

### 10. Шаг 8 ссылается на `zod в repository.ts:303`
**Файл:** `src/core/catalog/repository.ts` строка 303

Проверено — zod-валидация `marketplaces: z.record(z.enum(MarketplaceValues), z.string()).optional()` находится на строке 303. Актуально.

---

## Мелочи (можно по ходу)

### 11. `AvailabilityButton.tsx` в e2e проверяется только через progress.md
**Файл:** `e2e/product.spec.ts`

Текущий `e2e/product.spec.ts` содержит только один тест — 404 для несуществующего слага. Тест на `data-testid="availability-button"` в нём **не существует** (несмотря на то что `progress.md` строка 19 утверждает обратное: «`data-testid="availability-button"` пинится в `e2e/product.spec.ts`»). Это неверная информация в progress.md. При удалении `AvailabilityButton.tsx` e2e сломать нечего — но `grep -r "availability-button" src e2e` в критерии шага 4 верно проверит отсутствие компонента.

### 12. `qrcode` не установлен
**Файл:** `package.json`

Пакет `qrcode` отсутствует в зависимостях (`npm list qrcode` — not found). Шаг 6 корректно описывает установку: `npm i qrcode && npm i -D @types/qrcode`. Это нужно выполнить явно.

### 13. Шаг 4: `ProductDetail` сейчас не принимает `whatsapp` prop — сигнатура изменится
**Файл:** `src/components/product/ProductDetail.tsx` строка 13-20

Текущая сигнатура: `{ product: Product; images?: MediaAsset[] }`. После шага 4 добавится `whatsapp?: string | null`. Страница `catalog/[slug]/page.tsx` также передаёт `<ProductDetail>` без `whatsapp` — нужно обновить оба. Шаг 4 это описывает, но не явно указывает на необходимость обновить сигнатуру `ProductDetail` (описывает только что передать `whatsapp` из страницы).

### 14. `site-content.spec.ts` тест footer проверяет ровно 1 ссылку на `instagram.com`
**Файл:** `e2e/site-content.spec.ts` строка 42

```ts
await expect(footer.locator('a[href*="instagram.com"]')).toHaveCount(1);
```

После шага 2 в footer добавляется ссылка WhatsApp, НО не Instagram. Этот тест не сломается. Однако шаг 2 инструктирует добавить WhatsApp-ссылку «рядом с Instagram» в секцию «Связь». Структура footer — массив `contactLinks`. Тест ищет по `href*="instagram.com"` — WhatsApp ссылка `https://wa.me/...` не совпадёт. **Всё ок.**

### 15. Нет `@types/qrcode` — TypeScript может упасть на `import QRCode from 'qrcode'`
Шаг 6 ставит `npm i -D @types/qrcode`, что правильно. Без них TypeScript упадёт на `import QRCode from 'qrcode'`.

---

## Не найдено проблем

- `serial` из `drizzle-orm/pg-core` — экспортируется, проверено через node.
- `@/components/admin/ui/Select` — существует, named export, совместим с шагом 7.
- `adminSections` в `sections.ts` — поле `{ id: 'orders', ..., enabled: false }` существует на строке 16. Шаг 7 правильно указывает `enabled: true`.
- `cleanMarketplaces` в `product-mapper.ts` — существует, выбрасывает пустые строки. Шаг 8 правильно описывает только добавление UI без изменения логики.
- `MarketplaceLinks` в `ProductDetail.tsx` строка 200 — рендерится при наличии marketplaces. Шаг 8 корректно описывает только UI формы.
- `ConfirmButton` в `src/components/admin/ui/ConfirmButton.tsx` — существует. Шаг 5 говорит «не тащить admin/ui, сделать локально» — правильное решение.
- `formatPrice` в `@/core/catalog/client` (`src/core/catalog/format.ts`) — экспортируется. Шаг 5 правильно ссылается на него.
- `inArray` из `drizzle-orm` — стандартный helper, доступен.
- `requireAdmin` возвращает `Promise<void>` с redirect — шаг 7 (`orders/page.tsx`) правильно описывает паттерн.
- `force-dynamic` на странице каталога (`catalog/[slug]/page.tsx`) — уже стоит. Шаг 4 не нарушает этого.
