# Шаг 10: Админка — FAQ (CRUD)

> Зависит от: шаг 7 (faq_items), шаг 8 (витрина из БД), шаг 9 (паттерн админки)
> Статус: [ ] pending

## Задача

Раздел админки «FAQ» — CRUD вопрос-ответ (`faq_items`) с управлением порядком. Паттерн как шаг 9, под `requireAdmin`.

### Изменения

- **Реестр** `src/app/admin/sections.ts`: `{ id: 'faq', label: 'FAQ', href: '/admin/faq', enabled: true }`.
- **Роут** `src/app/admin/(protected)/faq/page.tsx`: `requireAdmin`, `listFaqItems()`, рендер client-списка с формами.
- **Компонент** `src/components/admin/FaqEditor.tsx` (`'use client'`): список существующих (вопрос/ответ/порядок) + добавить/изменить/удалить. Тип `FaqItem` из `@/core/site/client`.
- **Server actions** `src/app/admin/(protected)/faq/actions.ts`: `createFaqItemAction`, `updateFaqItemAction`, `deleteFaqItemAction`, `reorderFaqItemsAction` → `requireAdmin` → запись через `@/core/site` → `revalidatePath('/admin/faq')` + `revalidatePath('/faq')`.
- Удаление — через `ConfirmButton` (как в каталоге).
- Порядок: стрелки или числовое поле `sortOrder`. Зафиксировать: **числовое поле sortOrder в строке** (проще стрелок; витрина сортирует по нему).

### Грабли

- Client-компонент импортит `@/core/site/client` (типы), не серверный barrel.
- `answer` — многострочный текст: использовать `AutoTextarea`/`Textarea` из `admin/ui`.

## Тесты

- e2e (логин → /admin/faq → добавить вопрос → /faq показывает его → удалить). `afterAll` → `db:seed` откатывает.
- Превью/мок не нужны.

## Команды для верификации

```powershell
npm run db:up; npm run db:migrate; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `/admin/faq` под requireAdmin; добавить/изменить/удалить/порядок работают
- [ ] Новый вопрос виден на `/faq`; порядок соблюдается (sortOrder)
- [ ] Секция «FAQ» в сайдбаре (enabled)
- [ ] client-бандл чист от drizzle/postgres
- [ ] e2e зелёный; build/typecheck/lint зелёные
- [ ] Коммит: `feat(admin): FAQ CRUD editor`
