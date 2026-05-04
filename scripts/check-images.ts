import 'tsconfig-paths/register';
import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '@/data/products';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PRODUCTS_ROOT = resolve(REPO_ROOT, 'public', 'images', 'products');

async function exists(path: string): Promise<boolean> {
  try { await fs.access(path); return true; } catch { return false; }
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const product of products) {
    if (!product.variants) continue;
    for (const variant of product.variants) {
      for (const model of variant.models) {
        const base = resolve(PRODUCTS_ROOT, product.slug, variant.id);
        const required = [`front-${model}-card-md.webp`, `front-${model}-full-lg.webp`];
        for (const file of required) {
          if (!(await exists(resolve(base, file)))) {
            errors.push(`${product.slug}/${variant.id}/${file}`);
          }
        }
        for (const view of ['side', 'back']) {
          if (!(await exists(resolve(base, `${view}-${model}-full-lg.webp`)))) {
            warnings.push(`${product.slug}/${variant.id}/${view}-${model}-full-lg.webp (optional)`);
          }
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('Warnings (optional shots missing):');
    warnings.forEach(w => console.warn('  -', w));
  }
  if (errors.length > 0) {
    console.error('Missing required images:');
    errors.forEach(e => console.error('  -', e));
    process.exit(1);
  }
  console.log('✓ all variants have images');
}

main().catch((err) => { console.error(err); process.exit(1); });
