# Шаг 9: Админка — Настройки сайта (контакты)

> Зависит от: шаг 7 (таблица), шаг 8 (витрина из БД)
> Статус: [ ] pending

## Задача

Раздел админки «Настройки сайта» — форма редактирования `site_settings` (контакты/соцсети/реквизиты). Паттерн: `ProductForm` + server actions + `revalidatePath`, под `requireAdmin`.

### Изменения

- **Реестр секций** `src/app/admin/sections.ts`: добавить `{ id: 'settings', label: 'Настройки сайта', href: '/admin/settings', enabled: true }`.
- **Роут** `src/app/admin/(protected)/settings/page.tsx`: server-страница, `requireAdmin()`, читает `getSiteSettings()`, рендерит client-форму.
- **Форма** `src/components/admin/SettingsForm.tsx` (`'use client'`): поля phone1, phone2, instagram, email, city, address, pickupInfo, ipName, bin, bankName, iban. Импорт типа `SiteSettings` из `@/core/site/client` (НЕ серверный barrel). UI-компоненты — `Input`/`Label`/`Button` из `admin/ui`.
- **Server action** `src/app/admin/(protected)/settings/actions.ts`: `updateSiteSettingsAction(formData|object)` → `requireAdmin` → `updateSiteSettings` (upsert первой строки) → revalidate.
  - `revalidatePath('/admin/settings')` + `revalidatePath('/contacts')` + `revalidatePath('/faq')` + `revalidatePath('/', 'layout')`.
  - Зафиксировано: `revalidatePath('/', 'layout')` ревалидирует корневой layout → футер обновляется на ВСЕХ страницах (включая /blog, /catalog). Это ожидаемое поведение, НЕ ограничивать revalidate только `/contacts` (иначе футер на блоге/каталоге покажет старые данные до их собственной ревалидации).

### Грабли

- Client-форма импортит ТОЛЬКО `@/core/site/client` (типы), не `@/core/site` (server). Иначе риск затащить db в client-бандл (как media barrel). Проверить `build` + грепом client-чанков на `drizzle`/`postgres`.
- `email`/`telegram` могут быть пустыми — форма это допускает; пустые на витрине не показываются (логика шага 3/8).

## Тесты

- e2e (логин → /admin/settings → изменить phone1 → сохранить → /contacts показывает новое значение). Реальный мок не нужен (обычная форма + БД). Паттерн — как `admin-crud-media.spec.ts` логин-флоу.
- Откат тестовых данных: e2e `afterAll` → `db:seed` вернёт исходные значения (как в media-спеке).

## Команды для верификации

```powershell
npm run db:up; npm run db:migrate; npm run db:seed
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

## Критерии готовности

- [ ] `/admin/settings` под requireAdmin; форма редактирует все поля site_settings
- [ ] Сохранение → значение видно на `/contacts` и в футере
- [ ] Секция «Настройки сайта» в сайдбаре админки (enabled)
- [ ] client-бандл чист от drizzle/postgres
- [ ] e2e на редактирование зелёный; build/typecheck/lint зелёные
- [ ] Коммит: `feat(admin): site settings editor (contacts/social/legal)`
