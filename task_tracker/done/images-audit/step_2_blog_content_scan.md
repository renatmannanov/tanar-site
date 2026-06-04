# Step 2: Blog Content Scan

> Статус: pending

## Цель

Прочитать все 6 MDX-постов блога и зафиксировать для каждого:
- Реальную тему (из frontmatter + первых параграфов, не из slug)
- Настроение / сеттинг
- Наличие inline `<img>` в теле (если есть — записать позицию и что изображает)
- Цветовой/световой намёк (горы / озеро / каньон / рассвет / закат / зима / осень / …)

Эти данные нужны чтобы промпты обложек в Step 5 были привязаны **к реальному содержанию**, а не к догадкам по названию файла.

## Что делать

1. Прочитать все 6 файлов целиком:
   - [content/blog/choose-jacket-tian-shan.mdx](../../../content/blog/choose-jacket-tian-shan.mdx)
   - [content/blog/eco-philosophy.mdx](../../../content/blog/eco-philosophy.mdx)
   - [content/blog/khan-tengri-ascent.mdx](../../../content/blog/khan-tengri-ascent.mdx)
   - [content/blog/kolsai-backpack-test.mdx](../../../content/blog/kolsai-backpack-test.mdx)
   - [content/blog/tanar-brand-story.mdx](../../../content/blog/tanar-brand-story.mdx)
   - [content/blog/treks-kazakhstan.mdx](../../../content/blog/treks-kazakhstan.mdx)

2. Для каждого поста записать:
   - `title` и `excerpt` из frontmatter
   - `cover` gradient (если указан в frontmatter — может пригодиться для чувствительного подбора палитры)
   - 2–3 строки "о чём пост" (не пересказ, а суть визуального сеттинга)
   - Настроение (одним словом: альпинизм / медитативный поход / брендовый сторителлинг / полевой тест снаряжения / эко-философия / …)
   - Есть ли `<img>` в теле (если да — сохранить `alt` и контекст)
   - Кандидат-сцена для обложки (одной фразой, по-русски)

3. Проверить нет ли upload-пути, который ожидает картинки из `public/images/blog/<slug>/…` — если такой конвенции пока нет, **предложить** её в отчёте Step 6.

## Куда сохранить

Заметки в `task_tracker/todo/images-audit/_findings_step2.md` в формате:

```markdown
## khan-tengri-ascent

- title: ...
- excerpt: ...
- cover (frontmatter): ...
- тема: восхождение на Хан-Тенгри, ...
- настроение: альпинизм, экспедиция, высота
- inline <img>: нет / есть (детали)
- кандидат-сцена для обложки: "альпинист на гребне перед вершиной Хан-Тенгри в синий час перед рассветом"
- кандидат-slug для файла: public/images/blog/khan-tengri-ascent/cover.webp
```

## Критерии готовности

- [ ] Все 6 MDX прочитаны целиком (не только frontmatter)
- [ ] `_findings_step2.md` заполнен по шаблону для каждого поста
- [ ] Зафиксировано общее количество inline `<img>` по всем постам (0 — ок, помечаем Step 5.5 как "не требуется")
- [ ] Предложен единый путь-конвенция для cover-файлов (например `public/images/blog/<slug>/cover.webp`)
- [ ] Пометить статус в PLAN.md → done

## Verification-команды

```bash
# Есть ли inline <img> вообще
grep -c "<img" content/blog/*.mdx

# Frontmatter всех постов в один вывод
head -n 20 content/blog/*.mdx
```
