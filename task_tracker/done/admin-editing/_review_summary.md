# Review Summary — Админка: редактирование (План B)

> Дата: 2026-05-29
> Ревью: code + risks + structure (3 агента, sonnet; code-review дописан основным агентом после API-500 суб-агента)

## Критичное (блокирует / даёт неверный результат)

1. **`cookies()` в Next 15 — асинхронный, план зовёт без `await`** (code #1).
   Подтверждено типами `next@15.5.15`: `cookies(): Promise<ReadonlyRequestCookies>`. План в step_1/2/3 пишет `cookies().set/get/delete` без await → typecheck/рантайм-ошибка.
   → Все cookie-функции (`loginAction`, `logoutAction`, `requireAdmin`, чтение в middleware/layout) — `async` + `const store = await cookies()`. Зафиксировать в step_1, step_2, step_3.

2. **Прямое противоречие PLAN.md ↔ step_3 по auth-guard в layout** (structure #2).
   PLAN.md: «layout.tsx = auth-guard (defense in depth)». step_3: «НЕ делать guard в layout, только `requireAdmin()` в page». Агент, следующий PLAN.md, поставит guard в layout → конфликт с login-страницей (который step_3 уже разобрал).
   → Привести PLAN.md к решению step_3: guard НЕ в layout, а в `requireAdmin()` внутри защищённых страниц + middleware. Поправить секцию «Архитектурные решения» в PLAN.md.

3. **Условная развилка route-group `(public)/` в step_3** (structure #1, risks #3).
   «Делать только если витринная шапка мешает» — решение по факту визуальной проверки. Разные прогоны → разные кодовые базы (0 файлов vs перенос 10+). Критерий готовности двузначен («сделано ИЛИ задокументировано»).
   → Зафиксировать ОДИН вариант ДО старта. Рекомендация: **безусловно завести route-group `(public)/`** в step_3 (перенести `app/page.tsx, catalog/, blog/, icon.tsx` в `app/(public)/`, витринные `<Header/><Footer/>` — в `app/(public)/layout.tsx`, корневой layout оставить `<html><body>{children}`). URL не меняются. Убирает неопределённость и сразу изолирует админку.

4. **slug перезаписывается при сохранении** (code #2, risks #2).
   `updateProduct` → `productColumns` пишет `slug = input.slug`. Поле slug в форме readonly, но `input.slug` всё равно уходит в action; баг/подмена → товар «переедет», старые URL 404.
   → В `updateProductAction` форсировать `input.slug = routeSlug` перед `updateProduct` (или игнорировать смену slug в core). Зафиксировать в step_6.

## Важное

5. **`updateProduct` обнуляет `reservedQty` при каждом сохранении** (risks #1).
   `insertVariantTree` хардкодит `reservedQty: 0`, маппер дропает его. В Плане B вреда нет (резервов нет), но для Фаз 2/3 (заказы/корзина) редактирование товара сотрёт активные резервы.
   → Записать как ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ в progress.md (передача в Фазу 2): «перед Фазой 2 — updateProduct должен сохранять reservedQty/stockQty, не затирать». Не блокер Плана B, но не потерять.

6. **`redirect()` внутри try/catch глотает redirect** (code, risks #4).
   В step_1 и step_6 предупреждение есть, пример кода в step_6 корректный (redirect после catch). Риск — агент по привычке обернёт.
   → Усилить формулировку: явный комментарий «redirect() — ВНЕ try/catch» прямо в обоих примерах кода.

7. **`requireAdmin` зависит от step_3, но в зависимостях step_6 указан только step_5** (structure #3).
   `requireAdmin` добавляется в `admin-auth.ts` в step_3. При линейном исполнении проблемы нет; при выборочном — поиск.
   → В шапку step_4 и step_6 добавить «Зависит от: шаг 3 (requireAdmin)».

8. **Идемпотентность e2e edit-теста не зафиксирована** (risks #6, structure #4).
   step_7 даёт два варианта возврата исходного значения. При падении посреди теста БД остаётся грязной.
   → Зафиксировать ОДИН способ: тест в одном прогоне меняет → проверяет → возвращает исходное; плюс страховка `afterAll`/`afterEach` через `db:seed` (или хук, восстанавливающий имя). Убрать «Альтернатива».

9. **Слабый/пустой `ADMIN_SESSION_SECRET`** (risks #5).
   step_1 требует «бросать ошибку если не задан», но не проверяет длину.
   → Добавить в guard минимальную длину (напр. ≥ 32 символа), иначе throw. Дёшево, закрывает слабый секрет.

## Мелочи
- `secure: production` в step_1 — псевдокод, реально `process.env.NODE_ENV === 'production'` (code, risks #8).
- `revalidatePath('/catalog/[slug]')` избыточен (force-dynamic), но безвреден (code #5).
- `timingSafeEqual` требует равной длины буферов — step_1 предупреждает, не забыть (risks #7).
- step_8 (финальный smoke) не повторяет предусловие `db:seed` (structure #5).
- step_1 «клиентская обёртка либо useActionState» — мягкая развилка, без риска (structure #6). Можно зафиксировать `useActionState` (React 19, нативно).
- @radix под React 19 — возможен peer-warning при install, не ошибка (code #4).

## Противоречия между ревьюерами
Нет. Находки взаимодополняющие; пересечения (route-group, guard-в-layout, slug, reservedQty) совпадают по сути между code/risks/structure.

## Рекомендации (по приоритету)
1. **PLAN.md + step_1/2/3: `await cookies()`** во всех cookie-операциях (крит #1).
2. **PLAN.md: убрать guard-в-layout, привести к step_3** (крит #2).
3. **step_3: безусловный route-group `(public)/`** — зафиксировать, убрать условность (крит #3).
4. **step_6: форсировать `input.slug = routeSlug`** (крит #4).
5. **progress.md: записать reservedQty-ограничение для Фазы 2** (важное #5).
6. **step_4/step_6: добавить зависимость от step_3** (важное #7).
7. **step_7: один способ идемпотентности + db:seed-страховка** (важное #8).
8. **step_1: min-длина SESSION_SECRET + зафиксировать useActionState** (важное #9, мелочь).
9. Мелочи — поправить формулировки по ходу.
