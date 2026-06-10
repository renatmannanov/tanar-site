# Шаг 9: Завершение плана

> Зависит от: шаги 1–8
> Статус: [ ] pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой или e2e)
- [ ] Smoke test end-to-end вручную (dev): добавить 2 товара разных цветов/размеров →
      drawer → оформить → открылся ли wa.me-href в новой вкладке с читаемым текстом →
      заказ в /admin/orders → сменить статус
- [ ] Не сломано: `npm run test:e2e` полностью зелёный (все старые спеки)
- [ ] CLAUDE.md обновлён: секция «Структура сайта» (корзина/drawer/checkout),
      «Данные» (заказы: orders/order_items, статусы, whatsapp в site_settings,
      marketplaces редактируются в админке), «Модульная структура» (`core/orders`
      больше не заглушка; `@/core/orders/client` для client-компонентов)
- [ ] context.md проекта обновлён (фокус, прогресс, решения)
- [ ] Мусор убран (нет временных файлов, console.log, закомментированного кода)
- [ ] Бэклог актуализирован: в `task_tracker/backlog/go-live-checklist.md` пункт 4
      (корзина+WhatsApp+ссылки) помечен выполненным со ссылкой на этот план
- [ ] Заметка для прод-деплоя записана в progress.md → Learnings:
      деплой этого плана требует `docker compose ... build --no-cache` (новые
      миграции) + `--profile tools run --rm migrate`; после деплоя заказчица
      заполняет «WhatsApp для заказов» в /admin/settings (сид прода не трогаем)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `task_tracker/todo/cart-whatsapp/` → `task_tracker/done/cart-whatsapp/`

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npm run test:e2e
```
