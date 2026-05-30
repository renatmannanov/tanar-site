# Шаг 3: Admin shell — layout, реестр разделов, UI-примитивы

> Зависит от: шаг 1, шаг 2
> Статус: [x] done

> **Уточнения при реализации (отступления от исходного плана, осознанные):**
> 1. **Login вне сайдбара через `(protected)` группу.** `admin/layout.tsx` сделан passthrough (`return children`), а сайдбар-shell вынесен в `admin/(protected)/layout.tsx`. Иначе сайдбар отрендерился бы и на `/admin/login`. URL не меняются (группа в скобках). Защищённые разделы (catalog, шаг 4) живут в `admin/(protected)/`.
> 2. **`requireAdmin()` вынесен в отдельный `src/lib/require-admin.ts`** (не в `admin-auth.ts`). Причина: `admin-auth.ts` импортируется middleware (Node-runtime, чистый crypto); тянуть туда `next/headers`+`next/navigation` нежелательно. `require-admin.ts` импортит `ADMIN_COOKIE`/`verifySessionToken` из admin-auth. Защищённые страницы/actions импортят `@/lib/require-admin`.
> 3. Нет clsx — заведён локальный `cn()` в `src/components/admin/ui/cn.ts`.

## Задача

Каркас админки: layout с auth-guard и навигацией из реестра разделов + базовые UI-примитивы. Каркас рассчитан на будущие разделы (Фаза 2/3/6) — добавление = запись в реестр.

### UI-зависимости
```powershell
npm i @radix-ui/react-dialog @radix-ui/react-label
```
Примитивы-обёртки (shadcn-стиль, копией, БЕЗ shadcn CLI) в `src/components/admin/ui/`:
- `Button.tsx` (варианты: primary/secondary/ghost; проп `disabled`).
- `Input.tsx`, `Textarea.tsx`, `Select.tsx` (нативный select достаточно), `Label.tsx` (Radix Label).
- `Dialog.tsx` (Radix Dialog — для будущих подтверждений delete; в Плане B не используется активно, но примитив готовим).
Стиль — нейтральные серые, плотная сетка. НЕ outdoor-палитра витрины.

### Реестр разделов — `src/app/admin/sections.ts`
```ts
export type AdminSection = { id: string; label: string; href: string; enabled: boolean };
export const adminSections: AdminSection[] = [
  { id: 'catalog',   label: 'Каталог',   href: '/admin/catalog', enabled: true },
  { id: 'inventory', label: 'Остатки',   href: '/admin/inventory', enabled: false },
  { id: 'orders',    label: 'Заказы',    href: '/admin/orders', enabled: false },
  { id: 'site-media',label: 'Медиа сайта',href:'/admin/site-media', enabled: false },
  { id: 'blog',      label: 'Блог',      href: '/admin/blog', enabled: false },
];
```
Навигация рендерит все; `enabled:false` — серым, не кликабельны (визуальная проверка каркаса под будущие фазы).

### Изоляция витрины — route-group `(public)/` (делается ПЕРВЫМ в этом шаге, БЕЗУСЛОВНО)
Корневой `src/app/layout.tsx` сейчас рендерит `<Header/><main>{children}</main><Footer/>` для ВСЕХ страниц — попадёт и в `/admin/*`. Чтобы админка не наследовала витринную шапку, **сразу** изолируем витрину (НЕ «по факту визуальной проверки» — делаем безусловно):
1. Создать route-group `src/app/(public)/` и переместить туда витрину: `page.tsx`, `catalog/`, `blog/`, `icon.tsx` (всё, что рендерится с Header/Footer). `favicon.ico`/`globals.css` остаются в корне.
2. Создать `src/app/(public)/layout.tsx` — перенести в него витринную обёртку: `<Header/><main className="min-h-screen">{children}</main><Footer/>` + шрифты/классы body, если они завязаны на витрину.
3. Корневой `src/app/layout.tsx` оставить минимальным: `<html lang="ru"><body className="…">{children}</body></html>` (шрифт-переменные на body оставить — они нужны и админке для шрифтов; Header/Footer убрать).
4. **URL витрины НЕ меняются** — route-group в скобках не влияет на путь (`/catalog` остаётся `/catalog`).
5. После переноса прогнать витринные e2e (39) — убедиться, что маршруты целы.

> Это убирает витринную шапку из админки чисто, без хаков. `app/admin/` живёт под корневым (минимальным) layout + своим `admin/layout.tsx`.

### Layout админки — `src/app/admin/layout.tsx`
- Серверный компонент. **БЕЗ auth-guard** (намеренно): guard в layout конфликтовал бы с вложенной `/admin/login` (login-страница не должна редиректиться при отсутствии cookie). Барьеры аутентификации: (1) middleware (шаг 2) на всех `/admin/*` кроме login; (2) `requireAdmin()` в начале каждой защищённой server-page (catalog list, edit) — defense in depth. login-page `requireAdmin()` НЕ вызывает.
- `admin/layout.tsx` = только вёрстка: сайдбар с навигацией из `adminSections`, кнопка Logout (форма с `action={logoutAction}`), контентная область `{children}`. БЕЗ витринных Header/Footer.
- Хелпер `requireAdmin()` в `src/lib/admin-auth.ts` (async): `const store = await cookies(); const ok = verifySessionToken(store.get(ADMIN_COOKIE)?.value); if (!ok) redirect('/admin/login')`. Вызывается в начале защищённых server-page.

## Тесты
- e2e — шаг 7. Здесь typecheck/lint/build + визуальная проверка.

## Команды для верификации
```powershell
npm i @radix-ui/react-dialog @radix-ui/react-label
npm run typecheck
npm run lint
npm run build
npm run test:e2e   # витринные 39 не сломаны после переноса в (public)/
npm run dev        # /catalog,/,/blog работают; /admin/catalog (после логина) — сайдбар с разделами, активен Каталог, остальные серые, БЕЗ витринной шапки; Logout работает
```

## Критерии готовности
- [ ] Витрина вынесена в `src/app/(public)/` со своим `layout.tsx` (Header/Footer); корневой layout минимальный
- [ ] Витринные URL не изменились (`/`, `/catalog`, `/blog`); 39 витринных e2e зелёные
- [ ] `@radix-ui/react-dialog`, `@radix-ui/react-label` в deps
- [ ] `src/components/admin/ui/` — Button/Input/Textarea/Select/Label/Dialog
- [ ] `src/app/admin/sections.ts` — реестр разделов (catalog enabled, остальные disabled)
- [ ] `src/app/admin/layout.tsx` — сайдбар из реестра + Logout, БЕЗ auth-guard, БЕЗ витринных Header/Footer
- [ ] `requireAdmin()` (async, `await cookies()`) в admin-auth, вызывается в защищённых страницах (не в login)
- [ ] Визуально: админка без outdoor-шапки витрины
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): shell layout + (public) route group + section registry + ui primitives`
