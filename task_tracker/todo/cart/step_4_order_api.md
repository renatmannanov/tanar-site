# Шаг 4: API route /api/order + notifier-абстракция

> Зависит от: шаг 1
> Статус: [ ] pending

## Задача

Создать серверный route handler, принимающий заказ, и абстракцию канала уведомления (notifier) с двумя реализациями: console (default) и Telegram.

### `src/lib/notify/notifier.ts`

```ts
import type { Order } from '@/lib/cart';

export interface Notifier {
  send(order: Order): Promise<void>;
}
```

Плюс `formatOrderMessage(order: Order): string` — человекочитаемый текст заказа на русском:
- список позиций (название, цвет, qty × цена = сумма позиции),
- Итого,
- контакт покупателя,
- дата.

### `src/lib/notify/console-notifier.ts`

`ConsoleNotifier implements Notifier` — `console.log` отформатированного сообщения. Default-реализация, чтобы локально и на старте всё работало без секретов.

### `src/lib/notify/telegram-notifier.ts`

`TelegramNotifier implements Notifier`:
- конструктор: `botToken`, `chatId`.
- `send`: `fetch` на `https://api.telegram.org/bot<token>/sendMessage`, body `{ chat_id, text, parse_mode: 'HTML' }`.
- при не-2xx ответе — throw с текстом ошибки (route поймает и вернёт 502).

### `src/lib/notify/index.ts`

`getNotifier(): Notifier` — фабрика:
- если `process.env.TELEGRAM_BOT_TOKEN` и `process.env.TELEGRAM_CHAT_ID` заданы → `TelegramNotifier`,
- иначе → `ConsoleNotifier`.

(WhatsApp добавится позже как ещё одна реализация + ветка в фабрике. Сейчас НЕ делаем.)

### `src/app/api/order/route.ts`

- `export async function POST(req: Request)`.
- Парсит JSON тело → ожидает `{ items: CartItem[], total: number, contact: string }`.
- Валидация (без сторонних либ, вручную):
  - `items` — непустой массив,
  - каждый item имеет `slug`(string), `qty`(int ≥ 1), `price`(number ≥ 0), `name`(string),
  - `contact` — строка, trimmed length ≥ 5,
  - `total` — number, и совпадает с пересчитанной суммой `cartTotal(items)` (защита от подделки на клиенте; при расхождении — пересчитать на сервере, использовать серверное значение).
  - При нарушении → `Response.json({ error }, { status: 400 })`.
- Собирает `Order` (с `createdAt = new Date().toISOString()`, серверным total).
- `await getNotifier().send(order)`; при ошибке notifier → `status: 502`.
- Успех → `Response.json({ ok: true }, { status: 200 })`.

### Документация

- Создать `.env.example` с `TELEGRAM_BOT_TOKEN=` и `TELEGRAM_CHAT_ID=` + комментарием.
- Добавить в `CLAUDE.md` секцию про переменные окружения мессенджера (как получить bot token у @BotFather, как узнать chat_id).

## Тесты

- e2e в шаге 6 будет дёргать /api/order и проверять 200 (console-notifier по умолчанию в CI — секретов нет).
- Проверить вручную curl-ом валидное и невалидное тело (см. команды).

## Команды для верификации

```bash
npm run typecheck
npm run build
# При запущенном dev-сервере:
# валидное тело → 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[{"slug":"shell-jacket-khan","colorId":"red","name":"Куртка Хан Шелл","colorLabel":"Красный","price":149900,"qty":1}],"total":149900,"contact":"Айгерим +77001234567"}'
# невалидное тело (пустой contact) → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[],"total":0,"contact":""}'
```

## Критерии готовности

- [ ] `Notifier` интерфейс + `ConsoleNotifier` + `TelegramNotifier` + `getNotifier()` фабрика созданы
- [ ] `/api/order` POST: 200 на валидное тело, 400 на невалидное
- [ ] Сервер пересчитывает total сам, не доверяет клиентскому
- [ ] `.env.example` создан, CLAUDE.md дополнен секцией про env мессенджера
- [ ] `npm run build` проходит
