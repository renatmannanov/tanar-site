# Step 6: Карточка товара в каталоге — фото + точки цветов

> Статус: pending

## Цель

Заменить градиент-плейсхолдер в карточке товара на реальное фото (для товаров с `variants`). Под ценой добавить статичные цветные точки — индикатор доступных цветов. Заглушки "Скоро" остаются с градиентом + бейджем.

## Действия

### 1. Обновить `src/components/ProductCard.tsx`

Логика рендера превью:
- Если `product.comingSoon === true` → градиент + бейдж "Скоро в продаже"
- Если `product.variants` непустой → `<Image>` с фотографией дефолтного цвета (первый элемент variants), пропорция 4:5
- Иначе (нет вариантов и не coming soon — не должно быть, но на всякий случай) → градиент-фоллбек

Скелет:

**Важно**: текущий `ProductCard` экспортируется через `export default` — сохраняем default export, чтобы не сломать все импорты в `catalog/page.tsx`, `[slug]/page.tsx`, главной и т.д.

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { CATEGORY_LABELS, formatPrice, getProductCardImage, type Product } from '@/lib/product';

export default function ProductCard({ product }: { product: Product }) {
  const defaultVariant = product.variants?.[0];
  const cardImage = defaultVariant
    ? getProductCardImage(product.slug, defaultVariant.id, defaultVariant.models[0])
    : null;

  return (
    <Link href={`/catalog/${product.slug}`} className="group block">
      <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-md bg-gradient-to-br ${product.gradient}`}>
        {cardImage && !product.comingSoon ? (
          <Image
            src={cardImage.md}
            alt={`${product.name} — ${defaultVariant!.label}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-stone-100/80 text-sm uppercase tracking-wider">
              {product.name}
            </span>
          </div>
        )}
        {product.comingSoon && (
          <div className="absolute right-3 top-3 rounded-full bg-stone-900/80 px-3 py-1 text-xs uppercase tracking-wider text-stone-100">
            Скоро
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="text-xs uppercase tracking-wider text-stone-500">
          {CATEGORY_LABELS[product.category]}
        </div>
        <div className="text-base text-stone-900">
          {product.name}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-stone-700">
            {product.comingSoon ? '—' : formatPrice(product.price)}
          </div>
          {product.variants && product.variants.length > 1 && (
            <ColorDots variants={product.variants} />
          )}
        </div>
      </div>
    </Link>
  );
}

function ColorDots({ variants }: { variants: NonNullable<Product['variants']> }) {
  return (
    <div className="flex items-center gap-1.5">
      {variants.map((v) => (
        <span
          key={v.id}
          className="h-3 w-3 rounded-full ring-1 ring-stone-300"
          style={{ backgroundColor: v.hex }}
          title={v.label}
        />
      ))}
    </div>
  );
}
```

Точные классы — оставить в стиле текущих карточек (читается из текущего ProductCard.tsx). Главное:
- Контейнер `aspect-[3/4]` (компактный портрет, центр-кроп от sharp). Это совпадает с текущей пропорцией Placeholder с `aspect="portrait"`, визуально каталог не съедет
- `object-cover` чтобы фотка кропилась без искажений (но почти ничего не должно резаться — sharp уже вернул 3:4)
- `sizes` правильный для 3-колоночной сетки
- Точки цветов `h-3 w-3 rounded-full` (12px) — компактно, под информацией
- Точки показываем только если `variants.length > 1`
- Бейдж "Скоро" — pill в правом верхнем углу

### 2. Проверить, что страница каталога не сломалась

`/catalog` рендерит карточки в сетке. Проверить визуально что:
- 7 реальных товаров показывают фото
- 5 заглушек показывают градиенты с бейджем
- Фильтр по категориям работает (5 категорий вместо старых 4)
- Никаких пустых картинок (broken image)

### 3. Проверить "Избранное" на главной странице

Блок "Избранное" на главной (`/`) использует те же или похожие карточки товаров. Если используется тот же `ProductCard` — изменения автоматически применятся. Если есть отдельный компонент (например `FeaturedProductCard`) — обновить его так же:
- Пропорция `aspect-[3/4]`
- Использовать `getProductCardImage` для пути
- Не показывать точки цветов (на главной это лишний визуальный шум, оставим только в каталоге) — если же согласовано иначе, скопировать логику из ProductCard

### 4. Обновить фильтр-чипы (если нужно)

В `src/app/catalog/page.tsx` проверить, что фильтр по категориям использует `CATEGORY_ORDER` из `src/lib/product.ts` или `Object.keys(CATEGORY_LABELS)`. Если хардкод — заменить на импорт.

## Критерии готовности

- [ ] `src/components/ProductCard.tsx` обновлён
- [ ] Карточки реальных товаров показывают фотку (видна в браузере по `/catalog`)
- [ ] Карточки заглушек показывают градиент + бейдж "Скоро"
- [ ] Точки цветов появляются под ценой только для товаров с >1 цветом
- [ ] Точки имеют правильные hex (визуально совпадают с реальным цветом одежды)
- [ ] Фильтр-чипы в каталоге показывают 5 категорий (или 6 если "все")
- [ ] `npm run build` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] Нет console errors при рендере `/catalog`

## Verification

```bash
npm run build
npm run dev
# открыть http://localhost:3000/catalog, проверить визуально
```

## Что НЕ делать

- НЕ добавлять hover-смену фото при наведении на точку — точки статичные
- НЕ делать клик на точку → переход на цвет — клик идёт на всю карточку
- НЕ менять размер карточки или сетки каталога
