'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import AvailabilityButton from '@/components/AvailabilityButton';
import MarketplaceLinks from '@/components/product/MarketplaceLinks';
import Placeholder from '@/components/Placeholder';
import { formatPrice, getProductGradient, type Product } from '@/core/catalog/client';
import { type MediaAsset, srcSetFromUrl } from '@/core/media/client';

const GALLERY_ASPECT = 'aspect-[2/3]';

export default function ProductDetail({
  product,
  images = [],
}: {
  product: Product;
  /** All product images (any variant), sorted; filtered per active color here. */
  images?: MediaAsset[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const variants = product.variants;
  const defaultColor = variants[0]?.id ?? '';
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

  function handleColorChange(colorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('color', colorId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setActiveShotIndex(0);
  }

  if (product.status === 'coming_soon') {
    return <ProductDetailComingSoon product={product} />;
  }

  const descriptionParagraphs = product.description.split('\n\n');

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

        <div className="mt-8">
          <AvailabilityButton />
          {product.marketplaces && <MarketplaceLinks marketplaces={product.marketplaces} />}
          <p className="mt-3 text-center text-xs text-stone-400">
            Доставка по Казахстану. Возврат 30 дней.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductDetailComingSoon({ product }: { product: Product }) {
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
      </div>
    </div>
  );
}
