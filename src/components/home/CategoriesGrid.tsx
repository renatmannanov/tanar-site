import Link from 'next/link';
import Placeholder from '@/components/Placeholder';

const categories = [
  { label: 'Куртки', href: '/catalog?category=jackets', gradient: 'from-emerald-800 to-stone-900' },
  { label: 'Худи', href: '/catalog?category=hoodies', gradient: 'from-stone-600 to-slate-900' },
  { label: 'Футболки', href: '/catalog?category=t-shirts', gradient: 'from-neutral-600 to-emerald-800' },
  { label: 'Штаны', href: '/catalog?category=pants', gradient: 'from-amber-800 to-stone-900' },
] as const;

export default function CategoriesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900">
        Категории
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            data-testid="category-card"
            className="group overflow-hidden rounded-lg transition-transform duration-200 hover:scale-[1.02]"
          >
            <Placeholder label={cat.label} gradient={cat.gradient} aspect="square" />
          </Link>
        ))}
      </div>
    </section>
  );
}
