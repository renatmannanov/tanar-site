// Client-safe public API of the catalog module: pure functions, types and
// constants with NO database access. Import this from 'use client' components
// (the main index.ts pulls in repository.ts → postgres, which can't run in a
// client bundle). Server code should keep using '@/core/catalog'.
export * from './types';
export * from './categories';
export * from './images';
export * from './gradient';
export * from './format';
