# Шаг 5: E2E — slug-автоген, статусы, витрина-поля, specs

> Зависит от: шаги 1-4.
> Статус: [ ] pending

## Задача

Playwright-спека на новый функционал. Расширить существующий `e2e/admin-crud-media.spec.ts` или новый `e2e/storefront-completion.spec.ts`. Существующие тесты не трогать.

### Предусловие
- `npm run db:up && npm run db:seed`. Логин-хелпер из admin.spec.
- Фикстура картинки уже есть (`e2e/fixtures/sample.png`) — для тестов фото не обязательна тут.

### Тесты (`e2e/storefront-completion.spec.ts`, `describe.serial`)
> slug тест-товара: name «Тестовая Куртка X1» → по канон-таблице транслита (шаг 1) → **`testovaya-kurtka-x1`**. Использовать как ожидаемый slug во всех тестах (константа).
1. **slug-автоген:** логин → `/admin/catalog/new` → заполнить `#name` = «Тестовая Куртка X1» → поле `#slug` стало `testovaya-kurtka-x1` (точное равенство) и read-only. Заполнить цвет/размер → Создать → URL `/admin/catalog/testovaya-kurtka-x1/edit`.
2. **specs-редактор (round-trip, БЕЗ витрины):** на edit нового товара → добавить характеристику «Материал»/«Нейлон» → Сохранить → снова открыть edit-страницу → инпут характеристики содержит «Материал»/«Нейлон» (проверка через БД round-trip; витрину НЕ трогаем — товар ещё draft → 404). Витринную видимость specs проверяет п.4 после publish.
3. **статус draft скрыт:** товар создан draft по умолчанию → `/catalog/testovaya-kurtka-x1` → 404 (`response.status()===404`); в `/catalog` его карточки нет.
4. **publish → виден + поля:** edit → статус «Опубликован» → Сохранить → `/catalog/testovaya-kurtka-x1` → 200; видны: размеры (size-чип), характеристика «Материал» из п.2.
5. **archived скрыт:** edit → статус «Архив» → Сохранить → `/catalog/testovaya-kurtka-x1` → 404.
6. **витрина-поля боевого товара:** `/catalog/jacket-sv7-goretex` → виден бейдж «GORE-TEX®», список размеров (хотя бы один size-чип).
7. **дубль slug → автоинкремент:** создать ещё один товар с тем же name «Тестовая Куртка X1» (или взять боевой как базу) → ожидаемый slug `testovaya-kurtka-x1-2`, редирект на `/admin/catalog/testovaya-kurtka-x1-2/edit` (НЕ ошибка, НЕ 500). Учесть порядок serial: этот товар создаётся, пока первый ещё существует (до его archive/delete) — либо разместить тест до п.5 (archive не удаляет, slug остаётся занят), либо явно создать оба в начале.
8. **delete cleanup:** удалить тестовые товары (или afterAll db:seed уберёт).

### Idempotency / cleanup
- `afterAll`: `db:seed` (вернуть боевой каталог). Если создавались файлы фото — `rmSync` тест-папки (как в admin-crud-media). Тут фото не грузим → только db:seed.
- `workers:1, fullyParallel:false` (уже в конфиге) — гонок между spec нет. Не менять.

## Команды для верификации
```powershell
# ВАЖНО: остановить запущенный dev-сервер ПЕРЕД build (build затирает .next под dev → dev падает ENOENT; грабля из progress.md). Playwright поднимет свой сервер на 3001.
npm run db:up; npm run db:seed
npm run build
npm run test:e2e   # ВСЕ зелёные (прежние + новые)
```

## Критерии готовности
- [ ] Спека покрывает: slug-автоген, specs-редактор, draft скрыт (404), publish→виден, archived→404, витрина-поля (размеры/бейдж)
- [ ] `afterAll` → db:seed; тестовые данные убраны
- [ ] Прежние e2e не сломаны
- [ ] `npm run test:e2e` — все зелёные
- [ ] Коммит: `test(e2e): slug autogen, status visibility, storefront fields, specs`
