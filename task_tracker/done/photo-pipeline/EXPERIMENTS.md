# Фаза A — эксперименты (выполнено 2026-06-04)

> Ручная проверка сценариев генерации через MCP nano-banana (Gemini 2.5 Flash Image).
> Результаты-картинки: `scratch/experiments/` (gitignored).

## Тестовые объекты

- `scratch/experiments/jacket-red.jpg` — красная штормовая куртка (исходник `shell-jacket-khan/red/man/1_front.jpg`), человек на фоне гор, видны чёрные штаны.
- `scratch/experiments/hoodie-grey.jpg` (+ `-side`, `-back`) — серая беговая куртка с капюшоном и чёрными швами (`hoodie-alatau/darkgrey/man`).

## Проверенные сценарии

| # | Сценарий | Вердикт | Результат-файл |
|---|----------|---------|----------------|
| 1 | Живое → flat на белом | ✅ | `1-jacket-flat-white.png`, `hoodie-flat-{front,side,back}.png` |
| 2 | Flat → recolor flat | ✅ | `2-jacket-flat-navy.png` |
| 3 | Живое → recolor lifestyle | ✅ | `3-jacket-lifestyle-recolor-navy.png` |
| 4 | Swap (надеть др. товар) | ❌ отклонён | `5-…`, `6-…` (для истории) |

## Уроки (перенесены в nano-banana-recipes.md)

1. **flat front** — хватает "remove the person". **flat side/back** — нужно явно перечислить части тела к удалению (head, face, cap, hands, legs), иначе остаются голова и кисти. Со 2-й попытки чисто.
2. **side/back — из своего исходника** (1_side/1_back), не из front. Геометрия настоящая.
3. **recolor** (flat и lifestyle) — короткий лобовой промпт + hex, без длинных оговорок.
4. **recolor lifestyle** — "change only the jacket color, keep person/cap/pants/background". Работает, кадр может чуть перекадрироваться плотнее (даже лучше для карточки).
5. **swap отклонён**: донор-живой-кадр → тащит чужой фон (каша); донор-flat → аккуратнее, но перенос кроя/деталей всё равно кривоват и ненадёжен. Для каталога не используем.

## Что НЕ тестировали

- Генерация товара с нуля по тексту (для товаров без исходника, напр. polo) — из постановки убрана; такие товары пока на градиентах.
- Трикотаж/футболки recolor (текстура/принт) — отдельный риск, проверить при наполнении реального каталога.
