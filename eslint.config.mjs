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
];

export default eslintConfig;
