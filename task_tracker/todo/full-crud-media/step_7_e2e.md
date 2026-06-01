# Шаг 7: E2E — CRUD + фото

> Зависит от: шаги 1-6
> Статус: [ ] pending

## Задача

Playwright-спека на полный CRUD и управление фото. Расширить `e2e/admin.spec.ts` или новый `e2e/admin-crud-media.spec.ts`. Витринные + admin (План B) тесты не трогать.

### Предусловие
- `npm run db:up && npm run db:seed`. env через `.env.local` (настроено).
- Фикстура-картинка: `e2e/fixtures/sample.png` (маленькая, ~100×100). Создать в этом шаге.
- Логин-хелпер — переиспользовать из `admin.spec.ts` (или скопировать `login(page)`).

### Тесты (`e2e/admin-crud-media.spec.ts`)
1. **create:** логин → `/admin/catalog` → «Создать товар» → `/admin/catalog/new` → заполнить (slug `e2e-test-product`, name, категория, цена, 1 цвет colorId/label/hex, 1 размер) → Создать → URL стал `/admin/catalog/e2e-test-product/edit`.
2. **upload фото:** на edit нового товара → в блоке цвета `setInputFiles(fixture)` → превью появилось (`img` в блоке), бейдж «Главное» виден.
3. **второе фото + reorder:** залить второе → стрелкой «←» на втором → порядок сменился (проверить, что «Главное» на другом).
4. **remove фото:** «×» на превью → ConfirmButton подтвердить → превью исчезло.
5. **витрина:** `/catalog/e2e-test-product` → виден `<img>` с src из `/images/products/e2e-test-product/` (не градиент).
6. **delete товара:** edit → «Удалить товар» → подтвердить → редирект на список, товара нет; `/catalog/e2e-test-product` → 404.
7. **upsert-инвариант (опц., через UI):** у боевого товара изменить name → сохранить → имя обновилось; (вариант id/reservedQty проверяются SQL-ом в шаге 1, здесь — UI-smoke).

### Idempotency / cleanup
- `afterAll`: `db:seed` (детерминированно вернуть боевой каталог) **+** удалить тестовые файлы `public/images/products/e2e-test-product/` (через `node:fs` rm recursive в хуке). Зафиксировано: оба действия в `afterAll`.
- **Гонка `db:seed` между spec-файлами:** `playwright.config.ts` уже `workers: 1, fullyParallel: false` (План B) — spec-файлы идут последовательно, гонки нет. НЕ менять на параллель. Проверить, что осталось `workers: 1`.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run build
npm run test:e2e   # ВСЕ зелёные (45 прежних + новые CRUD/media)
```

## Критерии готовности
- [ ] `e2e/fixtures/sample.png` создан
- [ ] Спека покрывает: create→edit, upload, reorder, remove, витрина с фото, delete→404
- [ ] `afterAll` чистит тестовые файлы из `public/` + `db:seed`
- [ ] Прежние 45 e2e не сломаны
- [ ] `npm run test:e2e` — все зелёные
- [ ] Коммит: `test(e2e): product CRUD + variant photo management`
