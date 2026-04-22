# Шаг 2: Design tokens + Placeholder

> Зависит от: шаг 1
> Статус: [ ] pending

## Задача

Задать дизайн-систему (палитра, типографика) и создать переиспользуемый `<Placeholder>` компонент для градиентных картинок.

### Порядок действий

1. **Типографика в `src/app/layout.tsx`**:
   - Подключить `next/font/google` — **`Inter`** для основного текста, **`Playfair_Display`** для заголовков H1/H2 (шрифт зафиксирован, не менять)
   - Оба шрифта поддерживают кириллицу (`subsets: ['latin', 'cyrillic']`)
   - Экспортировать как CSS-переменные через `variable` prop: `--font-inter`, `--font-display`
   - В `globals.css` применить: `body { font-family: var(--font-inter); }`, добавить класс `.font-display { font-family: var(--font-display); }`

2. **Палитра и токены в `src/app/globals.css`**:
   - Добавить CSS-переменные бренда в `:root`:
     - `--brand-stone: 68 64 60` (stone-700 RGB)
     - `--brand-moss: 6 78 59` (emerald-900 RGB)
     - `--brand-dawn: 146 64 14` (amber-900 RGB)
   - Базовый фон: `bg-stone-50`, базовый текст: `text-stone-900`

3. **Утилита `src/lib/gradients.ts`** — список из ~10 одобренных outdoor-градиентов:
   ```ts
   export const OUTDOOR_GRADIENTS = [
     'from-stone-600 to-stone-900',
     'from-emerald-800 to-stone-900',
     'from-slate-700 to-emerald-900',
     'from-amber-800 to-stone-900',
     'from-neutral-600 to-slate-900',
     'from-stone-500 to-emerald-800',
     'from-slate-600 to-stone-800',
     'from-emerald-700 to-slate-900',
     'from-amber-700 to-stone-800',
     'from-neutral-700 to-emerald-900',
   ] as const;

   export type Gradient = typeof OUTDOOR_GRADIENTS[number];

   export function gradientFromString(input: string): Gradient {
     let hash = 0;
     for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) | 0;
     return OUTDOOR_GRADIENTS[Math.abs(hash) % OUTDOOR_GRADIENTS.length];
   }
   ```

4. **Компонент `src/components/Placeholder.tsx`**:
   ```tsx
   type PlaceholderProps = {
     label: string;             // текст поверх (название товара/поста)
     gradient?: string;          // Tailwind "from-X to-Y", если не задан — из label
     aspect?: 'square' | 'portrait' | 'landscape' | 'wide';
     className?: string;
   };
   ```
   - Реализация: `<div>` с `bg-gradient-to-br ${gradient}` + absolute-центрированный `<span>` с label (белый, opacity-80, uppercase, tracking-wide)
   - `aspect`: square = `aspect-square`, portrait = `aspect-[3/4]`, landscape = `aspect-[4/3]`, wide = `aspect-[16/9]`
   - Поддержка `className` через `clsx` или просто конкатенацию
   - **Обязательно** `data-testid="placeholder"` на корневом div — для Playwright-тестов
   - Должен быть Server Component (никакого `'use client'`)

5. **Тестовая страница для Placeholder** (временная, удалим в step_10): `src/app/_design/page.tsx` — отрендерить Placeholder в каждом `aspect` и с несколькими градиентами. Нужна чтобы билд проверил компонент.

6. Коммит:
   ```bash
   git add -A
   git commit -m "feat(design): add typography, palette, Placeholder component"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
```

Проверка файлов:

```bash
test -f src/lib/gradients.ts
test -f src/components/Placeholder.tsx
grep -q "OUTDOOR_GRADIENTS" src/lib/gradients.ts
grep -q 'data-testid="placeholder"' src/components/Placeholder.tsx
# Шрифты подключены
grep -q "Playfair_Display" src/app/layout.tsx
grep -q "Inter" src/app/layout.tsx
```

**Примечание:** `tailwind.config.ts` уже создан и настроен в step_1 (Tailwind v3). Здесь мы только добавляем CSS-переменные и классы в `globals.css`.

## Критерии готовности

- [ ] `src/lib/gradients.ts` с ≥10 градиентами и функцией `gradientFromString`
- [ ] `src/components/Placeholder.tsx` — server component с props `label`, `gradient?`, `aspect?`
- [ ] Два шрифта подключены через `next/font/google` (latin + cyrillic)
- [ ] `npm run build` проходит
- [ ] Временная страница `/\_design` отрендерилась в билде
- [ ] Коммит с design tokens
