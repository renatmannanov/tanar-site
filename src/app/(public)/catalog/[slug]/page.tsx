import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  getStorefrontProductBySlug,
  getStorefrontRelatedProducts,
  CATEGORY_LABELS,
} from '@/core/catalog';
import { listProductImages } from '@/core/media';
import { primaryImagesFor } from '@/lib/product-images';
import ProductCard from '@/components/ProductCard';
import ProductDetail from '@/components/product/ProductDetail';

// SSG off: catalog reads live data from the DB (Variant A). Rendered per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) return { title: 'Товар не найден — Tanar' };
  return {
    title: `${product.name} — Tanar`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getStorefrontProductBySlug(slug);
  if (!product) notFound();
  const related = await getStorefrontRelatedProducts(product);
  const images = await listProductImages(product.id);
  const relatedImages = await primaryImagesFor(related);

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

      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ProductDetail product={product} images={images} />
      </Suspense>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold tracking-tight text-stone-900">
            Похожие товары
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} image={relatedImages.get(p.id)} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
