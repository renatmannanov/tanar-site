# Шаг 3: Спрятать конвенцию путей к картинкам за функции

> Зависит от: нет
> Статус: [ ] pending

## Задача

Вынести файловую конвенцию путей к изображениям товаров в одно место внутри `src/lib/product.ts`, чтобы при будущем переходе на `MediaAsset` из БД менялась одна реализация. **Публичные сигнатуры `getProductCardImage` и `getProductGalleryShots` не меняются** — рефактор внутренний.

### Текущее состояние (`src/lib/product.ts`)

- `getProductCardImage(slug, color, model)` строит `/images/products/${slug}/${color}/front-${model}-card-{md,lg}.webp` (строки ~46-53).
- `getProductGalleryShots(product, color)` строит `/images/products/${product.slug}/${color}/${view}-${model}-full-lg.webp` и `${view}-flat-full-lg.webp` (строки ~55-88).

### Что сделать

1. Добавить единый базовый префикс и приватные хелперы сборки пути:
   ```ts
   const PRODUCT_IMAGE_BASE = '/images/products';

   // строит путь к одному файлу-варианту изображения товара
   function productImagePath(slug: string, color: string, file: string): string {
     return `${PRODUCT_IMAGE_BASE}/${slug}/${color}/${file}`;
   }
   ```
2. Переписать тела `getProductCardImage` и `getProductGalleryShots` так, чтобы все строковые пути собирались через `productImagePath(...)` / `PRODUCT_IMAGE_BASE`, без инлайн-литералов `/images/products/...`.
   - `getProductCardImage`: `front-${model}-card-md.webp`, `front-${model}-card-lg.webp`.
   - `getProductGalleryShots`: lifestyle `${view}-${model}-full-lg.webp`, flat `${view}-flat-full-lg.webp`.
3. Сигнатуры и возвращаемые значения (структура `{ md, lg }`, массив `GalleryShot`) — БЕЗ изменений. Алты, порядок шотов, логика flat/lifestyle — без изменений.

> Цель: единственное место, где зашита строка `/images/products/...` и шаблон имени файла. При переходе на БД заменяется реализация `productImagePath`/геттеров, вызовы в компонентах не трогаются.

## Тесты

- Поведение идентичное → все e2e зелёные. `product`-страница и карточки рендерят те же src.
- Проверить, что путей-литералов `/images/products` в этих функциях не осталось (только через константу/хелпер).

## Команды для верификации

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:e2e
# проверить что инлайн-литералы убраны из функций (ожидаем только определение PRODUCT_IMAGE_BASE):
Select-String -Path src\lib\product.ts -Pattern "/images/products"
```

## Критерии готовности

- [ ] `PRODUCT_IMAGE_BASE` + хелпер сборки пути добавлены
- [ ] `getProductCardImage` и `getProductGalleryShots` не содержат инлайн-литералов `/images/products/...` — только через константу/хелпер
- [ ] Публичные сигнатуры и возвращаемые структуры не изменились
- [ ] `npm run test:e2e` зелёный, картинки на сайте грузятся как раньше
- [ ] Коммит: `refactor(product): centralize product image path convention`
