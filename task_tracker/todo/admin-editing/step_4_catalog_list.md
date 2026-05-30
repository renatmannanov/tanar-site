# Шаг 4: Раздел /admin/catalog — список товаров

> Зависит от: шаг 3 (shell + `requireAdmin()` в admin-auth)
> Статус: [ ] pending

## Задача

Страница списка товаров каталога в админке со ссылками на редактирование и неактивной кнопкой создания.

### Страница — `src/app/admin/catalog/page.tsx`
- Серверный компонент. Первой строкой `await requireAdmin()` (guard).
- `const products = await getAllProducts()` из `@/core/catalog`.
- Таблица/список: колонки — name, category (через `CATEGORY_LABELS`), priceBase (price), статус, число вариантов (`variants.length`), суммарный остаток (Σ skus.stockQty). Каждая строка — ссылка на `/admin/catalog/<slug>/edit`.
- Заголовок раздела + кнопка **«Создать товар»** — `disabled` (тултип «Доступно в Плане C»). В DOM присутствует.
- Пустое состояние — на случай пустой БД (не блокер: боевые 12 есть).

> Только чтение + навигация. Никакой записи в этом шаге.

## Тесты
- e2e — шаг 7 (список показывает 12, ссылки на edit, кнопка создания disabled).

## Команды для верификации
```powershell
npm run db:up; npm run db:seed   # боевые данные (предусловие)
npm run typecheck
npm run lint
npm run build
npm run dev   # /admin/catalog → 12 строк, клик по товару ведёт на /edit; «Создать» серая/неактивная
```

## Критерии готовности
- [ ] `/admin/catalog` рендерит список из `getAllProducts` (12 боевых)
- [ ] Каждая строка ссылается на `/admin/catalog/<slug>/edit`
- [ ] Колонки: имя, категория (рус. ярлык), цена, статус, число вариантов, сумм. остаток
- [ ] Кнопка «Создать товар» присутствует, но `disabled`
- [ ] `requireAdmin()` вызывается (без cookie → redirect на login)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): catalog list page (read-only, create disabled)`
