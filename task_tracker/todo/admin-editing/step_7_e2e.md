# Шаг 7: E2E — логин, guard, список, редактирование

> Зависит от: шаги 1-6
> Статус: [x] done

> **Реализация:** `e2e/admin.spec.ts` (6 тестов) + загрузка `.env.local` в `playwright.config.ts` через `@next/env` `loadEnvConfig` (Playwright-процесс сам .env.local не читает). `afterAll` → `db:seed` страховка. **Найден реальный баг при e2e:** `Product.marketplaces` приходит как `{ozon:undefined,kaspi:undefined}`, zod `z.record(enum,string)` отвергает undefined → save падал. Фикс в маппере (`cleanMarketplaces` дропает undefined-ключи). Итог: 45/45 e2e зелёные (39 витрина + 6 admin).

## Задача

Playwright-спека на админку. Витринные 39 тестов не трогаем — добавляем `e2e/admin.spec.ts`.

### Предусловие тестов
- env `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` должны быть в окружении, под которым поднимается тест-сервер (playwright `webServer` / `reuseExistingServer`). Пароль для теста взять из env (НЕ хардкодить секрет в спеку — читать `process.env.ADMIN_PASSWORD`). Зафиксировать в spec: `const PASSWORD = process.env.ADMIN_PASSWORD!`.

### `e2e/admin.spec.ts`
1. **guard-redirect:** goto `/admin/catalog` без cookie → URL стал `/admin/login`.
2. **неверный пароль:** на `/admin/login` ввести мусор → остаёмся на login, видна ошибка.
3. **логин:** ввести `PASSWORD` → редирект на `/admin/catalog`, виден список.
4. **список:** на `/admin/catalog` после логина — 12 строк товаров (или `>0`, фиксированное 12 для строгости как в smoke), ссылки на edit; кнопка «Создать» — `disabled` (`toBeDisabled()`).
5. **disabled-элементы на форме:** открыть `/admin/catalog/jacket-sv7-goretex/edit` → форма предзаполнена (поле name содержит имя, цена 80000); кнопка «Удалить» `toBeDisabled()`, блок «Фото» виден.
6. **редактирование→сохранение (идемпотентно, ОДИН зафиксированный способ):**
   - в начале теста прочитать текущее `name` товара `jacket-sv7-goretex` из формы → сохранить в переменную `original`;
   - поменять `name` на тестовое (`original + ' [e2e]'`) → submit → URL `/admin/catalog`, тестовое имя видно в списке;
   - снова открыть edit того же товара → вернуть `name = original` → submit (откат в том же тесте);
   - **плюс страховка:** в `test.afterAll` (или `afterEach` этого describe) — не полагаться только на UI-откат: если тест упал между submit'ами, восстановить БД. Простейшее — хук вызывает `npm run db:seed` (через `child_process`/`execSync`) ИЛИ помечает, что после прогона нужен `db:seed`. Зафиксировано: `afterAll` запускает `db:seed` (детерминированно возвращает боевой каталог 12/30/109). Это убирает зависимость идемпотентности от успешного UI-отката.
7. **logout:** кнопка Logout → редирект на login; повторный заход на `/admin/catalog` → снова login.

> Тесты используют storageState или логинятся в `beforeEach`. Проще — логин в начале каждого теста, требующего auth (через хелпер `login(page)`).

### playwright config
- Проверить, что `webServer` поднимается с нужными env (`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`). Если config не пробрасывает env — добавить через `.env.local` (next dev читает) или `webServer.env`. Зафиксировать: e2e полагается на `.env.local`, как и db.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run build
npm run test:e2e   # ВСЕ зелёные (39 витринных + новые admin)
```

## Критерии готовности
- [ ] `e2e/admin.spec.ts`: guard-redirect, неверный пароль, логин, список(12 + create disabled), форма(предзаполнена + delete/photo disabled), edit→save, logout
- [ ] Пароль читается из `process.env.ADMIN_PASSWORD` (не хардкод)
- [ ] Тест редактирования идемпотентен: UI-откат к исходному `name` + `afterAll` с `db:seed` как страховка (не зависит от успеха отката)
- [ ] Витринные e2e не изменены и проходят
- [ ] `npm run test:e2e` — все зелёные
- [ ] Коммит: `test(e2e): admin auth + catalog edit flow`
