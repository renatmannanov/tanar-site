# Шаг 4: Admin delete — deleteProductAction + кнопка

> Зависит от: **шаг 3** (тот же `actions.ts` + та же `ProductForm.tsx`) — ОБЯЗАТЕЛЬНО после шага 3, НЕ параллельно. ConfirmButton готов из Плана B.
> Статус: [ ] pending

## Задача

Активировать удаление товара: кнопка «Удалить товар» в форме edit → подтверждение → `deleteProductAction` → редирект на список.

### Server action — `src/app/admin/(protected)/catalog/actions.ts`
- Добавить `deleteProductAction(slug: string): Promise<{ error?: string }>`:
  - `await requireAdmin()`.
  - try: `await deleteProduct(slug)` (каскад снесёт variants/skus/media_assets). catch → `{ error }`.
  - ВНЕ try/catch: `revalidatePath('/admin/catalog')`, `revalidatePath('/catalog')`, `redirect('/admin/catalog')`.

> `deleteProduct` из `@/core/catalog` готов (План A). Каскад media_assets — по FK `onDelete: cascade`. **Файлы в `public/` каскад НЕ удалит** — это известный остаток (orphan-файлы). Зафиксировать в progress: чистка файлов при delete товара — отложенный пункт (не блокер; диск дёшев, можно добавить позже хук в deleteProduct или MediaStore.removeByProduct). НЕ делаем в этом шаге.

### Кнопка в форме — `src/components/admin/ProductForm.tsx`
- `ProductForm` получает новый опциональный проп `deleteAction?: () => Promise<{ error?: string }>` (уже bound на slug).
- Кнопка «Удалить товар» (сейчас `disabled`) рендерится ТОЛЬКО если `deleteAction` передан (т.е. на edit; на create проп не передаётся → кнопки нет). Реализовать через `ConfirmButton` (title «Удалить товар?», описание «Товар, все цвета, размеры и фото будут удалены безвозвратно», confirmLabel «Удалить товар»).
- `onConfirm` зовёт `deleteAction()` внутри `startTransition`; при `{error}` — показать ошибку (action сам редиректит при успехе).

> **Зависимость от шага 5:** шаг 5 добавит в `ProductForm` ещё пропы (`imagesByVariantId`/`mediaActions`). Здесь добавляем только `deleteAction`. Шаг 5 идёт ПОСЛЕ — он дополняет, не перезаписывает.

### Edit-page — `src/app/admin/(protected)/catalog/[slug]/edit/page.tsx`
- Передать в `ProductForm` проп `deleteAction={deleteProductAction.bind(null, product.slug)}`.

## Тесты
- e2e delete — шаг 7.

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: создать тестовый товар (шаг 3) → edit → «Удалить товар» → подтвердить → редирект на список, товара нет; /catalog/<slug> → 404
```

## Критерии готовности
- [ ] «Удалить товар» активна только в `mode==='edit'` (на create не рендерится)
- [ ] Клик → `ConfirmButton` (подтверждение), при подтверждении → `deleteProductAction`
- [ ] Удаление → товар и каскад (variants/skus/media_assets-строки) удалены, редирект на список, витрина `/catalog/<slug>` → 404
- [ ] Orphan-файлы в `public/` при delete — зафиксированы как отложенный пункт в progress.md (не чиним сейчас)
- [ ] Ассерт «Удалить товар disabled» в `e2e/admin.spec.ts` обновлён (кнопка теперь активна на edit); `npm run test:e2e` зелёный
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): delete product action + confirm button`
