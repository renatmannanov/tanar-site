import { gradientFromString } from '@/lib/gradients';
import type { Product } from './types';

/** Presentation gradient for a product: explicit override or derived from slug. */
export function getProductGradient(product: Product): string {
  return product.gradient ?? gradientFromString(product.slug);
}
