# Step 12: Завершение плана

> Статус: [x] done

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md, шаги 1–11)
- [ ] Критерии готовности из PLAN.md проверены (каждый — командой или тестом):
  - [ ] `npm run build` — exit 0
  - [ ] `npm run typecheck` — exit 0
  - [ ] `npm run lint` — exit 0
  - [ ] `npm run test:e2e` — все проходят
- [ ] Smoke test: 5 URL открываются без ошибок (проверено в step_11 Playwright'ом)
- [ ] Мусор убран:
  - [ ] `src/app/_design/` удалён (step_10)
  - [ ] `content/blog/_placeholder.mdx` удалён (step_9)
  - [ ] Неиспользуемые импорты — lint чистый

## Финализация (строгий порядок — не менять!)

### 1. Обновить статус в PLAN.md

Кросс-платформенная замена — использовать **Claude Code Edit tool** (а не sed/node/powershell), т.к. работа с кириллицей в shell-скриптах на Windows ненадёжна:

- Открыть `task_tracker/todo/initial-build/PLAN.md` через Edit tool
- Заменить `> Статус: pending` на `> Статус: done` (ровно в верхней шапке файла)

Если по какой-то причине Edit tool недоступен, fallback через node с явным UTF-8:

```bash
node -e "const fs=require('fs');const p='task_tracker/todo/initial-build/PLAN.md';const s=fs.readFileSync(p,{encoding:'utf8'});const r=s.replace('> Статус: pending','> Статус: done');if(r===s){console.error('No replacement happened — check encoding');process.exit(1)}fs.writeFileSync(p,r,{encoding:'utf8'})"
```
Скрипт **падает с exit 1** если замена не произошла (например из-за проблем с кодировкой) — это ловит тихий fail.

Проверка:

```bash
grep -q "^> Статус: done$" task_tracker/todo/initial-build/PLAN.md
```

### 2. Переместить папку плана из todo/ в done/

**`git mv` здесь — разрешённая операция** (явно разрешена этим step'ом, guardrails ralph.ps1 блокируют только `rm -rf` / `git reset --hard` / `git push`):

```bash
mkdir -p task_tracker/done
git mv task_tracker/todo/initial-build task_tracker/done/initial-build
```

### 3. Финальный коммит

```bash
git add -A
git commit -m "chore: complete initial-build plan"
```

### 4. Проверка что всё на месте

```bash
test -d task_tracker/done/initial-build
test ! -d task_tracker/todo/initial-build
test -f task_tracker/done/initial-build/PLAN.md
grep -q "^> Статус: done$" task_tracker/done/initial-build/PLAN.md
```

### 5. Завершение Ralph loop

**Только после всех пунктов выше** — вывести:

```
<promise>COMPLETE</promise>
```

Важно: этот вывод должен идти **последним** в сообщении. Если в сообщении есть ошибки выполнения команд — не выводить COMPLETE, обработать ошибку или вывести `<promise>BLOCKED</promise>`.

## Критерии готовности

- [ ] PLAN.md содержит `> Статус: done`
- [ ] Папка `task_tracker/done/initial-build/` существует
- [ ] Папка `task_tracker/todo/initial-build/` НЕ существует
- [ ] Коммит `chore: complete initial-build plan` присутствует
- [ ] `<promise>COMPLETE</promise>` выведен последним
