import type { Product, ProductInput } from '@/core/catalog';

// Adapter read→write: the read type (Product) and the write type (ProductInput)
// use DIFFERENT field names. This lives in the admin section (storefront-admin
// adapter), NOT in core.
//   price        -> priceBase
//   variant.id   -> colorId
//   variant.label-> colorLabel
//   sku.{id,reservedQty} dropped (write schema has neither; reservedQty is set
//     to 0 by the repository — known limitation, see progress.md)
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
    // Read type is Partial<Record<Marketplace,string>>; the zod input type is a
    // full Record. zod accepts a partial record at runtime — cast to bridge the
    // stricter declared input type. The form does not edit marketplaces.
    marketplaces: p.marketplaces as ProductInput['marketplaces'],
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
      })),
    })),
  };
}
