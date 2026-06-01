import { z } from 'zod';
import { eq, ne, and, or, like, inArray } from 'drizzle-orm';
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
    id: row.id,
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
    variantId: row.id,
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

/**
 * Returns a slug unique among existing products: `base` if free, otherwise the
 * lowest free `base-N` (starting at `base-2`). Called before createProduct so
 * the admin never has to think about slug collisions. One SELECT (`base%`) then
 * filtered in JS to exact `base` / `base-<digits>` — the catalog is small (tens).
 * The UNIQUE constraint on slug remains the last line of defence against races.
 */
export async function ensureUniqueSlug(base: string): Promise<string> {
  const rows = await db
    .select({ slug: schema.products.slug })
    .from(schema.products)
    .where(or(eq(schema.products.slug, base), like(schema.products.slug, `${base}-%`)));
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;

  // Find the highest numeric suffix among `base-N`; next free is max+1 (min 2).
  const suffixRe = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`);
  let maxN = 1;
  for (const slug of taken) {
    const m = suffixRe.exec(slug);
    if (m) maxN = Math.max(maxN, Number(m[1]));
  }
  return `${base}-${maxN + 1}`;
}

// ---------------------------------------------------------------------------
// Storefront read functions — same as the plain getters but filtered to the
// statuses a customer may see. The plain getters (getAllProducts / *BySlug /
// *ByCategory / getRelated) are LEFT UNFILTERED on purpose: the admin calls them
// and must see every status (draft/archived included). Storefront pages call the
// getStorefront* variants below; hidden products resolve to undefined → 404.
// ---------------------------------------------------------------------------

// `as const satisfies` keeps the array a readonly tuple of ProductStatus so
// Drizzle's inArray() type-checks (a bare string[] would widen and error).
const STOREFRONT_VISIBLE = [
  'published',
  'coming_soon',
] as const satisfies readonly ProductStatus[];

const visibleStatus = () => inArray(schema.products.status, STOREFRONT_VISIBLE);

export async function getStorefrontProducts(): Promise<Product[]> {
  const rows = await baseSelect().where(visibleStatus());
  return groupRows(rows as JoinedRow[]);
}

export async function getStorefrontProductsByCategory(
  category: ProductCategory | null,
): Promise<Product[]> {
  // null = "all categories" → still storefront-filtered (NOT getAllProducts,
  // which would leak hidden products into the "all" view).
  if (!category) return getStorefrontProducts();
  const rows = await baseSelect().where(
    and(eq(schema.products.category, category), visibleStatus()),
  );
  return groupRows(rows as JoinedRow[]);
}

export async function getStorefrontProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const rows = await baseSelect().where(
    and(eq(schema.products.slug, slug), visibleStatus()),
  );
  return groupRows(rows as JoinedRow[])[0];
}

export async function getStorefrontRelatedProducts(
  current: Product,
  limit = 3,
): Promise<Product[]> {
  const rows = await baseSelect().where(
    and(
      eq(schema.products.category, current.category),
      ne(schema.products.slug, current.slug),
      visibleStatus(),
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
  // Restricted charset: the slug is used verbatim in URLs and redirect targets.
  // Spaces/Cyrillic/special chars would produce a broken URL on create-redirect.
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug: только строчные латинские буквы, цифры и дефис'),
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

    await insertSkus(tx, row.id, variant.skus);
  }
}

type SkuInputParsed = z.infer<typeof skuInputSchema>;

/** Inserts skus for a variant. `reservedQty` always starts at 0 for new rows. */
async function insertSkus(
  tx: Tx,
  variantId: string,
  skuInputs: SkuInputParsed[],
): Promise<void> {
  if (skuInputs.length === 0) return;
  await tx.insert(schema.skus).values(
    skuInputs.map((sku) => ({
      variantId,
      size: sku.size,
      ruSize: sku.ruSize ?? null,
      article: sku.article ?? null,
      priceOverride: sku.priceOverride ?? null,
      stockQty: sku.stockQty ?? 0,
      reservedQty: 0,
    })),
  );
}

/**
 * Upserts a variant's skus by `size` (unique skus(variant_id, size)) via an
 * explicit SELECT → diff, NOT `onConflictDoUpdate`. Rationale: an upsert that
 * spreads all columns into `set` would clobber `reservedQty`. We instead:
 *   existing size → UPDATE (reservedQty NOT in the set, so it is preserved),
 *   new size      → INSERT (reservedQty: 0),
 *   vanished size → DELETE.
 */
async function upsertSkus(
  tx: Tx,
  variantId: string,
  skuInputs: SkuInputParsed[],
): Promise<void> {
  const existing = await tx
    .select({ id: schema.skus.id, size: schema.skus.size })
    .from(schema.skus)
    .where(eq(schema.skus.variantId, variantId));
  const existingBySize = new Map(existing.map((s) => [s.size, s.id]));
  const inputSizes = new Set(skuInputs.map((s) => s.size));

  const toInsert: SkuInputParsed[] = [];
  for (const sku of skuInputs) {
    const id = existingBySize.get(sku.size);
    if (id) {
      // UPDATE — reservedQty deliberately omitted so it is preserved.
      await tx
        .update(schema.skus)
        .set({
          ruSize: sku.ruSize ?? null,
          article: sku.article ?? null,
          priceOverride: sku.priceOverride ?? null,
          stockQty: sku.stockQty ?? 0,
          updatedAt: new Date(),
        })
        .where(eq(schema.skus.id, id));
    } else {
      toInsert.push(sku);
    }
  }
  await insertSkus(tx, variantId, toInsert);

  const toDelete = existing.filter((s) => !inputSizes.has(s.size)).map((s) => s.id);
  if (toDelete.length > 0) {
    await tx.delete(schema.skus).where(inArray(schema.skus.id, toDelete));
  }
}

/**
 * Upserts a product's variant/sku tree by stable keys (variant by `colorId`,
 * sku by `size`) via SELECT → diff. Preserves `product_variants.id` for
 * unchanged colors — critical so that cascading `media_assets` (FK on variantId)
 * are NOT destroyed on every form save — and preserves `skus.reservedQty`.
 *   existing colorId → UPDATE variant + upsertSkus,
 *   new colorId      → INSERT variant + insert skus,
 *   vanished colorId → DELETE variant (skus + media_assets rows cascade).
 */
async function upsertVariantTree(
  tx: Tx,
  productId: string,
  input: z.infer<typeof productInputSchema>,
): Promise<void> {
  const existing = await tx
    .select({ id: schema.productVariants.id, colorId: schema.productVariants.colorId })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productId, productId));
  const existingByColor = new Map(existing.map((v) => [v.colorId, v.id]));
  const inputColors = new Set(input.variants.map((v) => v.colorId));

  for (const variant of input.variants) {
    const variantId = existingByColor.get(variant.colorId);
    if (variantId) {
      await tx
        .update(schema.productVariants)
        .set({
          colorLabel: variant.colorLabel,
          hex: variant.hex,
          models: variant.models ?? [],
          hasFlatShots: variant.hasFlatShots ?? false,
        })
        .where(eq(schema.productVariants.id, variantId));
      await upsertSkus(tx, variantId, variant.skus);
    } else {
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
      await insertSkus(tx, row.id, variant.skus);
    }
  }

  // Variants whose colorId vanished from the form → delete (skus + media cascade).
  const toDelete = existing.filter((v) => !inputColors.has(v.colorId)).map((v) => v.id);
  if (toDelete.length > 0) {
    await tx
      .delete(schema.productVariants)
      .where(inArray(schema.productVariants.id, toDelete));
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
 * Updates a product's fields and upserts its variant/sku tree by stable keys
 * (variant by `colorId`, sku by `size`) — see `upsertVariantTree`. Unlike a
 * delete+rebuild, this preserves `product_variants.id` (so cascading
 * `media_assets` survive) and `skus.reservedQty`. Throws if the slug is unknown.
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
    await upsertVariantTree(tx, existing.id, parsed);
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
