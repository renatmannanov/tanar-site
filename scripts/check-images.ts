import 'tsconfig-paths/register';
import { promises as fs, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Checks that expected product photos exist on disk. Reads the verified catalog
// snapshot directly (not @/core/catalog) so it stays a pure filesystem check
// with no DB. Photos are expected only for variants that declare models; the
// real catalog has none yet (plan C adds them), so this is a no-op until then.
type SnapshotVariant = { colorId: string; models?: string[] };
type SnapshotProduct = { slug: string; variants: SnapshotVariant[] };
type Snapshot = { products: SnapshotProduct[] };

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PRODUCTS_ROOT = resolve(REPO_ROOT, 'public', 'images', 'products');
const SNAPSHOT_PATH = resolve(
  REPO_ROOT,
  'task_tracker',
  'done',
  'real-catalog-import',
  'catalog-snapshot.json',
);

async function exists(path: string): Promise<boolean> {
  try { await fs.access(path); return true; } catch { return false; }
}

async function main() {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;

  const errors: string[] = [];
  const warnings: string[] = [];
  let expectedAny = false;

  for (const product of snapshot.products) {
    for (const variant of product.variants) {
      for (const model of variant.models ?? []) {
        expectedAny = true;
        const base = resolve(PRODUCTS_ROOT, product.slug, variant.colorId);
        const required = [`front-${model}-card-md.webp`, `front-${model}-full-lg.webp`];
        for (const file of required) {
          if (!(await exists(resolve(base, file)))) {
            errors.push(`${product.slug}/${variant.colorId}/${file}`);
          }
        }
        for (const view of ['side', 'back']) {
          if (!(await exists(resolve(base, `${view}-${model}-full-lg.webp`)))) {
            warnings.push(`${product.slug}/${variant.colorId}/${view}-${model}-full-lg.webp (optional)`);
          }
        }
      }
    }
  }

  if (!expectedAny) {
    console.log('images:check: no product photos yet (expected until plan C)');
    process.exit(0);
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
