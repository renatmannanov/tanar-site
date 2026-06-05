# Шаг 6: Верификация итерации 1

> Зависит от: шаги 1-5
> Статус: [ ] pending

## Задача

Закрыть итерацию 1: единый e2e-файл на новые страницы, полный прогон, проверка что старое не сломано. Контент ещё в коде (БД — итерация 2).

### e2e (новый файл `e2e/site-content.spec.ts`)

Покрыть:
- `/contacts` → 200, h1 «Контакты», телефон `+7 701`, адрес «Розыбакиева», Instagram-ссылка присутствует.
- `/faq` → 200, h1 «Частые вопросы», текст «14 дней» и «Розыбакиева».
- Футер: нет `a[href="#"]`; ссылки на `/contacts`, `/faq`, `/blog`, instagram.com присутствуют.
- Шапка: клик «Контакты» → URL `/contacts`.
- 3 новые блог-статьи открываются (200): `o-brende-tanar`, `ob-osnovatele-ayman`, `istoriya-tanar`.
- Старый `tanar-brand-story` → 404 (удалён).

Паттерн — как `e2e/catalog.spec.ts` / `layout.spec.ts` (Playwright, `page.goto`, `getByRole`/`getByText`).

## Тесты

- Весь существующий e2e должен оставаться зелёным (число блог-постов уже поправлено в шаге 1).

## Команды для верификации

```powershell
npm run typecheck
npm run lint
npm run build
npm run db:up; npm run db:seed
npm run test:e2e
```

## Критерии готовности

- [ ] `e2e/site-content.spec.ts` создан и зелёный
- [ ] Полный `npm run test:e2e` зелёный; build/typecheck/lint зелёные
- [ ] Статусы шагов 1-6 в PLAN.md → [x]
- [ ] Коммит: `test(site): e2e for contacts/faq/footer (iteration 1 done)`
- [ ] Сообщить пользователю: итерация 1 готова, можно смотреть на сайте; спросить подтверждение на итерацию 2 (БД+админка)
