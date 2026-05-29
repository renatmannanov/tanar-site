import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@/data/products",
          message: "Импортируй данные товаров только через @/lib/product (будущая точка подмены на БД).",
        }],
      }],
    },
  },
  {
    files: ["src/lib/product.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  // ── Module boundaries ──────────────────────────────────────────────
  // Alias @/core/* and @/marketplace/* are reserved for a module's PUBLIC
  // API (its index.ts). Inside a module use relative paths (./x, ../y) —
  // they don't match the @/core/*/* pattern, so the rule never fires on
  // legitimate internal imports.
  //
  // Block 1: forbid reaching past a module's index.ts via alias (everywhere).
  {
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/core/*/*"],
            message: "Импортируй только из публичного API модуля: '@/core/<module>' через его index.ts. Внутри своего модуля используй относительные пути (./).",
          },
          {
            group: ["@/marketplace/*/*"],
            message: "Импортируй только из публичного API модуля marketplace: '@/marketplace/<module>'.",
          },
        ],
      }],
    },
  },
  // Block 2: core/* must NOT depend on marketplace/* (dependency direction).
  // flat config = last match wins; no-restricted-imports does NOT merge
  // between blocks, so the @/core/*/* ban is repeated here.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/core/*/*"],
            message: "Импортируй только из публичного API модуля: '@/core/<module>'. Внутри своего модуля используй относительные пути (./).",
          },
          {
            group: ["@/marketplace/*", "@/marketplace/**"],
            message: "core/ не должен импортировать marketplace/. Зависимость только в обратную сторону.",
          },
        ],
      }],
    },
  },
];

export default eslintConfig;
