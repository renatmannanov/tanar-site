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
            // '!@/core/*/client' whitelists the client-safe entry (e.g.
            // @/core/catalog/client) — a second public entry alongside index.ts.
            // '!@/core/media/store' whitelists the SERVER-ONLY media writer:
            // index.ts deliberately does NOT re-export store.ts (sharp/node:fs),
            // so server actions import it as a second public entry directly.
            group: ["@/core/*/*", "!@/core/*/client", "!@/core/media/store"],
            message: "Импортируй только из публичного API модуля: '@/core/<module>' (или '@/core/<module>/client' для client-компонентов). Внутри своего модуля используй относительные пути (./).",
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
            group: ["@/core/*/*", "!@/core/*/client"],
            message: "Импортируй только из публичного API модуля: '@/core/<module>' (или '@/core/<module>/client'). Внутри своего модуля используй относительные пути (./).",
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
