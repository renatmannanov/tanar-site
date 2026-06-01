# Шаг 6: Витрина читает media_assets (фолбэк градиент)

> Зависит от: шаг 2 (listProductImages)
> Статус: [ ] pending

## Задача

Переключить витрину с «фото по конвенции имён» (`images.ts`) на реальные `media_assets`. Где у варианта есть фото — показывать их; где нет — текущий CSS-градиент-фолбэк. Кадрирование `object-fit: cover`.

### Что сейчас (НЕ из БД)
`src/core/catalog/images.ts` (`getProductGalleryShots`/`getProductCardImage`) вычисляет пути из `variant.models`/`hasFlatShots`. Файлов для боевых товаров нет → потребители рендерят градиент. Потребители (товарные фото):
- `src/components/product/ProductDetail.tsx` — галерея на `/catalog/[slug]`.
- `src/components/ProductCard.tsx` — карточка в каталоге/related.
- `src/components/home/FeaturedProducts.tsx` — главная (читает БД, показывает товары; передаёт в `ProductCard`).

> `CategoriesGrid.tsx` — НЕ потребитель: это категорийные плашки с фиксированными градиентами, без товаров. НЕ трогать.

### Решение
- Витринные страницы (server components) грузят фото через `listProductImages(product.id)` из `@/core/media` и передают в компоненты (пропом), сгруппировав по variantId.
- **`ProductDetail`**: галерея выбранного цвета — из `media_assets` (sorted by sortOrder), `<img object-cover>` + srcset (url с подменой `-1600`→`-800`/`-400`). Нет фото у варианта → градиент-блок (как сейчас).
- **`ProductCard`** (в каталоге, related, FeaturedProducts): главное фото = первое по `sortOrder` первого варианта продукта. Нет → градиент.
- **Против N+1:** страница-список (`/catalog`, related, главная) грузит фото для ВСЕХ товаров ОДНИМ запросом `listProductImagesForProducts(productIds)` (из шага 2), затем раздаёт по карточкам. НЕ звать `listProductImages` в цикле по товарам.
- **Фолбэк-градиент** оставить (`src/core/catalog/gradient.ts`) — для товаров без фото (все боевые 12 на старте).
- `images.ts` (конвенция) — больше не использовать на витрине. Можно пометить `@deprecated` или удалить функции, если не останется потребителей (проверить grep). **Зафиксировано:** оставить файл, но переключить потребителей на media; неиспользуемые функции пометить deprecated-комментом (удаление — отдельно, чтобы не ломать demo-данные).

> Кадрирование — CSS `object-cover` с фиксированным аспектом контейнера (одно фото подходит для всех мест: карточка/деталь/главная). srcset даёт нужную ширину.

## Тесты
- e2e: товар с загруженным фото показывает `<img>` с url из media; товар без фото — градиент. Шаг 7.
- Витринные e2e (45) НЕ должны сломаться (товары без фото → градиент, как раньше).

## Команды для верификации
```powershell
npm run db:up; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run dev
# вручную: залить фото товару (шаг 5) → /catalog/<slug> показывает фото (не градиент); другой товар без фото → градиент
npm run test:e2e   # витринные зелёные
```

## Критерии готовности
- [ ] `ProductDetail` галерея рендерит `media_assets` выбранного цвета (object-cover, srcset), фолбэк градиент
- [ ] `ProductCard` (каталог/related/FeaturedProducts) показывает главное фото из media, фолбэк градиент; `CategoriesGrid` не тронут
- [ ] Список-страницы грузят фото одним запросом `listProductImagesForProducts` (без N+1)
- [ ] Товар без фото (боевые 12) → градиент, витрина не сломана (45 e2e зелёные)
- [ ] Витринные компоненты не импортят server-only media-impl (только данные пропом / client-safe)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(catalog): storefront gallery from media_assets (gradient fallback)`
