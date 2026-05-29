import { z } from 'zod';
import { eq, ne, and } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type {
  ProductCategory,
  ProductStatus,
  ProductImageModel,
  Marketplace,
} from '@/core/contracts';
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
    article: row.article ?? undefined,
    ruSize: row.ruSize ?? undefined,
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
    label: row.label ?? undefined,
    care: row.care ?? undefined,
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

// ---------------------------------------------------------------------------
// Write contract — the only sanctioned path for mutating the catalog.
// The import script (real-catalog-import) is the first consumer; admin CRUD
// (phases B/C) reuses these. Input is the domain WRITE shape: a whole product
// with nested variants and skus, no ids (the DB generates them).
//
// Price field is `priceBase` on the way in (mirrors the DB/snapshot), even
// though the read type `Product` projects it to `price`. Write = storage-shaped,
// read = domain projection.
// ---------------------------------------------------------------------------

const ProductCategoryValues = [
  'jackets',
  'pants',
  'shorts',
  'tshirts',
  'polo',
] as const satisfies readonly ProductCategory[];

const ProductStatusValues = [
  'draft',
  'published',
  'archived',
  'coming_soon',
] as const satisfies readonly ProductStatus[];

const ProductImageModelValues = [
  'man',
  'girl',
] as const satisfies readonly ProductImageModel[];

const MarketplaceValues = ['ozon', 'kaspi'] as const satisfies readonly Marketplace[];

const skuInputSchema = z.object({
  size: z.string().min(1),
  // `.nullable().optional()`: the snapshot omits these and createProduct may be
  // fed null from JSON — a bare `.optional()` would reject null with a ZodError.
  ruSize: z.string().nullable().optional(),
  article: z.string().nullable().optional(),
  priceOverride: z.number().int().nullable().optional(),
  stockQty: z.number().int().min(0).optional(),
});

const variantInputSchema = z.object({
  colorId: z.string().min(1),
  colorLabel: z.string().min(1),
  hex: z.string().min(1),
  models: z.array(z.enum(ProductImageModelValues)).optional(),
  hasFlatShots: z.boolean().optional(),
  skus: z.array(skuInputSchema).min(1),
});

const productInputSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(ProductCategoryValues),
  status: z.enum(ProductStatusValues).optional(),
  priceBase: z.number().int().min(0),
  currency: z.literal('KZT').optional(),
  description: z.string(),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  gradient: z.string().nullable().optional(),
  label: z
    .object({ badge: z.string(), sub: z.string() })
    .nullable()
    .optional(),
  care: z.string().nullable().optional(),
  marketplaces: z.record(z.enum(MarketplaceValues), z.string()).optional(),
  variants: z.array(variantInputSchema).min(1),
});

export type SkuInput = z.input<typeof skuInputSchema>;
export type VariantInput = z.input<typeof variantInputSchema>;
export type ProductInput = z.input<typeof productInputSchema>;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Inserts the variant/sku tree for an existing product id inside an open tx. */
async function insertVariantTree(
  tx: Tx,
  productId: string,
  input: z.infer<typeof productInputSchema>,
): Promise<void> {
  for (const variant of input.variants) {
    const [row] = await tx
      .insert(schema.productVariants)
      .values({
        productId,
        colorId: variant.colorId,
        colorLabel: variant.colorLabel,
        hex: variant.hex,
        models: variant.models ?? [],
        hasFlatShots: variant.hasFlatShots ?? false,
      })
      .returning({ id: schema.productVariants.id });

    await tx.insert(schema.skus).values(
      variant.skus.map((sku) => ({
        variantId: row.id,
        size: sku.size,
        ruSize: sku.ruSize ?? null,
        article: sku.article ?? null,
        priceOverride: sku.priceOverride ?? null,
        stockQty: sku.stockQty ?? 0,
        reservedQty: 0,
      })),
    );
  }
}

/** Maps a validated input's product-level columns to an insert/update payload. */
function productColumns(input: z.infer<typeof productInputSchema>) {
  return {
    slug: input.slug,
    name: input.name,
    category: input.category,
    status: input.status ?? 'published',
    priceBase: input.priceBase,
    currency: input.currency ?? 'KZT',
    description: input.description,
    specs: input.specs ?? [],
    label: input.label ?? null,
    care: input.care ?? null,
    gradient: input.gradient ?? null,
    marketplaces: input.marketplaces ?? {},
  };
}

/** Creates a product with its full variant/sku tree atomically. */
export async function createProduct(input: ProductInput): Promise<Product> {
  const parsed = productInputSchema.parse(input);
  await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(schema.products)
      .values(productColumns(parsed))
      .returning({ id: schema.products.id });
    await insertVariantTree(tx, product.id, parsed);
  });
  const created = await getProductBySlug(parsed.slug);
  if (!created) {
    throw new Error(`createProduct: product "${parsed.slug}" not found after insert`);
  }
  return created;
}

/**
 * Replaces a product's fields and its entire variant/sku tree. The product row
 * (and its id) is preserved — only its variants/skus are deleted and re-inserted.
 * Whole-object replacement: the admin form (phase B) submits the full product,
 * so there is no diff/merge. Throws if the slug does not exist.
 */
export async function updateProduct(slug: string, input: ProductInput): Promise<Product> {
  const parsed = productInputSchema.parse(input);
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug));
    if (!existing) throw new Error(`updateProduct: product "${slug}" not found`);
    await tx
      .update(schema.products)
      .set(productColumns(parsed))
      .where(eq(schema.products.id, existing.id));
    // Drop the old variant/sku tree (skus cascade) and rebuild from input.
    await tx
      .delete(schema.productVariants)
      .where(eq(schema.productVariants.productId, existing.id));
    await insertVariantTree(tx, existing.id, parsed);
  });
  const updated = await getProductBySlug(parsed.slug);
  if (!updated) {
    throw new Error(`updateProduct: product "${parsed.slug}" not found after update`);
  }
  return updated;
}

/** Deletes a product; variants/skus/media cascade. Throws if the slug is unknown. */
export async function deleteProduct(slug: string): Promise<void> {
  const deleted = await db
    .delete(schema.products)
    .where(eq(schema.products.slug, slug))
    .returning({ id: schema.products.id });
  if (deleted.length === 0) {
    throw new Error(`deleteProduct: product "${slug}" not found`);
  }
}
