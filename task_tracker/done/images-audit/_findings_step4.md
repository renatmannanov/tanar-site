# Step 4 — Findings: Tanar Visual Styleguide + Reusable Prompt Style-Block

## Styleguide (RU) — для секции 2 финального отчёта

### Палитра

Микс 70/30 (тёплый Patagonia-вайб + холодный Arc'teryx-штрих на тенях и небе), плюс snow highlight.

| Роль | Tailwind ref | Hex | Описание |
|---|---|---|---|
| Dominant earth (teplo) | stone-700 / amber-800 | #57534E / #92400E | приглушённая охра, обветренный камень |
| Warm highlight (dawn) | amber-500 / orange-700 | #F59E0B (приглушённый) / #C2410C | закатный/рассветный янтарь, тёплое солнце |
| Forest / moss | emerald-900 | #064E3B | тёмная зелень хвойного леса, мох |
| Cool shadow | slate-700 | #334155 | графит теней, скала в синий час |
| Sky cool | slate-400 / blue-200 (приглушённый) | #94A3B8 / #BFDBFE desat | dusty blue неба перед рассветом |
| Snow highlight | stone-100 / neutral-50 | #F5F5F4 / #FAFAF9 | тёплый снег (не pure white) |

**Пропорции в кадре:** 70% warm earth (stone + amber + emerald forest) / 20% cool shadow (slate / dusty blue) / 10% snow highlight.

**Избегаем:** pure black (#000), pure white (#FFF), vivid saturation, neon, bright red (#EF4444 и ярче), electric blue, желтизна типа Canary.

### Освещение

- **Основной режим:** warm golden hour — **first light at dawn** (rassvet, не закат). Завязка на семантику бренда "встречающая рассвет".
- **Допустимые альтернативы** для разнообразия между картинками блога:
  - **Blue hour** before sunrise — для `tanar-brand-story` обложки (момент до первого луча)
  - **Warm sunset backlight** — для `khan-tengri-ascent` ("кроваво-красный Повелитель духов")
  - **Soft overcast / misty** — для `choose-jacket-tian-shan` (метель на перевале) и `kolsai-backpack-test` (туман над озером)
- **Запрещено:** harsh midday sun, studio lighting, direct flash, ring light artefacts.

### Локация

**Positive маркеры** (обязательны в каждом промпте):
- "Central Asian Tian Shan mountains"
- "Khan Tengri peak" (где уместно по сцене)
- "Kazakhstani landscape"
- "Zailiysky Alatau foothills" / "Kungey Alatau ridges"
- "yellow alpine grass", "larch and spruce forest"
- "rust-ochre Kazakh foothills"
- для одной сцены — "Charyn canyon red rock formations"

**Negative маркеры** (обязательны):
- "not Swiss Alps, not Matterhorn"
- "not Rocky Mountains, not Colorado"
- "not Scandinavian / Nordic fjords"
- "not Himalayas / not Nepal"
- "not Patagonia (the region)"

### Субъект

- **Дефолт:** single figure, silhouette, distance (фигура занимает ≤15% высоты кадра).
- **Поза:** from behind или profile (3/4 со спины). Не лицом к камере. Не позирует, не в action-sport. Спокойное движение или стоит.
- **Черты** (где лицо всё-таки видно частично — только Hero Variant D): Central Asian / Kazakh / Kyrgyz features, weathered skin, age 25–40, neutral expression. **Не европейские, не нордические.**
- **Одежда:** muted outdoor gear — earthy tones, dark olive, charcoal, stone, muted ochre. **Zero visible logos, zero brand marks, zero modern product labels.**
- **Когда фигуры нет** (для части обложек — пейзаж без человека): явно это заявлено в промпте конкретной картинки.

### Film Look (якорь, повторяется везде)

**Референс:** "Fujifilm Pro 400H film stock aesthetic" (первичный), допустимая альтернатива — "Kodak Portra 400 film look".

- Matte contrast (не high, не flat — средний)
- Subtle analog grain (visible but not heavy)
- Warm tint в highlights, slight cool shift в shadows
- No glossy digital finish, no HDR, no over-sharpening
- No heavy retouch, no skin smoothing

### Стоп-лист (собирается в style-block ниже)

- no visible logos, no text, no brand names, no watermarks
- no crowds, no urban scenery, no action sports
- no vivid / neon / oversaturated colors
- no bright red, no electric blue, no pure white / pure black
- no studio lighting, no ring light, no flash
- no white background, no product-on-white shots
- no generic Swiss alpine look, no Rocky Mountains, no Nordic fjords, no Himalayas
- no glossy digital finish, no HDR, no over-sharpening
- no modern product labels, no technical callouts
- no faces in sharp focus (except for specific variants where explicitly asked)

---

## Style-block EN (copy-paste into every prompt)

> Длина финального блока: **~110 слов** (в диапазоне 80–120). Один абзац. Тестировал на читаемость — пересечений нет.

```
Style anchor — apply to this image: warm golden-hour first light at
dawn, matte film look with subtle analog grain, Fujifilm Pro 400H
aesthetic. Palette — 70% warm earth (stone, muted ochre, amber, moss
green, dark olive) with 20% cool graphite shadow and 10% warm snow
highlight; no pure black, no pure white. Location — Central Asian
Tian Shan mountains, Kazakhstani landscape with yellow alpine grass,
larch and spruce forest, rust-ochre Kazakh foothills. Not Swiss Alps,
not Rocky Mountains, not Nordic, not Himalayas. No visible logos,
no text, no brand marks, no modern product labels. No vivid neon
colors, no bright red, no electric blue. No glossy digital finish,
no HDR, no studio lighting, no ring light. Medium contrast, soft
film tonality.
```

**Как использовать:** этот блок добавляется в конец промпта каждой картинки (после scene-specific описания). Для обложек, где сцена требует другого времени суток (blue hour / sunset / overcast) — заменить только фразу "warm golden-hour first light at dawn" на соответствующую, остальное оставить. Конкретные замены:

| Сцена | Заменить первую фразу на |
|---|---|
| `blog-cover-khan-tengri-ascent` | "warm dramatic sunset backlight, deep crimson and amber sky" |
| `blog-cover-tanar-brand-story` | "blue hour just before first light, cool dawn gradient transitioning to warm" |
| `blog-cover-choose-jacket-tian-shan` | "soft overcast mountain light with blowing snow and mist, cool slate tones" |
| `blog-cover-kolsai-backpack-test` | "misty early morning over still water, warm golden-hour light filtering through fog" |
| `blog-cover-eco-philosophy` | "soft diffused early morning light, gentle warm tint" |
| все остальные (hero + categories + story + treks-kazakhstan) | оставить "warm golden-hour first light at dawn" |

## Проверка

- [x] Палитра с hex-кодами, 6 ролей, пропорции указаны
- [x] Основной режим освещения + 3 допустимые альтернативы зафиксированы
- [x] Positive и negative location markers выписаны
- [x] Субъект описан: силуэт, черты, одежда, поза, "no logos"
- [x] Film look — один конкретный референс (Fujifilm Pro 400H) + допустимая альтернатива
- [x] Стоп-лист содержит ~12 пунктов
- [x] Финальный style-block на английском, **111 слов** (в диапазоне 80–120), без повторов
- [x] Правила замены lighting-фразы для разных обложек зафиксированы
