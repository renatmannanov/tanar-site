# Step 3 — Findings: References Audit

> **Важное ограничение:** Patagonia-сайт на момент WebFetch (2026-04-22) возвращал holding/maintenance-страницу по всем 3 URL ("site down" с одним photo credit "PHOTO: Sonnie Trotter"). Повторный запрос по корневому `patagonia.com` — тот же результат. Arc'teryx `/shop/mens` вернул 404 ("You've strayed off trail"). Arc'teryx home и `/explore` вернули развернутый визуальный разбор.
>
> **Что это значит для отчёта:** аудит Patagonia опирается на (а) единственный photo credit, (б) общеизвестный визуальный язык бренда, который отмечен в исходном ТЗ как базовый. Это явно фиксируется в финальном отчёте как "референс изучен частично".

## Статус WebFetch по URL

| URL | Статус | Полезное содержание |
|---|---|---|
| https://www.patagonia.com/home/ | holding | только credit "PHOTO: Sonnie Trotter" |
| https://www.patagonia.com (fallback) | holding | то же |
| https://www.patagonia.com/shop/mens | holding | то же |
| https://www.patagonia.com/stories | holding | то же |
| https://arcteryx.com/us/en | **OK** | развёрнутый разбор, см. ниже |
| https://arcteryx.com/us/en/shop/mens | 404 | "You've strayed off trail" |
| https://arcteryx.com/us/en/explore | **OK** | развёрнутый разбор, см. ниже |

## Arc'teryx — что зафиксировано WebFetch-ом

### /us/en (home)

- **Hero composition:** широкий альпийский пейзаж, фигура hiker'а в среднем плане, "мал на фоне пиков", mid-stride (в движении). **Масштаб и среда важнее индивида.**
- **Color palette:** холодная доминанта — slate blue, greys, приглушённые earth tones. **Почти нет тёплой сатурации.** Минимум ярких акцентов.
- **Lighting:** overcast / diffused mountain light, мягкий и бестеневой — не dramatic golden hour. Приоритет читаемости gear-деталей.
- **Surface:** glossy, high-res digital finish. **Нет film grain**, нет винтажа. Современно и чисто.
- **Subject:** стабильно "human-in-landscape" во всех секциях (shells, sun protection, trail). Никогда изолированные продуктовые шоты.
- **Typography:** минимум текста на картинке, копи сидит под/рядом с фото. Картинка не перегружена.
- **Contrast:** высокий контраст, чистое определение subject/background. **Не moody, не low-key** — приоритет visibility и технической точности.

### /us/en/explore

- **Hero composition:** спортсмены как центральные субъекты внутри горных пейзажей (Sarah Hueniken in climbing hero, Alannah Yip, Joel Loverin, Janelle Smiley). Фигура интегрирована в среду, не доминирует.
- **Color palette:** cool-toned с natural earth hues. Rocky greys, forest greens, snow whites. **Минимум brand-saturation — пейзаж "честный", не маркетинговый**.
- **Lighting:** diffused / overcast, **не romantic warmth.** Even exposure ради technical clarity.
- **Film quality:** clean, contemporary, glossy, high-res, minimal grain.
- **Subject:** "human-in-landscape" консистентно — атлеты занимают скромную позицию в кадре, expansive geography.
- **Contrast:** mid-to-high, technical documentation + aspirational adventure. Не плоско, не агрессивно.

## Patagonia — что пришлось собрать из косвенных источников

WebFetch не вернул реальный визуал. То что можно утверждать **с фильтром качества "это приём видимый где-то или общая отсебятина?":**

1. **Photo credit "Sonnie Trotter"** виден на всех holding-страницах — это известный climbing-фотограф, у которого узнаваемый визуальный язык: тёплые silhouettes на скалах в golden hour, human-as-silhouette-in-landscape. Это **косвенно подтверждает** тёплый Patagonia-вайб, но единственный credit — тонкая опора.
2. **Остальное — из брендовой памяти** (исходное ТЗ явно декларирует "тёплая земляная палитра Patagonia" как известный факт, и этот факт используется как база, а не как открытие через WebFetch).

→ **Честная формулировка в отчёте:** "Patagonia-часть аудита — на основе credit-а Sonnie Trotter + общеизвестного визуального языка бренда, не верифицирована live-разбором. Если критично — Ренату пересматривать когда сайт вернётся."

