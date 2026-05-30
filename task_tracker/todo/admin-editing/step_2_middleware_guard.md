# Шаг 2: Middleware — guard на /admin/*

> Зависит от: шаг 1 (нужен verifySessionToken/ADMIN_COOKIE)
> Статус: [ ] pending

## Задача

Защитить все пути `/admin/*` (кроме логина) middleware-проверкой cookie.

### Файл — `src/middleware.ts`
- `export const config = { matcher: ['/admin/:path*'] }` — перехватывает только админ-пути.
- В `middleware(req)`:
  - путь `/admin/login` — пропустить без проверки (`NextResponse.next()`), иначе бесконечный редирект.
  - прочитать cookie `ADMIN_COOKIE` из `req.cookies.get(ADMIN_COOKIE)?.value` (в middleware это синхронный `req.cookies`, НЕ `cookies()` из next/headers — не путать), проверить `verifySessionToken(token)`.
  - валидна → `NextResponse.next()`.
  - невалидна → `NextResponse.redirect(new URL('/admin/login', req.url))`.

> `verifySessionToken` — чистая синхронная функция от строки (HMAC-сверка), поэтому переиспользуется и в middleware (`req.cookies`), и в server-компонентах (`(await cookies()).get(...)`). Сама функция cookie не читает — ей передают строку токена.

> **Edge-runtime middleware:** `node:crypto` доступен в Next 15 middleware (Node runtime middleware). Если `verifySessionToken` использует `node:crypto` и упадёт в edge — переключить middleware на `export const runtime = 'nodejs'` (Next 15.5 поддерживает). Зафиксировать: использовать Node-runtime middleware, чтобы переиспользовать тот же `verifySessionToken` из `src/lib/admin-auth.ts` (одна реализация подписи, без дублирования в WebCrypto).

### Defense in depth
Барьеры аутентификации: (1) middleware — первый барьер (быстрый redirect на навигации); (2) `requireAdmin()` в начале каждой защищённой server-page (catalog list, edit) и в server action (шаги 4/6) — страховка на случай прямого вызова. Guard в `admin/layout.tsx` НЕ ставим (конфликтует с вложенной login-страницей — см. step_3). Дублирование middleware + requireAdmin намеренное.

## Тесты
- e2e guard-redirect — в шаге 7.

## Команды для верификации
```powershell
npm run typecheck
npm run lint
npm run build   # middleware компилируется
npm run dev     # вручную: без cookie открыть /admin/catalog → редирект на /admin/login; с cookie (после логина) → пускает
```

## Критерии готовности
- [ ] `src/middleware.ts` с matcher `/admin/:path*`
- [ ] `/admin/login` исключён из проверки (нет редирект-петли)
- [ ] Невалидная/отсутствующая cookie на `/admin/*` → redirect `/admin/login`
- [ ] Валидная cookie → пропуск
- [ ] middleware на nodejs-runtime, переиспользует `verifySessionToken` (без дубля подписи)
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` зелёные
- [ ] Коммит: `feat(admin): middleware guard for /admin routes`
