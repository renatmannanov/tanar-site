# Photos Integration — tanar-site

> Статус: pending
> Дата: 2026-05-04
> Тип: фича (замена градиентов на реальные фотки + варианты цветов)

## Цель

Заменить плейсхолдер-градиенты в каталоге на реальные фотографии продукции, добавить поддержку вариантов цвета (color variants) с переключением фото на странице товара. Перестроить категории под реальный ассортимент. Заменить шапку на лого-знак + "TANAR".

## Что меняется (концептуально)

**Каталог:**
- Категории: было `jackets / backpacks / accessories / t-shirts` → стало `jackets / hoodies / t-shirts / pants / shorts`
- Backpacks и accessories удаляются (нет фоток, нет товара)
- Hoodies — новая категория
- Pants и shorts — новые категории, пока только заглушки с бейджем "Скоро"

**Реальные товары (15 фото-папок → 5 моделей):**
- **Куртка Хан Шелл** (`shell-jacket-khan`, jackets) — 4 цвета: white, darkblue, red, yellow
- **Парка Тенгри** (`light-jacket-tengri`, jackets) — 2 цвета: orange, white
- **Худи Алатау** (`hoodie-alatau`, hoodies) — 3 цвета: green, darkgrey, lightgrey
- **Худи Турген** (`hoodie-turgen`, hoodies) — 2 цвета: lightpink, red
- **Футболка Танар** (`tshirt-tanar`, t-shirts) — 2 цвета: blue, pink

**Заглушки "Скоро" (5 товаров):**
- 3 штанов + 2 шорт — переиспользуем тексты/градиенты от удалённых рюкзаков и аксессуаров

**Лого:**
- Шапка: знак-гора + текст "TANAR" (без сабтайтла, без текущего "M Tanar Born to rise")
- Источник: `Downloads/tanar_logo/TANAR/01 - Логотип/03 - Знак/PNG (водяной знак)/`

## Шаги

| # | Файл | Статус |
|---|------|--------|
| 1 | [step_1_assets_copy.md](step_1_assets_copy.md) | [x] |
| 2 | [step_2_data_model.md](step_2_data_model.md) | [ ] |
| 3 | [step_3_image_pipeline.md](step_3_image_pipeline.md) | [ ] |
| 4 | [step_4_products_data.md](step_4_products_data.md) | [ ] |
| 5 | [step_5_logo_header.md](step_5_logo_header.md) | [ ] |
| 6 | [step_6_catalog_card.md](step_6_catalog_card.md) | [ ] |
| 6.5 | [step_6_5_e2e_update.md](step_6_5_e2e_update.md) | [ ] |
| 7 | [step_7_product_page.md](step_7_product_page.md) | [ ] |
| 8 | [step_8_completion.md](step_8_completion.md) | [ ] |

## Критерии готовности (весь план)

