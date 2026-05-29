import { eq, sql } from 'drizzle-orm';
import { db, queryClient } from './client';
import * as schema from './schema';
import { products as legacyProducts } from './seed-data';
import { productImagePath } from '@/core/catalog';

// Guard: never run against anything but the local dev/test databases.
const url = process.env.DATABASE_URL ?? '';
if (!/tanar_dev|tanar_test/.test(url)) {
  throw new Error(
    `DATABASE_URL must point to tanar_dev or tanar_test for seed/reset; got: ${url}`,
  );
}

type LegacyVariant = {
  id: string;
  label: string;
  hex: string;
  models: ('man' | 'girl')[];
  hasFlatShots?: boolean;
};

const VIEWS = ['front', 'side', 'back'] as const;

/** media_assets rows for one variant: lifestyle (per view × model) + flat (per view). */
function buildMediaRows(
  productId: string,
  variantId: string,
  slug: string,
  v: LegacyVariant,
) {
  const rows: (typeof schema.mediaAssets.$inferInsert)[] = [];
  let sortOrder = 0;

  // Lifestyle (with model)
  for (const model of v.models) {
    for (const view of VIEWS) {
      rows.push({
        scope: 'product',
        productId,
        variantId,
        view,
        model,
        role: 'lifestyle',
        url: productImagePath(slug, v.id, `${view}-${model}-full-lg.webp`),
        sortOrder: sortOrder++,
      });
    }
  }

  // Flat (studio) — only if the variant has flat shots
  if (v.hasFlatShots) {
    for (const view of VIEWS) {
      rows.push({
        scope: 'product',
        productId,
        variantId,
        view,
        model: 'flat',
        role: 'flat',
        url: productImagePath(slug, v.id, `${view}-flat-full-lg.webp`),
        sortOrder: sortOrder++,
      });
    }
  }

  return rows;
}

async function main() {
  // Idempotent: clear everything first (dev tool, not a prod data migration).
  await db.execute(
    sql`TRUNCATE products, product_variants, skus, media_assets, orders, order_items, inventory_log CASCADE`,
  );

  for (const legacy of legacyProducts) {
    const status = legacy.comingSoon ? 'coming_soon' : 'published';
    const [{ id: productId }] = await db
      .insert(schema.products)
      .values({
        slug: legacy.slug,
        name: legacy.name,
        category: legacy.category,
        status,
        priceBase: legacy.price,
        currency: legacy.currency,
        description: legacy.description,
        specs: legacy.specs,
        gradient: legacy.gradient ?? null,
        marketplaces: legacy.marketplaces ?? {},
      })
      .returning({ id: schema.products.id });

    for (const v of legacy.variants ?? []) {
      const [{ id: variantId }] = await db
        .insert(schema.productVariants)
        .values({
          productId,
          colorId: v.id,
          colorLabel: v.label,
          hex: v.hex,
          models: v.models,
          hasFlatShots: v.hasFlatShots ?? false,
        })
        .returning({ id: schema.productVariants.id });

      // One SKU of size 'OS' per variant (real sizes come in phase 1).
      await db.insert(schema.skus).values({
        variantId,
        size: 'OS',
        stockQty: 0,
        reservedQty: 0,
      });

      const mediaRows = buildMediaRows(productId, variantId, legacy.slug, v);
      if (mediaRows.length > 0) {
        await db.insert(schema.mediaAssets).values(mediaRows);
      }
    }
  }

  // Self-check: compare actual DB counts to expected counts derived from the
  // source array (no hardcoded numbers — survives catalog changes).
  const expected = {
    products: legacyProducts.length,
    published: legacyProducts.filter((p) => !p.comingSoon).length,
    comingSoon: legacyProducts.filter((p) => p.comingSoon).length,
    variants: legacyProducts.reduce((s, p) => s + (p.variants?.length ?? 0), 0),
    skus: legacyProducts.reduce((s, p) => s + (p.variants?.length ?? 0), 0),
    mediaAssets: legacyProducts.reduce((s, p) => {
      if (!p.variants) return s;
      return (
        s +
        p.variants.reduce((vs, v) => {
          const lifestyle = v.models.length * 3;
          const flat = v.hasFlatShots ? 3 : 0;
          return vs + lifestyle + flat;
        }, 0)
      );
    }, 0),
  };

  const actual = {
    products: await db.$count(schema.products),
    published: await db.$count(schema.products, eq(schema.products.status, 'published')),
    comingSoon: await db.$count(schema.products, eq(schema.products.status, 'coming_soon')),
    variants: await db.$count(schema.productVariants),
    skus: await db.$count(schema.skus),
    mediaAssets: await db.$count(schema.mediaAssets),
  };

  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    if (actual[key] !== expected[key]) {
      throw new Error(`seed mismatch [${key}]: expected ${expected[key]}, actual ${actual[key]}`);
    }
  }

  console.log('seed OK:', actual);
  await queryClient.end();
}

main();
