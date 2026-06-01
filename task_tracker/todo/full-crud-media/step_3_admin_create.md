# Шаг 3: Admin create — /catalog/new + createProductAction

> Зависит от: нет (ProductForm mode=create готова из Плана B). ВАЖНО: шаг 4 редактирует тот же `actions.ts` — выполнять 3 → 4 → 5 СТРОГО последовательно, НЕ параллельно.
> Статус: [ ] pending

## Задача

Активировать создание товара: страница `/admin/catalog/new` с пустой формой → server action `createProductAction` → редирект на edit нового товара.

### Server action — `src/app/admin/(protected)/catalog/actions.ts`
- Добавить `createProductAction(input: ProductInput): Promise<{ error?: string }>`:
  - `await requireAdmin()` первой строкой.
  - try: `await createProduct(input)` (zod внутри). catch → `{ error }`.
  - ВНЕ try/catch: `revalidatePath('/admin/catalog')`, `revalidatePath('/catalog')`, `redirect('/admin/catalog/' + input.slug + '/edit')` (на edit нового товара — там грузят фото).

> `redirect()` ВНЕ try/catch. Импорт `createProduct` из `@/core/catalog`.

### Create-страница — `src/app/admin/(protected)/catalog/new/page.tsx`
- Серверный компонент. `await requireAdmin()`.
- Рендерит `<ProductForm mode="create" action={createProductAction} />` (без `initial` → форма берёт `EMPTY_INPUT`).
- `createProductAction` совпадает с пропом `action` формы (`(input) => Promise<{error?}>`).
- Заголовок «Новый товар».

### Список — `src/app/admin/(protected)/catalog/page.tsx`
- Кнопка «Создать товар»: убрать `disabled`/тултип, обернуть в `<Link href="/admin/catalog/new">` (или кнопка-навигация).

> На create-странице блок фото в форме покажет «Сначала сохраните товар» (реализуется в шаге 5 — `mode==='create'`).

### Обновить e2e (иначе красный прогон)
`e2e/admin.spec.ts` (План B) содержит ассерт, что кнопка «Создать товар» **`disabled`** (`toBeDisabled()`). После активации он упадёт. → В этом шаге найти и поправить: кнопка «Создать товар» теперь **enabled** и ведёт на `/admin/catalog/new` (заменить `toBeDisabled()` на проверку ссылки/перехода). Прогнать `npm run test:e2e` — зелёное.

## Тесты
- e2e create→edit — шаг 7.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: /admin/catalog → «Создать товар» → /admin/catalog/new → заполнить (slug, name, категория, цена, 1 цвет, 1 размер) → Создать → редирект на /admin/catalog/<slug>/edit, товар в БД
docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT slug, name FROM products WHERE slug='<test-slug>';"
# удалить тестовый товар вручную или db:seed
```

## Критерии готовности
- [ ] Кнопка «Создать товар» активна, ведёт на `/admin/catalog/new`
- [ ] `/admin/catalog/new` рендерит пустую `ProductForm mode="create"`
- [ ] `createProductAction`: `requireAdmin`, `createProduct`, ошибка → `{error}`, успех → редирект на edit нового товара (ВНЕ try/catch)
- [ ] Создание валидного товара → строка в БД, редирект на его edit-страницу
- [ ] Невалидный ввод (напр. пустой slug) → ошибка показана, остаёмся на форме
- [ ] slug-паттерн в `productInputSchema`: `slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: только строчные латинские, цифры, дефис')` — иначе пробелы/кириллица ломают redirect-URL. (Правка в `src/core/catalog/repository.ts` productInputSchema.)
- [ ] Ассерт «Создать товар disabled» в `e2e/admin.spec.ts` обновлён (кнопка enabled); `npm run test:e2e` зелёный
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): create product page + createProductAction`
