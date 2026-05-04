# Step 8: Завершение плана

> Статус: pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой или тестом)
- [ ] Smoke test: результат работает end-to-end
  - `/catalog` — видны 12 товаров, фото у реальных, бейджи "Скоро" у заглушек
  - `/catalog/shell-jacket-khan` — видна галерея с 3+ миниатюрами, переключатель цветов работает, URL обновляется при смене цвета
  - `/catalog/shell-jacket-khan?color=red` — открывается сразу с красным цветом
  - `/catalog/pants-charyn` — заглушка с градиентом, без кнопки "Узнать о наличии"
  - Шапка содержит знак-гору + "TANAR"
  - Фильтр-чипы в каталоге показывают новые категории
- [ ] Не сломано: существующий функционал не пострадал
  - Главная страница `/` рендерится
  - Блог `/blog` и `/blog/[slug]` рендерятся
  - Mobile nav открывается на 375px
  - `npm run test:e2e` — все тесты зелёные (или обновлены под новые категории, если были на backpacks/accessories)
- [ ] Sharp скрипт работает идемпотентно: повторный `npm run images` пропускает обработанные
- [ ] `npm run images:check` — все variants × models имеют файлы на диске
- [ ] `<repo>/assets/` существует и содержит источники, при этом игнорится git'ом (`git check-ignore -v assets/products/...` подтверждает)
- [ ] Мусор убран:
  - В `public/images/` нет случайных JPG (только webp + структура папок)
  - Удалены временные файлы из scratch/
  - Лого в `public/logo/` без дублей
- [ ] Проверка обновлений Playwright тестов
  - Если были тесты на категории `backpacks` или `accessories` — обновить или удалить
  - Если были тесты на конкретные slug'и удалённых товаров — обновить
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `task_tracker/todo/photos-integration/` → `task_tracker/done/photos-integration/`

## Verification

```bash
npm run build
npm run typecheck
npm run lint
npm run test:e2e
npm run images:check
```

Все 5 команд — exit 0.

```bash
# Визуально проверить в браузере:
npm run dev
# Открыть и кликнуть по всем критическим путям из чеклиста выше
```

## Финальный коммит

```bash
git add -A
git commit -m "feat: integrate real product photos with color variants

- Add Hoodies category, replace Backpacks/Accessories with Pants/Shorts (placeholders)
- Add ProductColor variants with hex swatches and per-model image sets
- Add sharp pipeline (npm run images) for asset optimization
- Add color picker on product page with URL sync (?color=X)
- Replace logo in header (mountain mark + TANAR)
"
```

(Не делать `git push` — только локальный коммит.)
