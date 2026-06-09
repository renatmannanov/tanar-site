import Placeholder from '@/components/Placeholder';
import ProductCard from '@/components/ProductCard';
import { getStorefrontProducts } from '@/core/catalog';
import { primaryImagesFor } from '@/lib/product-images';

export default async function FeaturedProducts() {
  const all = await getStorefrontProducts();
  const featured = all.slice(0, 4);
  const primaryImages = await primaryImagesFor(featured);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Избранное
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {featured.length > 0
          ? featured.map((p) => (
              <ProductCard key={p.slug} product={p} image={primaryImages.get(p.id)} />
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
