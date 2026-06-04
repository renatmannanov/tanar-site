# Review: Risks

## Критичное (только [CONFIRMED] и [LIKELY])

### R1 — curl-команды в step_4 используют bash-синтаксис, несовместимый с Windows PowerShell [CONFIRMED]
**Шаг:** step_4_order_api.md, блок "Команды для верификации"
**Проблема:** Команды вида `curl -s -o /dev/null -w "%{http_code}\n" ...` с одинарными кавычками в `-d '{"items":...}'` не работают в PowerShell 5.1 (WSL-curl на Windows требует другого экранирования, одинарные кавычки внутри строки — ошибка парсера). Также `-o /dev/null` — linux-путь, в Windows нужно `-o NUL` или `$null`. Агент-исполнитель на win32 запустит команду и получит ошибку/неверный результат, но может счесть её верификацией и пройти шаг. Фактически верификация HTTP-кодов ответа окажется непроверенной.
**Ссылка:** `task_tracker/todo/cart/step_4_order_api.md`, строки 76–83.

### R2 — Отсутствует rate-limiting и защита /api/order от спама/DoS [LIKELY]
**Шаг:** step_4_order_api.md
**Проблема:** Route handler не предусматривает никакой защиты от массовых запросов. Telegram Bot API имеет лимиты (30 сообщений/сек, 1 сообщение/сек в конкретный чат). При flood POST-запросов: а) Telegram заблокирует бота (HTTP 429), б) route будет бесконечно вызывать `getNotifier().send()`, потребляя ресурсы serverless-функции. Валидации max-длины полей нет (contact может быть 100 KB строкой — план говорит только `min 5`, про max не сказано). Next.js App Router не ставит rate-limit автоматически.
**Ссылка:** `task_tracker/todo/cart/step_4_order_api.md`, строки 49–57 (валидация) — max-длина `contact`, max `qty`, max `items.length` не упомянуты.

---

## Важное (только [CONFIRMED] и [LIKELY])

### R3 — Цена в localStorage — снимок на момент добавления, рассинхрон при изменении products.ts [CONFIRMED]
**Шаг:** step_1_cart_core.md (поле `price: number` в `CartItem`), PLAN.md (архитектурное решение)
**Проблема:** При изменении цены товара в `src/data/products.ts` уже лежащий в `localStorage` `CartItem` сохранит старую цену. Пользователь увидит устаревшую сумму. Сервер в step_4 пересчитывает `total` из `items`, но сами `price` в items принимает как данность — т.е. клиент может отправить товар по старой (или произвольной) цене и route handler это примет. Серверная защита только для `total`, но не для `price` каждого item.
**Ссылка:** `task_tracker/todo/cart/step_4_order_api.md` строка 53: `price(number ≥ 0)` — валидируется только что `≥ 0`, не сверяется с данными из `products.ts`.

### R4 — Hydration mismatch для CartDrawer в CartProvider [LIKELY]
**Шаг:** step_1_cart_core.md / step_3_cart_drawer.md
**Проблема:** Plan говорит рендерить `CartDrawer` внутри `CartProvider` после `{children}`. Если `isOpen` читается из state, инициализированного из localStorage (или просто `false`), это само по себе безопасно. Однако `CartProvider` рендерится в server-component layout (Next.js 15), и любой client-state `isOpen: false` на сервере/клиенте до hydration будет одинаков — риск низкий. Но паттерн `mounted` упомянут только для бейджа (`CartButton`, step_3), не для `CartDrawer`. Если агент не применит аналогичный паттерн к `CartDrawer` (или к подсчёту items), возможен hydration warning при SSR если `items` в localStorage не пусты при первой загрузке.

### R5 — Сценарий 2 Playwright ("dec дважды → позиция удаляется") может быть нестабильным [CONFIRMED]
**Шаг:** step_6_e2e.md, строка 22: `cart-item-qty-dec` дважды → позиция удаляется.
**Проблема:** `setQty` при `qty < 1` удаляет позицию (step_1). После инкремента qty=2, dec дважды → qty=0 → удаляется. Логика корректна. Но тест кликает dec дважды подряд без `await expect` между кликами. При медленном ре-рендере второй клик может попасть в уже исчезнувший элемент (Playwright throws). Стиль существующих тестов не известен заранее агенту, он может написать без промежуточного ожидания.

### R6 — Страница товара без вариантов: colorId='' + colorLabel='' — агент может упустить [CONFIRMED]
**Шаг:** step_2_add_to_cart.md, строка 31: "Проверить вручную: добавление товара без вариантов не падает" — это только ручная проверка, не e2e.
**Проблема:** В step_6 (e2e) все сценарии используют `/catalog/shell-jacket-khan` — товар с вариантами. Товар без вариантов (colorId='') в автотестах не покрыт. Если агент-исполнитель написал условие `if (product.variants)` и пропустил случай когда `activeVariant` — undefined, клик "В корзину" упадёт в runtime при рендере на товаре без вариантов.

### R7 — Playwright-тест на персистентность (сценарий 3) конфликтует с изоляцией браузерного контекста [LIKELY]
**Шаг:** step_6_e2e.md, строка 23–25 (сценарий 3).
**Проблема:** `page.reload()` в тесте работает в том же browser context — localStorage сохраняется. Но если Playwright запускается с `storageState` очистки (не указано в конфиге) или другой тест до него вызвал `page.context().clearCookies()`, localStorage может быть пуст. В текущем конфиге (`playwright.config.ts`) явной очистки нет, но при добавлении `beforeEach` / `afterEach` очистки в spec-файл агентом для изоляции тестов — сценарий 3 сломается.

---

## Мелочи

### R8 — Секреты TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID в .env.example [THEORETICAL]
**Шаг:** step_4_order_api.md
В `.env.example` будут только имена переменных без значений — это стандартная практика. Риска нет если агент не создаст `.env` с реальными значениями и не закоммитит его. Шаг явно говорит только про `.env.example`. Проверить что `.env` в `.gitignore` — план не упоминает, но Next.js добавляет его по умолчанию.

### R9 — qty overflow (очень большое число) [THEORETICAL]
**Шаги:** step_1, step_3
`changeQty` не ограничена сверху. Пользователь вручную может ввести 9999999. Нет проверки `Number.isFinite` и max-значения. Теоретически, но план нигде не указывает max_qty.

---

## Не найдено проблем

- **comingSoon-защита** — покрыта явно: PLAN.md + step_2 + progress.md, тип `comingSoon: true` в данных.
- **SSR vs client CartProvider** — Next.js 15 App Router позволяет server component импортировать client component. `CartProvider` с `'use client'` в server layout — корректный паттерн. Явно описан в progress.md.
- **Telegram как "бэкенд"** — route handler — это Next.js API Route, он работает на сервере Next.js, не требует отдельного бэкенда/БД. Соответствует правилу CLAUDE.md "Никакого бэкенда, никакой БД" (внешних зависимостей кроме Telegram API нет).
- **CI без Telegram-секретов** — явно учтено в step_6 строка 36: `notifier = console → /api/order вернёт 200`.
- **Порядок зависимостей шагов** — корректен: 1→2→3, 1→4, 3+4→5, 2+3+4+5→6.
