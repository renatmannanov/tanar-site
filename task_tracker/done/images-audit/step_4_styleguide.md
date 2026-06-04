# Step 4: Tanar Styleguide + Reusable Prompt Style-Block

> Статус: pending

## Цель

Из данных Step 3 (дизайн-аудит референсов) и стилистического вектора из исходного ТЗ сформулировать:

1. **Стайлгайд Tanar** — компактный раздел для секции 2 финального отчёта (палитра, свет, локация, субъект, film look, запреты)
2. **Шаблонный style-block** — один блок текста на английском, который будет вставляться в каждый промпт Step 5 для консистентности

Это сердцевина — без единого style-block промпты Step 5 будут разъезжаться между собой.

## Что делать

1. Составить **палитру** — взять Tailwind-токены из Placeholder.tsx + референсы Patagonia:
   - Базовые hex-коды (4–6 цветов: stone, amber/ochre, moss/forest green, graphite, snow-warm, dusty blue)
   - Пропорции (70% warm earth / 20% cool graphite / 10% highlight)
   - Явно назвать чего избегать: vivid saturation, neon, pure black, pure white

2. Определить **освещение** (единая схема, от которой отступаем только осознанно):
   - Основной режим: golden hour (рассвет предпочтительнее заката — завязка на семантику "встречающая рассвет")
   - Альтернативы для разнообразия: blue hour, soft overcast
   - Запретить: harsh midday sun, studio lighting

3. **Локация-якорь** (текстовые маркеры, обязательные в каждом промпте):
   - Positive: "Central Asian Tian Shan mountains", "Khan Tengri peak", "Kazakhstani landscape", "Zailiysky Alatau foothills", "larch and spruce forest", "yellow alpine grass"
   - Negative: "not Swiss Alps", "not Rocky Mountains", "not Scandinavian / Nordic", "not Himalayas"

4. **Субъект**:
   - Дефолт: single figure in distance, silhouette, from behind or profile
   - Черты: Central Asian / Kazakh features, weathered skin, age 25–40
   - Одежда: muted outdoor gear (earthy tones), **без видимых логотипов и брендов**
   - Поза: тихое присутствие, не action, не sport

5. **Film look** — зафиксировать один конкретный референс (будет повторяться во всех промптах):
   - Кандидаты: "Fujifilm Pro 400H film stock aesthetic", "Kodak Portra 400 film look", "matte film look with subtle grain"
   - Выбрать один и держаться его

6. **Запреты** (единый стоп-лист для негативной части каждого промпта):
   - no visible logos, no text, no brand names
   - no crowds, no action sports
   - no vivid / neon / oversaturated colors
   - no bright red, no electric blue
   - no studio lighting, no white background
   - no generic alpine Swiss look
   - no modern product labels

7. Финализировать **единый style-block** — одну строку / короткий абзац на английском, который вставляется в каждый промпт. Примерный черновик:

   ```
   Style anchor (apply to every image in the set): warm golden-hour light,
   matte film look with subtle grain, earthy palette of stone, moss green,
   amber ochre, and graphite. Fujifilm Pro 400H aesthetic. Central Asian
   Tian Shan mountains — Khan Tengri region, Kazakhstani landscape with
   yellow alpine grass, larch and spruce forests, rust-ochre foothills.
   No visible logos or text. No vivid saturation, no neon, no bright red
   or electric blue. Not Swiss Alps, not Rocky Mountains, not Nordic —
   specifically Central Asian Tian Shan. No studio lighting, no white
   background, no modern product labels.
   ```

   Отшлифовать формулировку (длина ~80–120 слов, без повторов).

## Куда сохранить

`task_tracker/todo/images-audit/_findings_step4.md` с двумя блоками:
- `## Styleguide (RU)` — для секции 2 отчёта
- `## Style-block EN (copy-paste into every prompt)` — финальный шаблон

## Критерии готовности

- [ ] Палитра с hex-кодами (минимум 5 цветов) + пропорции
- [ ] Режим освещения зафиксирован (основной + допустимые варианты)
- [ ] Локация-якорь (positive + negative маркеры) выписана явно
- [ ] Субъект описан (внешность, одежда, поза)
- [ ] Film look — один конкретный референс выбран
- [ ] Стоп-лист содержит минимум 8 пунктов
- [ ] Финальный style-block на английском, 80–120 слов, без повторов
- [ ] Пометить статус в PLAN.md → done
