# Step 7: Страница товара — галерея + переключатель цветов

> Статус: done

## Цель

На странице `/catalog/[slug]` для товаров с вариантами:
- Большое фото слева (оригинальная пропорция, без кропа) + миниатюры под ним (front/side/back × все типажи)
- Свотчи цветов справа между ценой и описанием с подписью "Цвет: X"
- Тык на свотч → меняется галерея + URL `?color=X`
- Тык на миниатюру → меняется большое фото
- Для заглушек "Скоро" — показывать градиент, скрыть кнопку и блок цветов

## Важное про пропорции и миниатюры

- **Большое фото**: используем `full-lg.webp` (1600w, оригинальная пропорция исходника). Слот в коде — `aspect-[2/3]` (предположение про оригинал; если фотограф снял в другой пропорции — поменять на `3/4` или что окажется на диске).
- **Миниатюры**: используют **тот же `full-lg.webp`** (просто меньшего размера через CSS), пропорция совпадает с большим фото — никаких сюрпризов при клике.
- **Сколько миниатюр**: до 6 штук на цвет (3 ракурса × 2 типажа м/ж). На десктопе — все в ряд (`grid grid-cols-6`), на мобайле — горизонтальный скролл (`flex overflow-x-auto`).

Если по факту окажется что у фотографа пропорция не 2:3 — поправить значение `aspect-*` после первого `npm run images`. Это easy fix.

## Действия

### 1. Сделать страницу товара клиентской (или гибридной)

Текущий `src/app/catalog/[slug]/page.tsx` — RSC. Для интерактивности (выбор цвета, обновление URL) нужен клиентский компонент. Подход:

- `page.tsx` остаётся серверным, делает `getProductBySlug` и передаёт `Product` в клиентский компонент `<ProductDetail product={product} />`
- Создать `src/components/product/ProductDetail.tsx` с `'use client'`
- Использовать `useSearchParams` + `useRouter` для синхронизации цвета с URL

### 2. Создать `src/components/product/ProductDetail.tsx`

Структура:

