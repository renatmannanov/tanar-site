# Шаг 7: Завершение плана

> Статус: pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой или тестом)
- [ ] Smoke test: товар → корзина → изменение qty → чекаут → /api/order 200, end-to-end
- [ ] Не сломано: существующий функционал (home, catalog, product, blog) не пострадал — `npm run test:e2e` зелёный
- [ ] `npm run typecheck` + `npm run lint` + `npm run build` — чисто
- [ ] CLAUDE.md обновлён (env-переменные мессенджера, упоминание /api/order)
- [ ] `.env.example` на месте
- [ ] Мусор убран (временные файлы, console.log кроме ConsoleNotifier)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: todo/cart/ → done/cart/

## Заметки для будущего

- WhatsApp как вторая реализация Notifier — добавить ветку в `getNotifier()` + `whatsapp-notifier.ts`, когда заказчица определится с каналом.
- Реальные ссылки маркетплейсов (Ozon/Kaspi) в `products.ts` — заглушки, заменить на боевые (задача №0, отдельно).
- Админка (задача №2) — в бэклоге, отдельный план.
