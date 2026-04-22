# Progress Log — tanar-site initial build

## Контекст для агента

### Что уже готово ДО начала плана
- Git репозиторий инициализирован (`git init -b main`), remote = `https://github.com/renatmannanov/tanar-site.git`
- `CLAUDE.md` написан (стек, commands, дизайн, правила)
- `ralph.ps1` адаптирован — этот скрипт и крутит данный loop
- Папка `task_tracker/todo/initial-build/` создана, PLAN.md + step-файлы написаны

### Что НЕЛЬЗЯ делать
- `git push` — только локальные коммиты
- `git reset --hard`, `rm -rf`, `git checkout -- .` — любые деструктивные git операции
- Коммитить `.env`, `node_modules/`, `.next/` (они должны быть в .gitignore)
- Скипать хуки (`--no-verify`)
- Устанавливать лишние зависимости "на всякий случай" — только то что явно нужно по step-файлу
- Использовать внешние URL для картинок (`picsum`, `unsplash` и т.п.) — только CSS-градиенты
- Создавать `.md`/README без явной команды в step-файле

### Что РАЗРЕШЕНО (несмотря на guardrails "no destructive ops")
Эти операции явно разрешены данным планом и не считаются "деструктивными" в понимании ralph.ps1:
- `rm -f <single-file>` — удаление одного файла с `-f` (идемпотентно). Пример: `rm -f content/blog/_placeholder.mdx` в step_9.
- `git mv <dir> <dir>` — перемещение папки плана из `todo/` в `done/` в step_12.
- `git checkout -b dev` / `git checkout dev` — переключение/создание ветки в step_1.
- **Никаких** `rm -rf`, `git reset --hard`, `git push` — остаются запрещёнными.

### Ключевые соглашения
- **Next.js 15** (App Router, не Pages Router) — зафиксировано `create-next-app@15` в step_1
- TypeScript strict
- **Tailwind CSS v3** — специально понижен с v4 в step_1 (v4 нестабилен для автоматизации: нет `tailwind.config.ts`, другой синтаксис). Используем v3-директивы в globals.css: `@tailwind base; @tailwind components; @tailwind utilities;`
- `@tailwindcss/typography` установлен в step_1, но **класс `prose` НЕ используем** — типографика постов вручную через кастомные MDX-компоненты (step_8)
- MDX для блога — `next-mdx-remote/rsc` (server-side рендеринг) + `gray-matter` для frontmatter
- Playwright для smoke-тестов — один spec на страницу минимум, `reuseExistingServer: true` в config (важно для Ralph: между итерациями dev-сервер может остаться запущенным)
- Все Next 15 async params/searchParams требуют **явного `await`** — иначе runtime-ошибка
- Весь UI-текст (заголовки, кнопки, описания) — на русском
- Код (имена компонентов, переменных, файлов) — на английском
- Коммиты — на английском, Conventional Commits
- Команды запуска Playwright-тестов — `npx playwright test e2e/<file>.spec.ts` (НЕ `npm run test:e2e -- <file>` — синтаксис не работает)

### Data shape (справочник — КАНОНИЧЕСКИЕ определения живут в step-файлах)

> **Канонический источник `Product`** — `src/lib/product.ts` (создаётся в step_4, дополняется в step_5).
> **Канонический источник `BlogPost`** — `src/lib/blog.ts` (заглушка в step_4, реальная имплементация в step_7).
> Блоки ниже — только справка, чтобы агент не прыгал между файлами.

**Product** (канонически в `src/lib/product.ts`):
```ts
type Product = {
  slug: string;           // url-safe, e.g. "shell-jacket-khan"
  name: string;           // ru, e.g. "Куртка Хан Шелл"
  category: 'jackets' | 'backpacks' | 'accessories' | 't-shirts';
  price: number;          // KZT, целое
  currency: 'KZT';
  description: string;    // ru, 1-2 абзаца
  specs: { label: string; value: string }[]; // ru
  gradient: string;       // Tailwind classes, e.g. "from-stone-600 to-emerald-900"
};
```

**BlogPost** — frontmatter в mdx:
```yaml
---
title: "Название на русском"
slug: "url-slug"
date: "2026-04-15"
excerpt: "Короткое описание 1-2 предложения"
gradient: "from-slate-700 to-stone-900"
author: "Команда Tanar"
---
```

### Палитра (outdoor, мягкая)

Tailwind-классы, использовать ТОЛЬКО эти оттенки для градиентов-плейсхолдеров:
- **stone** (400-900) — земля, камень
- **emerald** (700-900) — лес, мох
- **slate** (600-900) — туман, скалы
- **amber** (700-900) — рассвет
- **neutral** (500-800) — универсальный

Белый текст поверх градиента, opacity-80 для мягкости.

### Обязательные slug'и (завязаны на smoke-тест step_11)

- Продукт: `shell-jacket-khan` (создаётся в step_9 первым в массиве)
- Пост: `khan-tengri-ascent` (создаётся в step_9 с самой свежей датой)

Если эти slug'и отсутствуют — smoke-тест упадёт, Ralph войдёт в петлю.

## Learnings
(заполняется Ralph-ом по ходу итераций)

### Step 1: Scaffold — PASS
- `create-next-app@15` does not allow running in a dir with existing files — used temp dir + copy workaround
- Node.js v24 evaluates `-e` as TypeScript by default — regex `!` gets misinterpreted; use script files for verification
- postcss.config.js must use `module.exports` (CJS) to avoid ESLint `import/no-anonymous-default-export` warning
- Tailwind config must use ESM import instead of `require()` to avoid `@typescript-eslint/no-require-imports`
- `npm run build`, `npm run typecheck`, `npm run lint` all exit 0
- Commit: `268cee1` on `dev` branch

### Step 2: Design Tokens — PASS
- Next.js App Router treats `_`-prefixed folders as private (not routed) — used `design-test` instead of `_design`
- Inter + Playfair_Display fonts with cyrillic subsets
- 10 outdoor gradients in `src/lib/gradients.ts`
- Placeholder component is a Server Component with `data-testid="placeholder"`
- Commit: `457f29c`

### Step 3: Layout — PASS
- Logo: inline SVG mountain silhouette + "TANAR" text with `font-display`, supports light/dark variant
- Header: sticky, `bg-stone-50/80 backdrop-blur`, nav links (Каталог, Блог, О бренде, Контакты), mobile burger button (no dropdown yet)
- Footer: 4-column grid (Каталог, Компания, Поддержка, Связь), copyright bar with "Алматы, Казахстан"
- Root layout updated: `<Header />` + `<main>` + `<Footer />`, metadata title/description in Russian
- Playwright config moved to port 3001 — port 3000 was occupied by VS Code utility process
- `npm run typecheck`, `npm run lint`, `npm run build` all exit 0
- 3/3 Playwright layout tests pass
---
