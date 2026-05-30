# Step 7: Завершение плана

> Статус: pending

## Чеклист

- [ ] Все шаги плана выполнены ([x] в PLAN.md для шагов 1–6)
- [ ] Критерии готовности из PLAN.md проверены командами:
  - [ ] `wc -l review-prompts/images_audit_result.md` — файл не пустой
  - [ ] `grep -c "^## " review-prompts/images_audit_result.md` ≥ 10 (все секции)
  - [ ] `grep -c "Tian Shan" review-prompts/images_audit_result.md` ≥ числа генерируемых картинок
  - [ ] `git diff --name-only | grep -vE "^(task_tracker|review-prompts)/"` — пусто (код не тронут)
- [ ] Smoke test отчёта: открыть `images_audit_result.md` и убедиться, что:
  - секция 6.1 содержит 4–6 разных Hero-промптов
  - секция 10 можно скопировать и передать в другое окно без дополнительных пояснений
  - есть chain-of-generation с конкретными MCP-тулзами (`generate_image`, `edit_image`, `continue_editing`)
- [ ] Не сломано: `npm run typecheck && npm run lint && npm run build` проходят (страховка, хотя код не меняли)
- [ ] Файлы `_findings_step1..5.md` остаются в `task_tracker/todo/images-audit/` как workspace-артефакты (в git — норма для этого проекта)
- [ ] Статус в PLAN.md → done
- [ ] Папка перемещена: `task_tracker/todo/images-audit/` → `task_tracker/done/images-audit/`
- [ ] Коммит на `dev`: `docs(plan): complete images-audit plan` (или аналог Conventional Commits)

## Команды переноса

```bash
# Убедиться что мы на dev
git branch --show-current  # dev

# Переместить папку
mv task_tracker/todo/images-audit task_tracker/done/images-audit

# Закоммитить (только по команде Рената)
git add task_tracker/done/images-audit task_tracker/todo review-prompts/images_audit_result.md
git status
# → показать Ренату перед git commit
```

## Notes

- Промпты на картинки в этом плане НЕ исполняются здесь. Это отдельное окно с nano-banana MCP
- После того как Ренат выберет финальный Hero и сгенерирует картинки — возможно понадобится follow-up-план на интеграцию `next/image` вместо `Placeholder` в соответствующих компонентах. Это уже отдельная задача, не в скоупе текущего плана
