'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import AddToCartButton from '@/components/cart/AddToCartButton';
import MarketplaceLinks from '@/components/product/MarketplaceLinks';
import Placeholder from '@/components/Placeholder';
import {
  formatPrice,
  getProductGradient,
  type Marketplace,
  type Product,
} from '@/core/catalog/client';
// Client component → '@/core/inventory/client', never the server barrel
// (it pulls postgres into the bundle and breaks the build).
import { availableQty, stockLevel, type StockLevel } from '@/core/inventory/client';
import { type MediaAsset, srcSetFromUrl } from '@/core/media/client';
import { waLink } from '@/lib/whatsapp';

const GALLERY_ASPECT = 'aspect-[2/3]';

// Traffic-light dot per stock level; e2e asserts data-level, not the color.
const DOT_BG: Record<Exclude<StockLevel, 'out'>, string> = {
  high: 'bg-green-500',
  medium: 'bg-orange-400',
  low: 'bg-red-500',
};

export default function ProductDetail({
  product,
  images = [],
  whatsapp,
}: {
  product: Product;
  /** All product images (any variant), sorted; filtered per active color here. */
  images?: MediaAsset[];
  /** site_settings.whatsapp — drives the coming_soon «Узнать о наличии» link. */
  whatsapp: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const variants = product.variants;
  // Default to the first color that actually has photos (so a buyer lands on a
  // real gallery, not a gradient), falling back to the first color. An explicit
  // ?color= in the URL always wins over this default.
  const variantIdsWithPhotos = new Set(images.map((img) => img.variantId));
  const firstColorWithPhotos = variants.find((v) =>
    variantIdsWithPhotos.has(v.variantId),
  )?.id;
  const defaultColor = firstColorWithPhotos ?? variants[0]?.id ?? '';
  const colorParam = searchParams.get('color');
  const activeColor = variants.find((v) => v.id === colorParam)?.id ?? defaultColor;
  const activeVariant = variants.find((v) => v.id === activeColor);

  // Gallery images for the active color, from media_assets (sorted upstream).
  const shots = useMemo(
    () =>
      activeVariant
        ? images.filter((img) => img.variantId === activeVariant.variantId)
        : [],
    [images, activeVariant],
  );

  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const safeIndex = activeShotIndex < shots.length ? activeShotIndex : 0;
  const activeShot = shots[safeIndex];

  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);

  function handleColorChange(colorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('color', colorId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setActiveShotIndex(0);
    setSelectedSkuId(null); // size belongs to a color — re-pick after switching
  }

  if (product.status === 'coming_soon') {
    return <ProductDetailComingSoon product={product} whatsapp={whatsapp} />;
  }

  const descriptionParagraphs = product.description.split('\n\n');
  // Sizes of the active color, with live availability (stockQty - reservedQty).
  const sizes = activeVariant?.skus ?? [];
  // A single-size color is preselected automatically.
  const selectedSku =
    sizes.length === 1
      ? sizes[0]
      : (sizes.find((s) => s.id === selectedSkuId) ?? null);

  // Sku-level links override the product-level fallbacks; missing keys fall
  // back per-marketplace (Kaspi may be per-size while Ozon stays product-wide).
  const effectiveMarketplaces = {
    ...product.marketplaces,
    ...Object.fromEntries(
      Object.entries(selectedSku?.marketplaces ?? {}).filter(([, v]) => !!v),
    ),
  } as Partial<Record<Marketplace, string>>;

  const available = selectedSku ? availableQty(selectedSku) : 0;
  // available > 0 → the level is never 'out' (the cast keeps DOT_BG exhaustive).
  const level =
    selectedSku && available > 0
      ? (stockLevel(available) as Exclude<StockLevel, 'out'>)
      : null;
  const selectedSoldOut = selectedSku !== null && available <= 0;

  const cartItem =
    activeVariant && selectedSku && !selectedSoldOut
      ? {
          skuId: selectedSku.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          colorId: activeVariant.id,
          colorLabel: activeVariant.label,
          size: selectedSku.size,
          ruSize: selectedSku.ruSize,
          price: selectedSku.priceOverride ?? product.price,
          imageUrl: shots[0]?.url,
          available,
        }
      : null;

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      {/* Левая колонка: галерея */}
      <div className="space-y-4">
        {activeShot ? (
          <div className={`relative ${GALLERY_ASPECT} w-full overflow-hidden rounded-lg bg-stone-100`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeShot.url}
              srcSet={srcSetFromUrl(activeShot.url)}
              sizes="(max-width: 768px) 100vw, 50vw"
              alt={activeShot.alt ?? product.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {activeShot.aiGenerated ? (
              <span className="absolute bottom-2 left-2 rounded bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
                Изображение создано ИИ
              </span>
            ) : null}
          </div>
        ) : (
          // No photos for this color → gradient fallback (real catalog default).
          <Placeholder label={product.name} gradient={getProductGradient(product)} aspect="portrait" className="w-full" />
        )}
        {shots.length > 1 && (
          <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-6 md:gap-3 md:overflow-visible">
            {shots.map((shot, i) => (
              <button
                key={shot.id}
                type="button"
                onClick={() => setActiveShotIndex(i)}
                aria-label={shot.alt ?? `Фото ${i + 1}`}
                aria-pressed={i === safeIndex}
                className={`relative ${GALLERY_ASPECT} w-20 flex-shrink-0 overflow-hidden rounded-md ring-1 transition md:w-auto ${
                  i === safeIndex ? 'ring-stone-900' : 'ring-stone-200 hover:ring-stone-400'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shot.url}
                  srcSet={srcSetFromUrl(shot.url)}
                  sizes="120px"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Правая колонка: инфо */}
      <div>
        {product.label?.badge && (
          <span className="mb-3 inline-block rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-50">
            {product.label.badge}
          </span>
        )}

        <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900">
          {product.name}
        </h1>

        <p className="mt-4 font-display text-3xl font-bold text-stone-900">
          {formatPrice(product.price)}
        </p>

        {variants.length > 1 && activeVariant && (
          <div className="mt-6">
            <p className="text-sm text-stone-700">
              Цвет: <span className="font-medium">{activeVariant.label}</span>
            </p>
            <div className="mt-2 flex items-center gap-3">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
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

        {sizes.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-stone-700">Размеры</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((sku) => {
                const soldOut = availableQty(sku) <= 0;
                const isSelected = sku.id === selectedSku?.id;
                // Sold-out sizes stay clickable: picking one swaps the CTA to
                // «Узнать о поступлении» instead of adding to the cart.
                const stateClasses = soldOut
                  ? `line-through text-stone-400 border-stone-200 ${
                      isSelected ? 'ring-1 ring-stone-400' : 'hover:border-stone-300'
                    }`
                  : isSelected
                    ? 'border-stone-900 text-stone-900 ring-1 ring-stone-900'
                    : 'border-stone-300 text-stone-700 hover:border-stone-500';
                return (
                  <button
                    key={sku.id ?? sku.size}
                    type="button"
                    onClick={() => setSelectedSkuId(sku.id)}
                    aria-pressed={isSelected}
                    data-testid="size-option"
                    data-soldout={soldOut ? 'true' : undefined}
                    className={`rounded-md border px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-1 ${stateClasses}`}
                  >
                    {sku.ruSize ? `${sku.size} / ${sku.ruSize}` : sku.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4 text-stone-600 leading-relaxed">
          {descriptionParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {product.specs.length > 0 && (
          <dl className="mt-8 divide-y divide-stone-200">
            {product.specs.map((spec) => (
              <div key={spec.label} className="flex justify-between py-3">
                <dt className="text-sm font-medium text-stone-500">{spec.label}</dt>
                <dd className="text-sm text-stone-900">{spec.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {product.care && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-stone-500">Уход</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-stone-700 leading-relaxed">
              {product.care}
            </p>
          </div>
        )}

        <div className="mt-8">
          {selectedSoldOut && activeVariant && selectedSku ? (
            whatsapp ? (
              <a
                href={waLink(
                  whatsapp,
                  `Здравствуйте! Подскажите, когда появится «${product.name}» (${activeVariant.label}, ${selectedSku.size})?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="ask-restock"
                className="block w-full rounded-lg bg-stone-900 px-8 py-4 text-center text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
              >
                Узнать о поступлении
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full rounded-lg bg-stone-300 px-8 py-4 text-base font-medium text-stone-50 disabled:cursor-not-allowed"
              >
                Нет в наличии
              </button>
            )
          ) : (
            <AddToCartButton item={cartItem} />
          )}
          {/* The geography line below intentionally stays on product.marketplaces —
              its segments must not flicker as sizes are picked. */}
          <MarketplaceLinks marketplaces={effectiveMarketplaces} />
          <div className="mt-3 flex items-start justify-between gap-4 text-xs text-stone-400">
            {level ? (
              <span
                data-testid="stock-indicator"
                data-level={level}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${DOT_BG[level]}`}
                />
                В наличии
              </span>
            ) : (
              <span />
            )}
            <span className="text-right">
              Алматы — заказ через корзину
              {product.marketplaces?.kaspi ? ' · Казахстан — Kaspi' : ''}
              {product.marketplaces?.ozon ? ' · другие страны — Ozon' : ''}
              <br />
              Возврат 30 дней.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailComingSoon({
  product,
  whatsapp,
}: {
  product: Product;
  whatsapp: string | null;
}) {
  const descriptionParagraphs = product.description.split('\n\n');

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      <div className="relative">
        <Placeholder label={product.name} gradient={getProductGradient(product)} aspect="portrait" className="w-full" />
        <span className="absolute right-3 top-3 rounded-full bg-stone-900/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-100">
          Скоро в продаже
        </span>
      </div>
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900">
          {product.name}
        </h1>
        <div className="mt-6 space-y-4 text-stone-600 leading-relaxed">
          {descriptionParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        {whatsapp && (
          <div className="mt-8">
            <a
              href={waLink(
                whatsapp,
                `Здравствуйте! Подскажите, когда появится «${product.name}»?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="ask-availability"
              className="block w-full rounded-lg bg-stone-900 px-8 py-4 text-center text-base font-medium text-stone-50 transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
            >
              Узнать о наличии
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
