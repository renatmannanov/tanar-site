import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  serial,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import type { Marketplace, ProductImageModel } from '@/core/contracts';

// Catalog-local shape (not a primitive union → stays here, not in contracts).
type ProductSpec = { label: string; value: string };

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    // category values come from a union; validation lives in the repository,
    // not a CHECK constraint (categories may become a table in phase 1).
    category: text('category').notNull(),
    // 'draft' | 'published' | 'archived' | 'coming_soon'
    status: text('status').notNull().default('published'),
    // KZT, whole units (e.g. 149_900) — no minor units.
    priceBase: integer('price_base').notNull().default(0),
    currency: text('currency').notNull().default('KZT'),
    description: text('description').notNull(),
    specs: jsonb('specs').$type<ProductSpec[]>().notNull().default([]),
    // short tech badge from the garment label, e.g. { badge: 'GORE-TEX®', sub: 'Куртка Gore-Tex' }
    label: jsonb('label').$type<{ badge: string; sub: string }>(),
    // garment care instructions (free text)
    care: text('care'),
    gradient: text('gradient'),
    marketplaces: jsonb('marketplaces')
      .$type<Partial<Record<Marketplace, string>>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('products_status_category_idx').on(t.status, t.category)],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    colorId: text('color_id').notNull(),
    colorLabel: text('color_label').notNull(),
    hex: text('hex').notNull(),
    models: jsonb('models').$type<ProductImageModel[]>().notNull().default([]),
    hasFlatShots: boolean('has_flat_shots').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('product_variants_product_color_uq').on(t.productId, t.colorId),
    index('product_variants_product_id_idx').on(t.productId),
  ],
);

export const skus = pgTable(
  'skus',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    size: text('size').notNull(),
    // internal TANAR article (e.g. TANAR-001), unique per physical SKU
    article: text('article'),
    // Russian size notation (e.g. 46) alongside the letter `size`
    ruSize: text('ru_size'),
    priceOverride: integer('price_override'),
    barcode: text('barcode'),
    stockQty: integer('stock_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    // Per-SKU marketplace links (Kaspi does not group variants — every
    // color+size is its own card). Product-level products.marketplaces stays
    // as the fallback shown until a size is picked.
    marketplaces: jsonb('marketplaces')
      .$type<Partial<Record<Marketplace, string>>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('skus_variant_size_uq').on(t.variantId, t.size),
    index('skus_variant_id_idx').on(t.variantId),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // 'product' | 'site' | 'blog'
    scope: text('scope').notNull(),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'cascade',
    }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'cascade',
    }),
    // 'front' | 'side' | 'back'
    view: text('view'),
    // 'man' | 'girl' | 'flat'
    model: text('model'),
    // 'lifestyle' | 'flat'
    role: text('role'),
    // true when produced by photogen (AI). Drives the "ИИ" badge in admin and
    // the storefront marker. Default false — only new generations set it.
    aiGenerated: boolean('ai_generated').notNull().default(false),
    // for scope=site/blog: 'home.hero', 'story.1', 'blog:post-slug', ...
    key: text('key'),
    alt: text('alt'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('media_assets_product_id_idx').on(t.productId),
    index('media_assets_scope_key_idx').on(t.scope, t.key),
  ],
);

// Editable brand settings — a singleton (one row). The storefront footer and
// /contacts read it; the admin "Настройки сайта" form upserts it. All fields
// nullable so an empty install renders sensible defaults (see @/core/site).
export const siteSettings = pgTable('site_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone1: text('phone1'),
  phone1Name: text('phone1_name'),
  phone2: text('phone2'),
  phone2Name: text('phone2_name'),
  instagram: text('instagram'),
  email: text('email'),
  city: text('city'),
  address: text('address'),
  pickupInfo: text('pickup_info'),
  ipName: text('ip_name'),
  bin: text('bin'),
  // bankName/iban stored but NOT shown on the storefront until Phase 3 (payment).
  bankName: text('bank_name'),
  iban: text('iban'),
  // WhatsApp number for cart orders (wa.me links on the storefront).
  whatsapp: text('whatsapp'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// FAQ entries, ordered by sortOrder. /faq renders them; admin "FAQ" does CRUD.
export const faqItems = pgTable(
  'faq_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('faq_items_sort_order_idx').on(t.sortOrder)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // human-facing order number — uuid does not work in a WhatsApp chat
    number: serial('number').notNull(),
    // 'site' | 'kaspi' | 'ozon' | 'wb'
    source: text('source').notNull().default('site'),
    status: text('status').notNull().default('pending'),
    contact: text('contact').notNull().default(''),
    customer: jsonb('customer').$type<Record<string, unknown>>().notNull().default({}),
    total: integer('total').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('orders_source_status_created_idx').on(
      t.source,
      t.status,
      t.createdAt,
    ),
    unique('orders_number_uq').on(t.number),
  ],
);

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  skuId: uuid('sku_id')
    .notNull()
    .references(() => skus.id),
  nameSnapshot: text('name_snapshot').notNull(),
  priceSnapshot: integer('price_snapshot').notNull(),
  qty: integer('qty').notNull(),
});

export const inventoryLog = pgTable('inventory_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  skuId: uuid('sku_id')
    .notNull()
    .references(() => skus.id),
  // Signed units. For reason sale/return/manual delta moves stock_qty;
  // for reservation/reservation_release delta moves reserved_qty (+ = reserved grew).
  delta: integer('delta').notNull(),
  // 'sale' | 'return' | 'manual' | 'reservation' | 'reservation_release'
  reason: text('reason').notNull(),
  refOrderId: uuid('ref_order_id').references(() => orders.id),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
