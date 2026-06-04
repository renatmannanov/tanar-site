// Client-safe public API of the catalog module: pure functions, types and
// constants with NO database access. Import this from 'use client' components
// (the main index.ts pulls in repository.ts → postgres, which can't run in a
// client bundle). Server code should keep using '@/core/catalog'.
export * from './types';
export * from './categories';
export * from './images';
export * from './gradient';
export * from './format';
// Write-contract input types only (type-only re-export — erased at compile time,
// so repository.ts → postgres is NOT pulled into the client bundle). Admin forms
// need these shapes client-side.
export type { ProductInput, VariantInput, SkuInput } from './repository';
