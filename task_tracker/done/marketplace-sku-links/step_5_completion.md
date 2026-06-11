# Шаг 5: Завершение плана

> Зависит от: шаги 1–4
> Статус: [x] done (2026-06-11)

## Чеклист

- [x] Все шаги плана выполнены ([x] в PLAN.md)
- [x] Критерии готовности из PLAN.md проверены (каждый — командой или e2e)
- [x] Smoke end-to-end на dev: после `db:seed-mp-links` страница sv7 отдаёт
      импортированную ссылку TANAR-001 (ozon-id 4373879096 в payload, curl);
      поведение клика по размеру покрыто e2e «storefront buttons follow…»
- [x] Не сломано: `npm run test:e2e` полностью зелёный (124)
- [x] CLAUDE.md обновлён: «Данные» (sku.marketplaces, источник — снапшот
      marketplace-links.json + сидер), «Структура сайта» (кнопки МП ведут на
      карточку размера), деплой-блок (новый tools-сервис seed-marketplace-links)
- [x] task_tracker/backlog/ARCHITECTURE-ecommerce.md: ссылки МП per-SKU
      отражены в модели Sku (задел Фазы 5)
- [x] context.md проекта обновлён (фокус, решения)
- [x] Мусор убран (временных файлов нет; extract-скрипт ОСТАЁТСЯ — он
      переиспользуется при обновлении таблицы заказчицы)
- [x] Статус в PLAN.md → done
- [x] Папка перемещена: `task_tracker/todo/marketplace-sku-links/` → `task_tracker/done/marketplace-sku-links/`

## Прод-деплой (после merge в main)

Порядок — в PLAN.md «Прод-деплой этого плана». Не забыть ОБЕ пересборки
tools-образов (`migrate`, `seed-marketplace-links`) с `--no-cache` — грабля
2026-06-10. После сидера проверить SQL: 109 SKU с обеими ссылками.

## Команды для верификации

```bash
npm run typecheck && npm run lint && npm run build
npm run test:e2e
```
