# Шаг 6: Edit-страница + updateProductAction → updateProduct

> Зависит от: шаг 5 (ProductForm + маппер), шаг 3 (`requireAdmin()`)
> Статус: [ ] pending

## Задача

Связать форму с боевой записью: edit-страница загружает товар, server action сохраняет через `updateProduct`.

### Server action — `src/app/admin/catalog/actions.ts` (`'use server'`)
```ts
'use server';
import { updateProduct, type ProductInput } from '@/core/catalog';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
// requireAdmin() в начале action (server actions вызываются и напрямую — проверить cookie).

export async function updateProductAction(
  slug: string, input: ProductInput,
): Promise<{ error?: string }> {
  await requireAdmin();
  // slug — идентификатор маршрута, НЕ редактируется формой. Форсируем routeSlug,
  // игнорируя input.slug, иначе updateProduct (productColumns пишет slug=input.slug)
  // «переедет» товар на новый slug и сломает старые URL.
  const safeInput = { ...input, slug };
  try {
    await updateProduct(slug, safeInput);   // zod-валидация внутри, бросает при ошибке
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }
  // ВНЕ try/catch — revalidate + redirect. redirect() кидает спец-исключение;
  // внутри try его проглотил бы catch и редирект бы не сработал.
  revalidatePath('/catalog');               // витрина force-dynamic; revalidate как страховка router cache
  revalidatePath(`/catalog/${slug}`);
  revalidatePath('/admin/catalog');
  redirect('/admin/catalog');               // успех → назад к списку
}
```
> `requireAdmin` в action обязателен: middleware покрывает навигацию, но server action — отдельный вход.

### Edit-страница — `src/app/admin/catalog/[slug]/edit/page.tsx`
- Серверный компонент. `await requireAdmin()`.
- `const product = await getProductBySlug(params.slug)`; если нет → `notFound()`.
- `const initial = productToInput(product)`.
- Рендерит `<ProductForm mode="edit" initial={initial} action={boundAction} />`, где `const boundAction = updateProductAction.bind(null, product.slug)` — даёт `(input) => Promise<{error?}>` (совпадает с пропом `action` формы). Использовать `.bind` (НЕ инлайн-стрелку: она была бы новой client-функцией и не сериализуется как server action reference).

> **Привязка slug:** `updateProductAction.bind(null, slug)` даёт `(input) => Promise<{error?}>` — совпадает с пропом `action` формы.

## Тесты
- e2e — шаг 7 (полный цикл: открыть edit, поменять поле, сохранить, проверить на витрине).

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: /admin/catalog/jacket-sv7-goretex/edit → поменять name → Сохранить →
#   редирект на список, новое имя там; открыть /catalog/jacket-sv7-goretex (витрина) → имя обновилось
# проверить БД: docker exec tanar-site-postgres-dev-1 psql -U tanar -d tanar_dev -c "SELECT name FROM products WHERE slug='jacket-sv7-goretex';"
# вернуть исходное имя (или повторный db:seed) после проверки
```

## Критерии готовности
- [ ] `updateProductAction(slug, input)` форсирует `slug` из маршрута (`{...input, slug}`), зовёт `updateProduct`, ловит ошибку → `{error}`, успех → revalidate + redirect ВНЕ try/catch
- [ ] slug товара не меняется после сохранения (проверить в БД: тот же slug)
- [ ] `requireAdmin()` в начале action
- [ ] `/admin/catalog/[slug]/edit` грузит товар (`getProductBySlug`+`productToInput`), `notFound()` на неизвестный slug
- [ ] Форма привязана к action через `.bind(null, slug)`
- [ ] Ручной цикл: правка name → сохранение → изменение видно на витрине и в БД
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): product edit page + updateProduct server action`
