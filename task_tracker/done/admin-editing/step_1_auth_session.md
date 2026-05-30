# Шаг 1: Auth — cookie-сессия + страница логина

> Зависит от: нет
> Статус: [x] done

## Задача

Завести аутентификацию по единому паролю из env с подписанной httpOnly-cookie. Без БД, без ролей.

### env
В `.env.local` (и задокументировать в `.env.example`):
- `ADMIN_PASSWORD` — пароль входа (строка).
- `ADMIN_SESSION_SECRET` — секрет для HMAC-подписи cookie (длинная случайная строка).

### Модуль сессии — `src/lib/admin-auth.ts`
Чистые серверные функции (node:crypto, без БД):
- `createSessionToken(): string` — payload `{ exp: <now+7d> }`, подпись HMAC-SHA256 от `ADMIN_SESSION_SECRET`, формат `base64url(payload).base64url(sig)`.
- `verifySessionToken(token: string | undefined): boolean` — проверяет подпись и `exp > now`. Невалид/просрочен/undefined → false.
- Константа `ADMIN_COOKIE = 'admin_session'`.
- Бросать понятную ошибку, если `ADMIN_SESSION_SECRET`/`ADMIN_PASSWORD` не заданы (как `DATABASE_URL` guard в db/client). **Дополнительно: `ADMIN_SESSION_SECRET` короче 32 символов → throw** («секрет слишком короткий, ≥32 симв.») — закрывает слабый/тестовый секрет.

> НЕ хранить пароль в cookie. В cookie — только подписанный токен срока. Сравнение пароля — `crypto.timingSafeEqual` (защита от timing-атак), длины выровнять.

### Server actions — `src/app/admin/login/actions.ts` (`'use server'`)
> **Next 15: `cookies()` — АСИНХРОННЫЙ** (`cookies(): Promise<ReadonlyRequestCookies>`, проверено в типах next@15.5.15). ВСЕГДА `const store = await cookies()`, затем `store.set/get/delete`. Все функции, работающие с cookie — `async`.

- `loginAction(formData: FormData): Promise<{ error?: string }>`:
  - читает `password`, сравнивает с `ADMIN_PASSWORD` (timingSafeEqual);
  - верно → `const store = await cookies(); store.set(ADMIN_COOKIE, createSessionToken(), { httpOnly:true, secure: process.env.NODE_ENV === 'production', sameSite:'lax', path:'/', maxAge: 60*60*24*7 })` → `redirect('/admin/catalog')`;
  - неверно → `return { error: 'Неверный пароль' }` (НЕ кидать — форма покажет).
- `logoutAction(): Promise<void>`: `const store = await cookies(); store.delete(ADMIN_COOKIE)` → `redirect('/admin/login')`.

> `redirect()` из `next/navigation` кидает специальное исключение — **вызывать ВНЕ try/catch** (после блока), иначе catch его проглотит и редирект не сработает.

### Страница логина — `src/app/admin/login/page.tsx`
- Серверный компонент: проверяет cookie (`await verifySessionToken` через `await cookies()`), если уже залогинен — `redirect('/admin/catalog')`. Иначе рендерит клиентскую форму `<LoginForm />`.
- Форма — отдельный клиентский компонент `src/app/admin/login/LoginForm.tsx` (`'use client'`) на **`useActionState`** (React 19, нативно): `const [state, formAction] = useActionState(loginAction, {})`, форма `action={formAction}`, показывает `state.error`. Минимальный UI: поле пароля, кнопка «Войти», блок ошибки.
- `loginAction` под `useActionState` имеет сигнатуру `(prevState, formData) => Promise<{error?: string}>` — учесть `prevState` первым аргументом.

## Тесты
- e2e на логин — в шаге 7 (после shell). Здесь только typecheck/lint + ручная проверка.

## Команды для верификации
```powershell
npm run typecheck
npm run lint
npm run dev   # вручную: открыть /admin/login, ввести неверный пароль → ошибка; верный → редирект (раздел ещё может 404 до shell — ок, проверяем что cookie ставится в DevTools→Application→Cookies)
```

## Критерии готовности
- [ ] `.env.local` и `.env.example` содержат `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (в `.env.example` — placeholder ≥32 симв., БЕЗ реальных значений)
- [ ] `src/lib/admin-auth.ts`: createSessionToken / verifySessionToken / ADMIN_COOKIE, HMAC-подпись, timingSafeEqual для пароля (буферы равной длины), throw при отсутствии env и при `ADMIN_SESSION_SECRET` < 32 симв.
- [ ] Все cookie-операции через `await cookies()` (Next 15 async)
- [ ] `loginAction` ставит httpOnly-cookie при верном пароле, возвращает `{error}` при неверном; форма на `useActionState`
- [ ] `logoutAction` чистит cookie
- [ ] `/admin/login` при уже валидной cookie редиректит на `/admin/catalog`
- [ ] `/admin/login` рендерит форму, при неверном пароле показывает ошибку
- [ ] `npm run typecheck` + `npm run lint` зелёные
- [ ] Коммит: `feat(admin): cookie session auth + login/logout actions`
