import Link from 'next/link';
import Placeholder from '@/components/Placeholder';
import { CATEGORY_LABELS, formatPrice, type Product } from '@/lib/product';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="group transition-transform duration-300 hover:-translate-y-1"
      data-testid="product-card"
      data-category={product.category}
    >
      <Placeholder label={product.name} gradient={product.gradient} aspect="portrait" />
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-stone-500/60">
        {CATEGORY_LABELS[product.category]}
      </p>
      <h3 className="mt-1 text-sm font-medium text-stone-900 group-hover:text-stone-600">
        {product.name}
      </h3>
      <p className="mt-1 text-sm text-stone-500">{formatPrice(product.price)}</p>
    </Link>
  );
}
