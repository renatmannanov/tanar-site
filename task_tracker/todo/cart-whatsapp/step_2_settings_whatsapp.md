# Шаг 2: WhatsApp-номер в настройках сайта + lib/whatsapp + футер

> Зависит от: шаг 1 (колонка `site_settings.whatsapp` из миграции шага 1)
> Статус: [x] done

## Задача

### 1. `src/lib/whatsapp.ts` — единственный источник wa.me-логики (client-safe)

```ts
/** '+7 707 123-45-67' → '77071234567' (только цифры). */
export function waPhoneDigits(phone: string): string;
/** wa.me-ссылка; text URL-encoded через encodeURIComponent. */
export function waLink(phone: string, text: string): string; // https://wa.me/<digits>?text=...
```

Без зависимостей, без 'use client' (используется и сервером, и клиентом).

### 2. Модуль @/core/site — поле whatsapp

- `src/core/site/client.ts`: добавить `whatsapp: string | null` в `SiteSettings`,
  `SiteSettingsInput` и `EMPTY_SITE_SETTINGS` (по образцу `phone1`).
- `src/core/site/index.ts`: добавить `whatsapp: row.whatsapp` в `mapSettingsRow`.

### 3. Админ-форма настроек

`src/components/admin/SettingsForm.tsx`: поле «WhatsApp для заказов» (Input, рядом
с телефонами), placeholder `+7 707 000 00 00`, подсказка под полем: «На этот номер
приходят заказы из корзины». Сохранение — существующим действием формы (upsert).

### 4. Сиды — ОБА файла

`updateSiteSettings()` зовут ДВА сида — обновить оба, иначе typecheck упадёт:

- `src/core/db/seed-site.ts` (строки ~27-40);
- `src/core/db/seed.ts` — функция `seedSiteContent()` (строки ~109-145), её зовёт
  `npm run db:seed`, который используется в `afterAll` нескольких e2e-спеков.

В обоих: `whatsapp` = значение первого телефона из `src/lib/site-contacts.ts`
(заказчица поменяет в админке). Сиды idempotent (заполняют только пустую таблицу) —
на проде колонку заполнит заказчица руками, это ок.

### 5. Футер

`src/components/Footer.tsx`: если `settings.whatsapp` заполнен — ссылка «WhatsApp»
(href = `waLink(whatsapp, 'Здравствуйте!')`, `target="_blank" rel="noopener noreferrer"`)
рядом с Instagram. Пусто — ссылки нет. Это закрывает «рабочие ссылки WhatsApp» из
go-live-чеклиста §4.

## Тесты

- `e2e/site-admin.spec.ts`: дополнить тест формы настроек — заполнить поле WhatsApp,
  сохранить, перезагрузить /admin/settings → значение на месте.
- `e2e/site-content.spec.ts` (футер): при заполненном whatsapp в футере есть ссылка
  с href, начинающимся с `https://wa.me/`.
- Проверить, не пинят ли существующие спеки точный набор полей формы настроек /
  ссылок футера — если да, обновить ассерты.

## Команды для верификации

```bash
npm run db:seed-site       # на пустой site_settings — заполняет whatsapp
npm run typecheck && npm run lint && npm run build
npx playwright test e2e/site-admin.spec.ts e2e/site-content.spec.ts
npm run test:e2e
```

## Критерии готовности

- [ ] `waPhoneDigits('+7 707 123-45-67') === '77071234567'` (проверяется e2e через href)
- [ ] Поле WhatsApp сохраняется из админки и переживает перезагрузку (e2e)
- [ ] Футер показывает wa.me-ссылку при заполненном номере (e2e)
- [ ] typecheck, lint, build, test:e2e — exit 0
