import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { CATEGORY_LABELS, formatPrice, getProductGradient, type Product } from '@/core/catalog';
import type { MediaAsset } from '@/core/media/client';
import { srcSetFromUrl } from '@/core/media/client';

export default function ProductCard({
  product,
  image,
}: {
  product: Product;
  /** Primary image (first sortOrder of the first variant), if any. */
  image?: MediaAsset;
}) {
  const isComingSoon = product.status === 'coming_soon';
  const showImage = image && !isComingSoon;

  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="group transition-transform duration-300 hover:-translate-y-1"
      data-testid="product-card"
      data-category={product.category}
    >
      <div className="relative">
        {showImage ? (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              srcSet={srcSetFromUrl(image.url)}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              alt={image.alt ?? `${product.name}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          <Placeholder label={product.name} gradient={getProductGradient(product)} aspect="portrait" />
        )}
        {isComingSoon && (
          <span className="absolute right-3 top-3 rounded-full bg-stone-900/80 px-3 py-1 text-xs font-medium uppercase tracking-wider text-stone-100">
            Скоро
          </span>
        )}
      </div>

      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-stone-500/60">
        {CATEGORY_LABELS[product.category]}
      </p>
      <h3 className="mt-1 text-sm font-medium text-stone-900 group-hover:text-stone-600">
        {product.name}
      </h3>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {isComingSoon ? 'Скоро в продаже' : formatPrice(product.price)}
        </p>
        {product.variants.length > 1 && (
          <ColorDots variants={product.variants} />
        )}
      </div>
    </Link>
  );
}

function ColorDots({ variants }: { variants: Product['variants'] }) {
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
