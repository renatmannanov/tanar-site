# Шаг 10: Polish (responsive, hover, transitions)

> Зависит от: шаги 1–9
> Статус: [ ] pending

## Задача

Причесать UI: mobile-навигация, hover-эффекты, transitions, проверка responsive на 3 breakpoints. Удалить временные артефакты.

### Порядок действий

1. **Mobile-меню в `Header.tsx`**:
   - Бургер-кнопка открывает выпадайку (полноэкранную или dropdown)
   - Так как нужна интерактивность — выделить в client component `src/components/MobileNav.tsx` с `'use client'` и `useState`
   - `Header.tsx` остаётся server component и импортирует `<MobileNav />`
   - Ссылки те же что в desktop-навигации: Каталог, Блог, О бренде (`#story`), Контакты (`#footer`)
   - Закрытие: клик по ссылке / клик по фону / Esc
   - Атрибуты a11y: `aria-expanded`, `aria-controls`

2. **Hover-эффекты**:
   - Пройтись по ProductCard, BlogCard, CategoriesGrid — убедиться что есть плавный transition (используем `transition-transform duration-300 hover:-translate-y-1` или аналог)
   - Кнопки: hover меняет фон/opacity, focus-visible ring

3. **Responsive чек** — добавить/убедиться что есть адаптация на:
   - 375px (mobile small) — всё в один столбец, текст читаем
   - 768px (tablet) — 2 колонки в гридах, навигация всё ещё в бургере
   - 1280px (desktop) — 3-4 колонки, десктоп-нав

4. **Удалить временные артефакты**:
   - Страница `src/app/_design/page.tsx` + папка `src/app/_design/` — удалить:
     ```bash
     rm -f src/app/_design/page.tsx
     rmdir src/app/_design 2>/dev/null || true
     ```
     (используем `rmdir` вместо `rm -rf` чтобы соблюсти guardrails — папка пустая после удаления page.tsx, `rmdir` её снимет; `2>/dev/null || true` скрывает ошибку если папки уже нет — идемпотентно)
   - Любые `TODO` комментарии которые стали неактуальны
   - Неиспользуемые импорты (lint должен поймать)

5. **Добавить favicon** — простой, можно оставить дефолтный next или сгенерить emoji-favicon через `src/app/icon.tsx` (Next 15 umie делать dynamic icons):
   ```tsx
   // src/app/icon.tsx
   import { ImageResponse } from 'next/og';
   export const size = { width: 32, height: 32 };
   export const contentType = 'image/png';
   export default function Icon() {
     return new ImageResponse(
       <div style={{ fontSize: 24, background: '#1c1917', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</div>,
       size
     );
   }
   ```

6. **Обновить Playwright config** — добавить viewport-тесты. Создать `e2e/responsive.spec.ts`:
   - Открыть `/` в 3 viewport (375, 768, 1280)
   - На каждом: проверить что Header виден и не поломан, grid не выходит за viewport
   - Использовать `page.setViewportSize`

7. Коммит:
   ```bash
   git add -A
   git commit -m "polish: mobile nav, hover transitions, favicon, cleanup"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/responsive.spec.ts
```

Файлы:

```bash
test -f src/components/MobileNav.tsx
test -f e2e/responsive.spec.ts
test ! -d src/app/_design       # design-страница удалена
```

## Критерии готовности

- [ ] Mobile nav открывается/закрывается
- [ ] Card hover transitions работают (визуально — проверяется в step_11 через скриншоты или просто работой)
- [ ] Responsive на 375/768/1280 проверен Playwright'ом
- [ ] Временная `/\_design` страница удалена
- [ ] Favicon есть
- [ ] Build, typecheck, lint, test:e2e зелёные
- [ ] Коммит