- [ ] `npm run build` — exit 0
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run lint` — exit 0
- [ ] `npm run test:e2e` — все Playwright smoke-тесты проходят
- [ ] `npm run images` — успешно генерирует все варианты картинок в `public/images/products/`
- [ ] Все страницы рендерятся без console errors: `/`, `/catalog`, `/catalog/[slug]`
- [ ] В каталоге 12 товаров: 7 реальных (с фотками) + 5 заглушек "Скоро"
- [ ] Фильтр по категориям работает для новых категорий: `jackets / hoodies / t-shirts / pants / shorts`
- [ ] Карточка реального товара показывает фото (а не градиент) и точки доступных цветов
- [ ] Карточка-заглушка (pants/shorts) показывает градиент + бейдж "Скоро"
- [ ] На странице реального товара переключатель цветов меняет галерею (большое фото + миниатюры)
- [ ] URL страницы товара поддерживает `?color=darkblue` (открывается с правильным цветом)
- [ ] Шапка содержит знак-гору + текст "TANAR" (без сабтайтла)
- [ ] Папка плана перемещена из `todo/` в `done/`

## Архитектурные решения (важно для Ralph)

**1. Хранение картинок:**
- Исходники: `<repo>/assets/products/<slug>/<color>/<model>/{1_front,1_side,1_back}.jpg` (внутри репо, но в `.gitignore`)
- `<model>` = `man` или `girl` (фотограф снимал каждый цвет на одном или обоих типажах)
- Оптимизированные: `public/images/products/<slug>/<color>/<view>-<model>-{card-md,card-lg,full-lg}.webp` (коммитим в git)

**2. Два варианта на каждую фотку:**
- **`card`** (3:4 кроп, центр) — для карточки в каталоге и блоке "Избранное" на главной. Размеры `md` 600w, `lg` 1200w
- **`full`** (оригинальная пропорция, без кропа) — для большого фото на странице товара и миниатюр под ним. Размер `lg` 1600w

**3. Связь данных и картинок:**
- `products.ts` хранит метаданные: `variants: [{id, label, hex, models: ['man'|'girl']}]`, `comingSoon`, etc.
- Хелпер `getProductCardImage(slug, color, model)` → возвращает `{md, lg}` для карточки каталога
- Хелпер `getProductGalleryShots(product, color)` → возвращает массив `{view, model, src, alt}` для галереи (3 ракурса × все типажи в `models`)

**4. UI выбора цвета:**
- Каталог: статичные точки цветов под ценой, без интерактива (просто индикатор)
- Страница товара: свотчи 32px между ценой и описанием с подписью "Цвет: X", тык меняет галерею + URL `?color=X`
- Никакого hover'а нигде

**5. Пропорции и слоты:**
- Карточка в каталоге / "Избранное" — `aspect-[3/4]`, фото = `card-md.webp`, `object-cover`
- Большое фото на странице товара — `aspect-[2/3]` (или то, что у фотографа в оригинале — корректируем после первого `npm run images`), фото = `full-lg.webp`, `object-cover` (но не должно ничего обрезать, т.к. слот = пропорция файла)
- Миниатюры под большим фото — та же пропорция что у большого, **тот же файл `full-lg.webp`** (не отдельный кроп). На десктопе grid из 3-6, на мобайле — горизонтальный скролл

**6. Sharp pipeline:**
- Скрипт `scripts/process-images.mjs`
- Сканит `assets/products/`, для каждого `<slug>/<color>/<model>/`:
  - читает `1_front.jpg`, `1_side.jpg`, `1_back.jpg`
  - делает 3 файла: `<view>-<model>-card-md.webp` (3:4, 600w), `<view>-<model>-card-lg.webp` (3:4, 1200w), `<view>-<model>-full-lg.webp` (оригинал, 1600w)
  - конвертит в webp (quality 82)
  - кладёт в `public/images/products/<slug>/<color>/`
- Идемпотентен: пропускает уже обработанные (по mtime)
- Кроп для `card` — `position: 'centre'`, без manifest.json (если 1-2 кадра промахнутся — ручная правка через manifest появится отдельным улучшением)
- Скрипт `npm run images:check` (на `tsx`) валидирует, что для каждого варианта в `products.ts` есть `front-<model>-card-md.webp` и `front-<model>-full-lg.webp`

**7. Источник правды для ассетов:**
- После step_1 единственный источник правды для фоток и лого — `<repo>/assets/`
- `c:/Users/renat/Downloads/tanar_photo` и `tanar_logo` больше не используем
- Если фотограф пришлёт новые версии — кладём сразу в `assets/`, не в `Downloads/`
- Это упоминается в README или в самом скрипте `process-images.mjs` через понятную ошибку

**8. Что попадает в git:**
- ✅ Коммитим `public/images/products/*.webp` — оптимизированные финальные файлы (оценка ~30-50 MB при текущем каталоге, приемлемо для GitHub)
- ❌ НЕ коммитим оригиналы из `assets/` — папка лежит внутри проекта, но в `.gitignore` (см. `.gitignore` строка `/assets/`)
- Сознательное решение: иметь возможность собрать сайт без `assets/` (важно для деплоя на Railway, для других людей с репо)
- Если репо начнёт пухнуть >500 MB — пересмотреть и переехать на CDN (Cloudinary), но не сейчас

## Контекст для Ralph

- Проект: `c:/Users/renat/projects/tanar-site/`
- Ассеты-источники: `c:/Users/renat/Downloads/tanar_photo/Айман спорт/` (оригиналы фото) и `c:/Users/renat/Downloads/tanar_logo/TANAR/` (лого)
- Целевая папка ассетов: `<repo>/assets/` (внутри проекта, но в `.gitignore`)
- Текущая ветка: `dev`
- Коммиты: Conventional Commits на английском (`feat:`, `chore:`, `fix:`, `refactor:`)
- **НЕ делать push** — только локальные коммиты
- **Главная страница** в этом плане НЕ трогается — hero и story остаются на градиентах, лайфстайл-фотки из `others/` подключим отдельным раундом
- **Блог** в этом плане НЕ трогается — обложки остаются на градиентах