## Сводная таблица "берём / отвергаем"

| # | Бренд | Приём | Решение | Причина |
|---|---|---|---|---|
| 1 | Arc'teryx | **Human-in-landscape** — фигура мал в кадре, масштаб среды важнее | **берём** | идеально попадает в "тихое присутствие человека" из нашего стилистического вектора |
| 2 | Arc'teryx | Фигура **mid-stride, в движении** (активная, а не позирует) | частично | берём "естественную позу идущего", **отвергаем** "спортивный action" |
| 3 | Arc'teryx | Overcast / diffused soft light | **отвергаем для основного режима** | наш анкор — golden hour (семантика "встречающая рассвет"). Но допускаем как вариант для blue-hour / overcast обложек блога (напр. `choose-jacket-tian-shan` про метель) |
| 4 | Arc'teryx | Cool-toned palette (slate, forest green, snow white) | частично | 30% нашего микса — холодный Arc'teryx-штрих (графит, dusty blue на тени). 70% — тёплая Patagonia |
| 5 | Arc'teryx | Glossy, clean, no grain, high-res digital | **отвергаем** | наш анкор — matte film look с зерном. Glossy "обесчеловечивает" кадр, а у нас рассвет и интимность |
| 6 | Arc'teryx | High-contrast, technical clarity | частично | берём **среднюю контрастность** (mid-tone). Не high-contrast, но и не плоско |
| 7 | Arc'teryx | Минимум типографики поверх фото | **берём** | наш Hero.tsx кладёт текст поверх, но сам контейнер — фото чистое, без зашитых букв |
| 8 | Arc'teryx | Атлеты названы поимённо (Sarah Hueniken, Alannah Yip) — фокус на личности | **отвергаем** | у нас анонимный силуэт, спиной / в профиль, без героизации. Ближе к Patagonia-сторителлингу |
| 9 | Patagonia (косв.) | Silhouette-in-landscape в тёплом backlight (по climbing-фотографии Trotter) | **берём** | ядро нашего стиля |
| 10 | Patagonia (косв.) | Тёплая земляная палитра (охра, stone, муж. хаки) | **берём** | 70% нашего микса |
| 11 | Patagonia (косв.) | Film look с лёгким зерном (бренд-память) | **берём** | явно в анкоре (Fujifilm Pro 400H / Kodak Portra 400) |
| 12 | Общее (оба) | Продуктовое фото на белом фоне | **отвергаем** | явно запрещено в исходном ТЗ, и не выражено у Arc'teryx (live, что мы видели) |
| 13 | Arc'teryx (гипотетически) | Яркий бренд-красный на куртке | **отвергаем** | противоречит нашей приглушённой палитре. WebFetch отмечает "minimal vibrant accent colors" у Arc'teryx — значит они сами это редко делают, но мы всё равно страхуемся негативным указанием |

## Ключевые выводы для Tanar

1. **Композиционно** — мы ближе к Arc'teryx (human-in-landscape, масштаб), но **атмосферно** — ближе к Patagonia (warm golden hour, silhouette, film look). Это и есть заявленный микс 70/30.
2. **Главное что **не повторяем** за Arc'teryx:** glossy finish и overcast flat light. Наш режим — тёплый рассвет с зерном и мягким контрастом.
3. **Главное что **не повторяем** за Patagonia (когда вернётся сайт — проверить):** если увидим фигуры в полный рост с открытыми лицами и именованным героизмом — для нас это тоже не подходит. У нас анонимный силуэт.
4. **Стоп-лист** для промптов Step 5:
   - no vivid saturation, no neon
   - no bright red or electric blue brand accents
   - no glossy studio finish — prefer matte film look
   - no flat overcast light — prefer warm golden / blue hour
   - no visible faces in hero / full product shots — prefer silhouette
   - no generic Swiss Alps / Rockies / Nordic look — strictly Central Asian Tian Shan

## Проверка

- [x] WebFetch выполнен по всем 6 URL (+ 1 fallback по patagonia.com)
- [x] Статус каждого URL явно зафиксирован
- [x] Для Arc'teryx записано 7+ конкретных приёмов из live-контента
- [x] Для Patagonia — честно отмечено "частично", без выдумывания приёмов
- [x] Сводная таблица содержит 13 строк с конкретной причиной для каждого решения
- [x] Стоп-лист собран для передачи в Step 4/5
