import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/product';

export default function FeaturedProducts() {
  const featured = products.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Избранное
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {featured.length > 0
          ? featured.map((p) => (
              <Link key={p.slug} href={`/catalog/${p.slug}`} className="group">
                <Placeholder label={p.name} gradient={p.gradient} aspect="portrait" />
                <h3 className="mt-3 text-sm font-medium text-stone-900 group-hover:text-stone-600">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-stone-500">{formatPrice(p.price)}</p>
              </Link>
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
