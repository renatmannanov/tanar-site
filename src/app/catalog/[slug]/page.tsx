import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getAllProductSlugs,
  getRelatedProducts,
  formatPrice,
  CATEGORY_LABELS,
} from '@/lib/product';
import Placeholder from '@/components/Placeholder';
import ProductCard from '@/components/ProductCard';
import AvailabilityButton from '@/components/AvailabilityButton';
import Link from 'next/link';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Товар не найден — Tanar' };
  return {
    title: `${product.name} — Tanar`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const related = getRelatedProducts(product);

  const descriptionParagraphs = product.description.split('\n\n');

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-stone-500" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/catalog" className="hover:text-stone-900 transition-colors">
              Каталог
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/catalog?category=${product.category}`}
              className="hover:text-stone-900 transition-colors"
            >
              {CATEGORY_LABELS[product.category]}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-stone-900">{product.name}</li>
        </ol>
      </nav>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* Left: Gallery */}
        <div className="space-y-4">
          <Placeholder
            label={product.name}
            gradient={product.gradient}
            aspect="portrait"
            className="w-full"
          />
          <div className="grid grid-cols-3 gap-4">
            <Placeholder
              label={product.name}
              gradient={product.gradient}
              aspect="square"
            />
            <Placeholder
              label={product.name}
              gradient={product.gradient}
              aspect="square"
            />
            <Placeholder
              label={product.name}
              gradient={product.gradient}
              aspect="square"
            />
          </div>
        </div>

        {/* Right: Details */}
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900">
            {product.name}
          </h1>

          <p className="mt-4 font-display text-3xl font-bold text-stone-900">
            {formatPrice(product.price)}
          </p>

          <div className="mt-6 space-y-4 text-stone-600 leading-relaxed">
            {descriptionParagraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {/* Specs */}
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

          {/* CTA */}
          <div className="mt-8">
            <AvailabilityButton />
            <p className="mt-3 text-center text-xs text-stone-400">
              Доставка по Казахстану. Возврат 30 дней.
            </p>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold tracking-tight text-stone-900">
            Похожие товары
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
