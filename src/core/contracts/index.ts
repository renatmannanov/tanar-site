// Shared domain contracts: primitive union types known to all modules.
// Business types (Product, Sku, Order, ...) live in their own modules and
// are exported from those modules' index.ts — not here.

export type ProductCategory = 'jackets' | 'hoodies' | 't-shirts' | 'pants' | 'shorts';
export type ProductStatus = 'draft' | 'published' | 'archived' | 'coming_soon';
export type ProductImageModel = 'man' | 'girl';
export type ProductImageView = 'front' | 'side' | 'back';
export type Marketplace = 'ozon' | 'kaspi';
export type MediaScope = 'product' | 'site' | 'blog';
export type OrderSource = 'site' | 'kaspi' | 'ozon' | 'wb';
