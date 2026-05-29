import { CATEGORY_LABELS, CATEGORY_ORDER, getProductsByCategory, isValidCategory, type ProductCategory } from '@/core/catalog';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';

// SSG off: catalog reads live data from the DB (Variant A). Rendered per request.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Каталог — Tanar',
  description: 'Куртки, брюки, шорты, футболки и поло Tanar.',
};

type Props = { searchParams: Promise<{ category?: string }> };

const categories: ProductCategory[] = CATEGORY_ORDER;

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.category;
  const active: ProductCategory | null = isValidCategory(raw) ? raw : null;
  const filtered = await getProductsByCategory(active);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          Каталог
        </h1>
        <p className="mt-4 text-lg text-stone-500">
          Всё для встречи рассвета
        </p>
      </div>

      {/* Filter chips */}
      <div className="mb-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/catalog"
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
            active === null
              ? 'bg-stone-900 text-stone-50'
              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          Все
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/catalog?category=${cat}`}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              active === cat
                ? 'bg-stone-900 text-stone-50'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      {/* Product grid */}
      <div
        data-testid="catalog-grid"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {filtered.length > 0 ? (
          filtered.map((p) => <ProductCard key={p.slug} product={p} />)
        ) : (
          <p className="col-span-full text-center text-stone-400">
            Скоро здесь появятся товары
          </p>
        )}
      </div>
    </section>
  );
}
