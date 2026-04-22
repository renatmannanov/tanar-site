# Шаг 3: Header / Footer / Layout

> Зависит от: шаги 1, 2
> Статус: [ ] pending

## Задача

Создать общий layout: шапка с логотипом и навигацией, футер со ссылками-заглушками.

### Порядок действий

1. **Логотип `src/components/Logo.tsx`** — инлайн-SVG силуэта горы:
   - Простой треугольник-силуэт со снежной вершиной (белая зубчатая линия наверху)
   - Рядом текст "TANAR" в `.font-display`, tracking-widest, uppercase
   - Под текстом мелкая подпись "outdoor · kazakhstan" (`text-xs`, opacity-60)
   - Server component, принимает `variant?: 'light' | 'dark'` (для шапки на тёмном фоне и обычной)
   - SVG должен быть ~32×32, viewBox `0 0 32 32`

2. **Навигация `src/components/Header.tsx`**:
   - Sticky top, `bg-stone-50/80 backdrop-blur`, `border-b border-stone-200`, высота 64px
   - Слева: `<Logo />` (кликабельный, ведёт на `/`)
   - Справа: ссылки `<Link>` — "Каталог" (`/catalog`), "Блог" (`/blog`), "О бренде" (`#story` — якорь на главной), "Контакты" (`#footer`)
   - Mobile (< 768px): бургер-кнопка (пока без функционала выпадайки — просто кнопка с `aria-label="Открыть меню"`), навигация скрыта. **Не делать dropdown в этом step** — полный mobile-nav в step_10.
   - `data-testid="site-header"`

3. **Футер `src/components/Footer.tsx`**:
   - `id="footer"`, `bg-stone-900 text-stone-200`, `py-16`
   - 4 колонки (на desktop): "Каталог" (ссылки на категории — все ведут на `/catalog` с query, напр. `/catalog?category=jackets`), "Компания" (О нас, Блог, Контакты — все `#` кроме блога), "Поддержка" (Доставка, Возврат, FAQ — все `#`), "Связь" (инстаграм, телеграм — заглушки `#`)
   - Внизу: строка с копирайтом `© 2026 Tanar. Все права защищены.` и "Алматы, Казахстан"
   - Mobile: колонки в одну
   - `data-testid="site-footer"`

4. **Root layout `src/app/layout.tsx`**:
   - Уже существует после step_1 — отредактировать
   - Установить `lang="ru"` на `<html>`
   - Добавить metadata: `title: 'Tanar — Outdoor-бренд из Казахстана'`, `description: 'Одежда и снаряжение для гор. Создано в Казахстане.'`
   - Структура body:
     ```tsx
     <Header />
     <main className="min-h-screen">{children}</main>
     <Footer />
     ```

5. **Главная заглушка** — в `src/app/page.tsx` временно оставить простой placeholder: заголовок "Tanar" + "Coming soon" (будет перезаписано в step_4). Это чтобы билд прошёл.

6. **Playwright spec `e2e/layout.spec.ts`**:
   - Тест 1: открыть `/`, проверить что `data-testid="site-header"` и `data-testid="site-footer"` присутствуют
   - Тест 2: клик на "Каталог" в шапке → URL `/catalog` (может быть 404 на этом этапе — ok, проверяем только что ссылка ведёт куда надо через `toHaveURL`)
   - Тест 3: footer содержит текст "Tanar" и "Казахстан"

7. Коммит:
   ```bash
   git add -A
   git commit -m "feat(layout): header, footer, logo, root layout"
   ```

## Команды для верификации

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test e2e/layout.spec.ts
```

Проверка файлов:

```bash
test -f src/components/Header.tsx
test -f src/components/Footer.tsx
test -f src/components/Logo.tsx
test -f e2e/layout.spec.ts
grep -q "lang=\"ru\"" src/app/layout.tsx
grep -q "Tanar" src/app/layout.tsx
```

## Критерии готовности

- [ ] Header с логотипом и навигацией
- [ ] Footer с 4 колонками и копирайтом
- [ ] Logo — инлайн SVG + текст
- [ ] `<html lang="ru">` в root layout
- [ ] Metadata title/description на русском
- [ ] Playwright spec для layout проходит
- [ ] Build, typecheck, lint зелёные
- [ ] Коммит
