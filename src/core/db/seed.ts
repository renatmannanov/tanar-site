import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { db, queryClient } from './client';
import * as schema from './schema';
import { createProduct, getProductBySlug, type ProductInput } from '@/core/catalog';

// Import script for the real TANAR catalog. Reads the verified snapshot and
// populates the DB THROUGH the catalog write contract (createProduct) — the
// import is the first consumer that exercises that contract on real data.
// Keeps the `seed.ts` name so the `db:seed` npm script (a build/e2e
// precondition) stays unchanged.

// Guard: by default only the local dev/test databases. Prod seeding is the
// one-off catalog import (deploy step 6) — it requires ALLOW_PROD_SEED=1, passed
// INLINE at run time (never stored in .env, so the flag can't linger and re-fire
// a destructive TRUNCATE). A second, physical safety net (empty-catalog check)
// lives in main() below — that's what actually makes a repeat run impossible.
const url = process.env.DATABASE_URL ?? '';
const allowProdSeed = process.env.ALLOW_PROD_SEED === '1';
if (!/tanar_dev|tanar_test/.test(url) && !allowProdSeed) {
  throw new Error(
    `DATABASE_URL must point to tanar_dev or tanar_test for seed/reset; got: ${url}. ` +
      `For the one-off prod catalog import, run with ALLOW_PROD_SEED=1 (inline).`,
  );
}

// --- snapshot shape (only the fields we import into core) -------------------
type SnapshotSku = {
  size: string;
  ruSize?: string;
  article?: string;
  stock: number;
};
type SnapshotVariant = {
  colorId: string;
  colorLabel: string;
  hex: string;
  skus: SnapshotSku[];
};
type SnapshotProduct = {
  slug: string;
  category: ProductInput['category'];
  name: string;
  label?: { badge: string; sub: string };
  priceBase: number;
  description: string;
  care?: string | null;
  variants: SnapshotVariant[];
};
type Snapshot = {
  meta: { products: number; variants: number; skus: number };
  products: SnapshotProduct[];
};

function loadSnapshot(): Snapshot {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(
    here,
    '../../../task_tracker/done/real-catalog-import/catalog-snapshot.json',
  );
  return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
}

/** Maps a snapshot product to the catalog write contract's ProductInput. */
function toProductInput(p: SnapshotProduct): ProductInput {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    // status omitted → defaults to 'published' (all real products are live).
    priceBase: p.priceBase, // = Цена Kaspi (storefront base price)
    description: p.description,
    label: p.label,
    care: p.care ?? undefined, // snapshot has care:null x7; schema is nullable+optional
    // Ozon fields (ozonGroupId/priceOzon/ozonSku) are NOT imported into core —
    // they belong to the marketplace channel (phase 5). marketplaces stays {}.
    variants: p.variants.map((v) => ({
      colorId: v.colorId,
      colorLabel: v.colorLabel,
      hex: v.hex,
      models: [], // no real photos yet → storefront renders gradients (plan C adds photos)
      hasFlatShots: false,
      skus: v.skus.map((s) => ({
        size: s.size,
        ruSize: s.ruSize,
        article: s.article,
        stockQty: s.stock, // already 0 for unknown stock in the snapshot
      })),
    })),
  };
}

async function main() {
  const snapshot = loadSnapshot();

  // Physical safety net for the prod path: refuse if the catalog is already
  // populated. The dev/test flow truncates-and-reseeds freely (it runs many
  // times), so this only applies when seeding prod via the inline flag — there
  // it makes a repeat run (which would TRUNCATE the live catalog + media_assets)
  // physically impossible. The inline-only flag is the soft guard; this is hard.
  if (allowProdSeed && !/tanar_dev|tanar_test/.test(url)) {
    const existing = await db.$count(schema.products);
    if (existing > 0) {
      await queryClient.end();
      throw new Error(
        `Refusing to seed: catalog is not empty (${existing} products). ` +
          `The one-off prod import only runs against an empty catalog.`,
      );
    }
  }

  // Reset only the catalog tables. CASCADE is required: order_items.sku_id and
  // inventory_log.sku_id reference skus.id (FK without onDelete), so TRUNCATE
  // skus would otherwise fail when those tables are non-empty — and CASCADE
  // truncate reaches them regardless of onDelete. They are empty in plan A, so
  // no data is lost. This import is strictly a dev/one-off tool (the dev/test
  // guard above protects prod); it must NOT be run once real orders exist.
  await db.execute(
    sql`TRUNCATE products, product_variants, skus, media_assets CASCADE`,
  );

  for (const product of snapshot.products) {
    await createProduct(toProductInput(product));
  }

  // Self-check: counts derived from the snapshot (no hardcoded numbers).
  const expected = {
    products: snapshot.products.length,
    variants: snapshot.products.reduce((s, p) => s + p.variants.length, 0),
    skus: snapshot.products.reduce(
      (s, p) => s + p.variants.reduce((vs, v) => vs + v.skus.length, 0),
      0,
    ),
  };
  const actual = {
    products: await db.$count(schema.products),
    variants: await db.$count(schema.productVariants),
    skus: await db.$count(schema.skus),
  };
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    if (actual[key] !== expected[key]) {
      throw new Error(
        `import mismatch [${key}]: expected ${expected[key]}, actual ${actual[key]}`,
      );
    }
  }

  // Value spot-check: counts match even when field mapping is wrong, so verify
  // a known product's price and that an article landed.
  const sentinel = await getProductBySlug('jacket-sv7-goretex');
  if (!sentinel) throw new Error('import check: jacket-sv7-goretex not found');
  if (sentinel.price !== 80000) {
    throw new Error(`import check: jacket-sv7-goretex price=${sentinel.price}, expected 80000`);
  }
  const articles = sentinel.variants.flatMap((v) => v.skus.map((s) => s.article));
  if (!articles.includes('TANAR-001')) {
    throw new Error('import check: article TANAR-001 missing on jacket-sv7-goretex');
  }

  console.log('import OK:', actual);
  await queryClient.end();
}

main();
