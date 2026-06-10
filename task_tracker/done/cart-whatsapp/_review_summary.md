# Review Summary — cart-whatsapp

> Дата: 2026-06-10
> Ревью: code + risks + structure + coverage (sonnet × 4)

## Критичное (блокирует)

1. **Шаг 2 ломает typecheck: не учтён `src/core/db/seed.ts`** (code #2/#6, site-admin #5).
   `seedSiteContent()` в `seed.ts:109-145` вызывает `updateSiteSettings()` без поля
   `whatsapp`. Шаг 2 правит только `seed-site.ts`. После добавления `whatsapp` в
   `SiteSettingsInput` typecheck упадёт, а `npm run db:seed` (его зовут afterAll
   нескольких e2e-спеков) останется без whatsapp → флак новых тестов футера.
   **Фикс:** в шаге 2 править ОБА файла: `seed.ts` (seedSiteContent) и `seed-site.ts`.

2. **Шаг 6 правит `src/lib/cart.ts`, но в «Зависит от» нет шага 3** (structure, правило #5;
   risks #8). Параллельный запуск может перетереть файл шага 3 или упасть на
   отсутствующем `cartHash`. **Фикс:** «Зависит от» шага 6 += `шаг 3 (lib/cart.ts —
   тот же файл; saveLastOrder/loadLastOrder ДОПОЛНЯЮТ существующий файл, не новый)`.

## Важное

3. **Двойной сабмит оформления** (risks #3, [LIKELY]). Два клика «Оформить» до ответа
   action → два заказа с разными №. **Фикс:** в шаге 6 зафиксировать pending-гард:
   клик при `pending === true` — ранний return; кнопка disabled. Серверный дедуп —
   сознательно НЕ делаем (MVP, дубль виден в админке). Остаточный риск принят.

4. **Шаг 4: prop-цепочка whatsapp описана неявно** (code #4/#13, risks #2).
   **Фикс:** прописать явно: сигнатура `ProductDetail` получает `whatsapp: string | null`,
   страница передаёт, `ProductDetailComingSoon` получает проброс.

5. **Шаг 5: «Зависит от» не содержит шаг 3** (structure, правило #5) — оба правят
   `(public)/layout.tsx`. Транзитивно (5→4→3) порядок есть, но поле должно говорить
   явно. **Фикс:** «Зависит от» шага 5 += `шаг 3 (layout.tsx — тот же файл)`.

6. **Шаг 8: «либо/или» в тестах** (structure, правило #1). «admin-crud-media.spec.ts
   ИЛИ admin-marketplaces.spec.ts». **Фикс:** один путь — отдельный
   `e2e/admin-marketplaces.spec.ts`.

7. **coming_soon товара нет в сиде** (risks #4) — e2e шага 4 зависел бы от чужого
   спека. **Фикс:** зафиксировать один путь: спек сам создаёт coming_soon-товар через
   админ-UI в своём beforeAll (самодостаточный тест).

8. **Шаги 5→6, disabled-кнопка** (risks #7): формулировку уточнить — в шаге 5 подвал
   drawer выносится в отдельный компонент-заглушку с финальным API (правило #2),
   шаг 6 заменяет только его реализацию.

## Мелочи

- progress.md ошибается: `availability-button` НЕ пинится в `e2e/product.spec.ts`
  (там только 404-тест) — исправить строку, grep-критерий шага 4 остаётся.
- Шаг 1: `OrderView.createdAt` — явно `.toISOString()` в маппере (Drizzle отдаёт Date).
- Шаг 1: grep-верификация `'"number" serial'` может не сматчить форматирование
  drizzle-kit — ослабить до `grep -l '"number"' ... && grep -l '"whatsapp"' ...`.
- e2e QR: ждать `src^="data:image/"` через `expect(...).toHaveAttribute` (auto-wait),
  не assert сразу после клика (toDataURL асинхронный).
- wa.me URL при 30 длинных позициях может превысить ~2000 симв. [THEORETICAL] —
  для MVP принято, реальные заказы 1-5 позиций; не делаем.
- ALTER на прод-БД (orders.number serial backfill) — стандартно и обратимо
  (DROP COLUMN); прод-заметка уже в шаге 9.
- `:focus-visible` (coverage) — покрыто имплицитно стилями проекта, явный e2e не нужен.

## Противоречия между ревьюерами

- risks-агент ставит «двойной сабмит» в Критичное; сводка понижает до Важного:
  дубль не теряет данные (оба заказа видны в админке, статусы вручную) — фикс
  дешёвый pending-гард, серверная защита — overkill для MVP.
- code-агент #1 (порядок шагов 1↔2) — не проблема: у шага 2 уже стоит
  «Зависит от: шаг 1».

## Рекомендации

1. step_2: добавить правку `src/core/db/seed.ts` (seedSiteContent) рядом с seed-site.ts.
2. step_6: «Зависит от» += шаг 3; явная фраза «дополнить существующий lib/cart.ts».
3. step_5: «Зависит от» += шаг 3 (layout.tsx — тот же файл).
4. step_8: убрать «ИЛИ», оставить `e2e/admin-marketplaces.spec.ts`.
5. step_4: явная prop-цепочка whatsapp + самодостаточный e2e для coming_soon.
6. step_6: pending-гард от двойного клика.
7. step_5: подвал drawer = отдельный компонент-заглушка с финальным API.
8. Мелочи: progress.md (availability-button), toISOString, grep-критерий шага 1,
   QR-ассерт через toHaveAttribute.
