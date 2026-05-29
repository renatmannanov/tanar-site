import { eq, ne, and } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type { ProductCategory } from '@/core/contracts';
import type { Product, ProductColor, Sku } from './types';

type ProductRow = typeof schema.products.$inferSelect;
type VariantRow = typeof schema.productVariants.$inferSelect;
type SkuRow = typeof schema.skus.$inferSelect;

type JoinedRow = {
  products: ProductRow;
  product_variants: VariantRow | null;
  skus: SkuRow | null;
};

function mapSku(row: SkuRow): Sku {
  return {
    id: row.id,
    size: row.size,
    priceOverride: row.priceOverride ?? undefined,
    stockQty: row.stockQty,
    reservedQty: row.reservedQty,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category as ProductCategory,
    status: row.status as Product['status'],
    price: row.priceBase,
    currency: row.currency as 'KZT',
    description: row.description,
    specs: row.specs,
    gradient: row.gradient ?? undefined,
    variants: [],
    marketplaces: row.marketplaces,
  };
}

function mapVariant(row: VariantRow): ProductColor {
  return {
    id: row.colorId,
    label: row.colorLabel,
    hex: row.hex,
    models: row.models,
    hasFlatShots: row.hasFlatShots,
    skus: [],
  };
}

/**
 * Groups flat (product × variant × sku) join rows into Product[].
 * One JOIN query → no N+1. Dedupes variants (a variant appears once per sku).
 * Preserves the order in which products first appear in `rows`.
 */
function groupRows(rows: JoinedRow[]): Product[] {
  const products = new Map<string, Product>();
  // productId -> (colorId -> ProductColor) for variant dedup
  const variantsByProduct = new Map<string, Map<string, ProductColor>>();
  // variant DB id -> ProductColor, for attaching skus
  const variantById = new Map<string, ProductColor>();
  const seenSku = new Set<string>();

  for (const row of rows) {
    const p = row.products;
    if (!products.has(p.id)) {
      products.set(p.id, mapProduct(p));
      variantsByProduct.set(p.id, new Map());
    }

    const v = row.product_variants;
    if (v) {
      const variantMap = variantsByProduct.get(p.id)!;
      if (!variantMap.has(v.colorId)) {
        const color = mapVariant(v);
        variantMap.set(v.colorId, color);
        variantById.set(v.id, color);
        products.get(p.id)!.variants.push(color);
      }

      const s = row.skus;
      if (s && !seenSku.has(s.id)) {
        seenSku.add(s.id);
        variantById.get(v.id)!.skus.push(mapSku(s));
      }
    }
  }

  return [...products.values()];
}

const baseSelect = () =>
  db
    .select()
    .from(schema.products)
    .leftJoin(
      schema.productVariants,
      eq(schema.productVariants.productId, schema.products.id),
    )
    .leftJoin(schema.skus, eq(schema.skus.variantId, schema.productVariants.id));

export async function getAllProducts(): Promise<Product[]> {
  const rows = await baseSelect();
  return groupRows(rows as JoinedRow[]);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const rows = await baseSelect().where(eq(schema.products.slug, slug));
  return groupRows(rows as JoinedRow[])[0];
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: schema.products.slug }).from(schema.products);
  return rows.map((r) => r.slug);
}

export async function getProductsByCategory(
  category: ProductCategory | null,
): Promise<Product[]> {
  if (!category) return getAllProducts();
  const rows = await baseSelect().where(eq(schema.products.category, category));
  return groupRows(rows as JoinedRow[]);
}

export async function getRelatedProducts(current: Product, limit = 3): Promise<Product[]> {
  const rows = await baseSelect().where(
    and(
      eq(schema.products.category, current.category),
      ne(schema.products.slug, current.slug),
    ),
  );
  return groupRows(rows as JoinedRow[]).slice(0, limit);
}
