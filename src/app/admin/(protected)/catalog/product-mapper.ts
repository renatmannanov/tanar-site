import type { Product, ProductInput } from '@/core/catalog/client';

// Adapter read→write: the read type (Product) and the write type (ProductInput)
// use DIFFERENT field names. This lives in the admin section (storefront-admin
// adapter), NOT in core.
//   price        -> priceBase
//   variant.id   -> colorId
//   variant.label-> colorLabel
//   sku.{id,reservedQty} dropped (write schema has neither; reservedQty is set
//     to 0 by the repository — known limitation, see progress.md)
function cleanMarketplaces(
  m: Product['marketplaces'],
): ProductInput['marketplaces'] {
  if (!m) return undefined;
  const entries = Object.entries(m).filter(([, v]) => typeof v === 'string');
  return entries.length
    ? (Object.fromEntries(entries) as ProductInput['marketplaces'])
    : undefined;
}

export function productToInput(p: Product): ProductInput {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    status: p.status,
    priceBase: p.price,
    currency: p.currency,
    description: p.description,
    specs: p.specs,
    gradient: p.gradient,
    label: p.label,
    care: p.care,
    // Read type is Partial<Record<Marketplace,string>> and may carry keys with
    // undefined values; the write schema (z.record(enum, string)) rejects
    // undefined. Drop undefined entries, and omit the field entirely if empty.
    marketplaces: cleanMarketplaces(p.marketplaces),
    variants: p.variants.map((v) => ({
      colorId: v.id,
      colorLabel: v.label,
      hex: v.hex,
      models: v.models,
      hasFlatShots: v.hasFlatShots,
      skus: v.skus.map((sku) => ({
        size: sku.size,
        ruSize: sku.ruSize,
        article: sku.article,
        priceOverride: sku.priceOverride,
        stockQty: sku.stockQty,
        // MUST be passed through: upsertSkus does a full replace (`?? {}`) —
        // dropping this line would silently wipe sku links on every save.
        marketplaces: cleanMarketplaces(sku.marketplaces),
      })),
    })),
  };
}
