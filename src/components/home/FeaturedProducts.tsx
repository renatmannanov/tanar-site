import Placeholder from '@/components/Placeholder';
import ProductCard from '@/components/ProductCard';
import { getAllProducts } from '@/core/catalog';

export default async function FeaturedProducts() {
  const all = await getAllProducts();
  const featured = all.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Избранное
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {featured.length > 0
          ? featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Placeholder
                  label="Скоро здесь"
                  gradient="from-stone-600 to-stone-900"
                  aspect="portrait"
                />
              </div>
            ))}
      </div>
    </section>
  );
}
