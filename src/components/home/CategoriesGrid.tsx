import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { CATEGORY_LABELS, type ProductCategory } from '@/core/catalog';

// Home page shows only the first 4 categories (no shorts) with decorative
// tile gradients. Labels come from the single CATEGORIES source; gradients
// are purely decorative here and unrelated to OUTDOOR_GRADIENTS.
const homeCategories: { id: ProductCategory; gradient: string }[] = [
  { id: 'jackets', gradient: 'from-emerald-800 to-stone-900' },
  { id: 'pants', gradient: 'from-amber-800 to-stone-900' },
  { id: 'tshirts', gradient: 'from-neutral-600 to-emerald-800' },
  { id: 'polo', gradient: 'from-stone-600 to-slate-900' },
];

export default function CategoriesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Категории
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {homeCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog?category=${cat.id}`}
            data-testid="category-card"
            className="group overflow-hidden rounded-lg transition-transform duration-200 hover:scale-[1.02]"
          >
            <Placeholder label={CATEGORY_LABELS[cat.id]} gradient={cat.gradient} aspect="square" />
          </Link>
        ))}
      </div>
    </section>
  );
}
