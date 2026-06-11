# Шаг 5: Завершение плана

> Зависит от: шаги 1–4
> Статус: [ ] pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой или e2e)
- [ ] Smoke end-to-end на dev: выбрать размер с импортированной ссылкой
      (sv7 после `npm run db:seed-mp-links`) → кнопка Kaspi ведёт на карточку
      размера (проверка href вручную в браузере или curl страницы)
- [ ] Не сломано: `npm run test:e2e` полностью зелёный
- [ ] CLAUDE.md обновлён: «Данные» (sku.marketplaces, источник — снапшот
      marketplace-links.json + сидер), «Структура сайта» (кнопки МП ведут на
      карточку размера), деплой-блок (новый tools-сервис seed-marketplace-links)
- [ ] task_tracker/backlog/ARCHITECTURE-ecommerce.md: упомянуть, что ссылки МП
      хранятся per-SKU (задел Фазы 5)
- [ ] context.md проекта обновлён (фокус, решения)
- [ ] Мусор убран (временные файлы; extract-скрипт ОСТАЁТСЯ — он переиспользуется
      при обновлении таблицы заказчицы)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `task_tracker/todo/marketplace-sku-links/` → `task_tracker/done/marketplace-sku-links/`

## Прод-деплой (после merge в main)

Порядок — в PLAN.md «Прод-деплой этого плана». Не забыть ОБЕ пересборки
tools-образов (`migrate`, `seed-marketplace-links`) с `--no-cache` — грабля
2026-06-10. После сидера проверить SQL: 109 SKU с обеими ссылками.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npm run test:e2e
```