```tsx
'use client';

import Image from 'next/image';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, formatPrice, getProductGalleryShots, type Product } from '@/lib/product';

const GALLERY_ASPECT = 'aspect-[2/3]'; // подстроить под реальную пропорцию исходников

export function ProductDetail({ product }: { product: Product }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const variants = product.variants ?? [];
  const defaultColor = variants[0]?.id ?? '';
  const colorParam = searchParams.get('color');
  const activeColor = variants.find(v => v.id === colorParam)?.id ?? defaultColor;
  const activeVariant = variants.find(v => v.id === activeColor);

  const shots = useMemo(
    () => activeColor ? getProductGalleryShots(product, activeColor) : [],
    [product, activeColor]
  );

  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const activeShot = shots[activeShotIndex] ?? shots[0];

  function handleColorChange(colorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('color', colorId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setActiveShotIndex(0);
  }

  // Заглушка "Скоро": галерея = градиент, нет кнопки/цветов
  if (product.comingSoon) {
    return <ProductDetailComingSoon product={product} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Левая колонка: галерея */}
      <div>
        <div className={`relative ${GALLERY_ASPECT} w-full overflow-hidden rounded-md bg-stone-100`}>
          {activeShot && (
            <Image
              src={activeShot.src}
              alt={activeShot.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          )}
        </div>
        {shots.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto lg:grid lg:grid-cols-6 lg:overflow-visible">
            {shots.map((shot, i) => (
              <button
                key={`${shot.view}-${shot.model}`}
                onClick={() => setActiveShotIndex(i)}
                aria-label={shot.alt}
                className={`relative ${GALLERY_ASPECT} w-20 flex-shrink-0 overflow-hidden rounded-md ring-1 transition lg:w-auto ${
                  i === activeShotIndex ? 'ring-stone-900' : 'ring-stone-200 hover:ring-stone-400'
                }`}
              >
                <Image src={shot.src} alt="" fill className="object-cover" sizes="120px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Правая колонка: инфо */}
      <div className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">
            {CATEGORY_LABELS[product.category]}
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900 lg:text-4xl">
            {product.name}
          </h1>
          <div className="mt-2 text-xl text-stone-900">
            {formatPrice(product.price)}
          </div>
        </div>

        {variants.length > 1 && activeVariant && (
          <div>
            <div className="text-sm text-stone-700">
              Цвет: <span className="font-medium">{activeVariant.label}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleColorChange(v.id)}
                  aria-label={v.label}
                  aria-pressed={v.id === activeColor}
                  className={`h-8 w-8 rounded-full ring-2 ring-offset-2 transition ${
                    v.id === activeColor ? 'ring-stone-900' : 'ring-transparent hover:ring-stone-300'
                  }`}
                  style={{ backgroundColor: v.hex }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 text-stone-700 leading-relaxed">
          {product.description.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {product.specs.length > 0 && (
          <div className="border-t border-stone-200 pt-6">
            <dl className="space-y-3">
              {product.specs.map((spec) => (
                <div key={spec.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-stone-500">{spec.label}</dt>
                  <dd className="text-sm text-stone-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          {/* AvailabilityButton как было */}
        </div>
      </div>
    </div>
  );
}

function ProductDetailComingSoon({ product }: { product: Product }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className={`relative ${GALLERY_ASPECT} w-full overflow-hidden rounded-md bg-gradient-to-br ${product.gradient}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-stone-100/80 uppercase tracking-wider">{product.name}</span>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-stone-900/80 px-3 py-1 text-xs uppercase tracking-wider text-stone-100">
          Скоро в продаже
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">
            {CATEGORY_LABELS[product.category]}
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900 lg:text-4xl">
            {product.name}
          </h1>
        </div>
        <div className="space-y-4 text-stone-700">
          {product.description.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Важно про описание**: текущий `[slug]/page.tsx:36` уже использует `product.description.split('\n\n')` для разделения на абзацы. Мы переносим эту логику в `ProductDetail`, не теряем её — для будущих многоабзацных описаний работать будет.

### 3. Подстроить пропорцию галереи под реальные исходники

После того как step_3 (sharp pipeline) отработает на реальных фотках:
- Открыть `public/images/products/shell-jacket-khan/darkblue/front-girl-full-lg.webp`
- Посмотреть пропорцию: ширина / высота
- Если 2:3 (~0.67) — оставить `aspect-[2/3]`
- Если 3:4 (~0.75) — поменять `GALLERY_ASPECT` на `aspect-[3/4]`
- Если что-то другое — проставить ровно ту пропорцию

Важно: все исходники у фотографа должны быть одной пропорции. Если разные — это проблема, которую надо решить отдельно (либо при кропе унифицировать, либо разные слоты для разных товаров).

### 4. Обновить `src/app/catalog/[slug]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/product/ProductDetail';
import { getProductBySlug, getAllProductSlugs } from '@/lib/product';

export async function generateStaticParams() {
  return getAllProductSlugs().map(slug => ({ slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
      {/* Breadcrumb можно оставить как был */}
      <ProductDetail product={product} />
    </main>
  );
}
```

Сохранить breadcrumb (Каталог / Категория / Имя) и Related products (если был) — они работают на серверном уровне, ProductDetail рендерится между ними.

### 5. Обработать `?color=X` для несуществующих/невалидных цветов

Если в URL пришёл `?color=invalid` — фоллбек на дефолтный цвет (первый в variants), URL **не** перезаписывать (чтобы не было редиректов).

## Критерии готовности

- [ ] `src/components/product/ProductDetail.tsx` создан
- [ ] `src/app/catalog/[slug]/page.tsx` использует `ProductDetail`
- [ ] На странице реального товара видны:
  - Большое фото в оригинальной пропорции (не сплюснутое, не растянутое) + миниатюры (3 или 6)
  - Подпись "Цвет: X" + кружки цветов
  - Тык на цвет → меняется галерея + URL обновляется
  - Тык на миниатюру → меняется большое фото
  - Миниатюры на мобайле скроллятся горизонтально
- [ ] На странице заглушки "Скоро":
  - Градиент вместо фото
  - Бейдж "Скоро в продаже"
  - Нет кружков цветов
  - Нет кнопки "Узнать о наличии"
- [ ] Прямой переход по `/catalog/shell-jacket-khan?color=red` открывает с правильным цветом
- [ ] `npm run build` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] Нет console errors

## Verification

```bash
npm run build
npm run dev
# Проверить:
# http://localhost:3000/catalog/shell-jacket-khan
# http://localhost:3000/catalog/shell-jacket-khan?color=yellow
# http://localhost:3000/catalog/pants-charyn
```

## Что НЕ делать

- НЕ делать SSR для выбора цвета (только клиентский, через searchParams)
- НЕ убирать существующий компонент `AvailabilityButton` — переиспользовать как есть для реальных товаров
- НЕ менять breadcrumb / related products
- НЕ добавлять корзину, размеры, количество — только выбор цвета
- НЕ генерировать отдельный `card`-кроп для миниатюр — миниатюры используют тот же `full` файл что и большое фото
