# Шаг 9: Завершение плана

> Зависит от: шаги 1–8
> Статус: [x] done

## Чеклист

- [x] Все шаги плана выполнены ([x] в PLAN.md)
- [x] Критерии готовности из PLAN.md проверены (typecheck/lint/build — exit 0;
      `npm run test:e2e` — 102 passed; каждый функциональный критерий закрыт
      поведенческим e2e в `cart.spec.ts` / `admin-orders.spec.ts` /
      `admin-marketplaces.spec.ts` / `site-admin.spec.ts`)
- [x] Smoke test end-to-end: автоматизирован в `e2e/admin-orders.spec.ts` —
      реальный браузер: товар → размер → корзина → оформление → wa.me-href
      с читаемым текстом → заказ в /admin/orders → смена статуса → reload
- [x] Не сломано: `npm run test:e2e` полностью зелёный (все старые спеки)
- [x] CLAUDE.md обновлён: «Структура сайта» (корзина/drawer/checkout), «Данные»
      (заказы, whatsapp, marketplaces, zod-грабли), «Модульная структура»
      (`core/orders` не заглушка; `@/core/orders/client` для client-компонентов)
- [x] context.md проекта обновлён (фокус, решения, открытые вопросы)
- [x] Мусор убран (нет временных файлов, console.log только в db-скриптах)
- [x] Бэклог актуализирован: `task_tracker/backlog/go-live-checklist.md` пункт 4
      помечен выполненным со ссылкой на этот план
- [x] Заметка для прод-деплоя записана (go-live-checklist §4 + ниже):
      деплой этого плана требует `docker compose ... build --no-cache` (новые
      миграции) + `--profile tools run --rm migrate`; после деплоя заказчица
      заполняет «WhatsApp для заказов» в /admin/settings (сид прода не трогаем)
- [x] Статус в PLAN.md → done
- [x] Папка перемещена: `task_tracker/todo/cart-whatsapp/` → `task_tracker/done/cart-whatsapp/`

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npm run test:e2e
```
