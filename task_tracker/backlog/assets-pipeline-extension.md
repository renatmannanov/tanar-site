# Assets Pipeline Extension

> Тип: рефакторинг + инфраструктура
> Статус: backlog
> Когда брать: перед или вместе с задачей по обложкам блога / story-блоку

## Зачем

Сейчас sharp pipeline (`scripts/process-images.mjs`) обрабатывает только товары. Логотип, hero, lifestyle, обложки блога — всё либо обрабатывается руками через `node -e "import('sharp')..."`, либо вообще не подключено к сайту.

Это терпимо пока ассетов мало (1 hero, 2 PNG лого). Станет проблемой когда:
- надо будет сделать 6+ обложек блога единообразно
- захочется поменять hero под сезон/кампанию
- появятся фотки для story-блока ("Рождены в горах")
- нужно будет регенерировать всё после смены брендовых параметров

## Текущее состояние (на момент записи в бэклог)

```
assets/
├── products/   ✅ pipeline (npm run images)
├── lifestyle/  ❌ 110 файлов, никак не используется
├── logo/       ⚠️ один раз обработано руками (Знак_3.png + Знак_2.png → public/logo/mark.png + mark-light.png)
└── hero/       ⚠️ один файл (Almaty панорама), обработан руками

public/images/
├── products/   ✅ через скрипт
└── home/       ⚠️ один hero.webp, скопирован руками
```

## Что сделать

### 1. Расширить `scripts/process-images.mjs` через конфиг

Завести объект `PIPELINES`, описывающий все типы ассетов:

```js
const PIPELINES = {
  products: {
    source: 'assets/products',
    output: 'public/images/products',
    structure: 'slug/color/model/{view}.jpg',
    outputs: [card-md (3:4, 600w), card-lg (3:4, 1200w), full-lg (orig, 1600w)],
  },
  hero: {
    source: 'assets/hero',
    output: 'public/images/home',
    outputs: [{ name: 'hero', width: 1920, aspect: '16:9', position: 'centre' }],
  },
  blog: {
    source: 'assets/blog',
    output: 'public/images/blog',
    structure: '{post-slug}.jpg',
    outputs: [{ width: 1200, aspect: '16:9' }],
  },
  story: {
    source: 'assets/story',
    output: 'public/images/story',
    outputs: [...],
  },
  logo: {
    source: 'assets/logo/mark',
    output: 'public/logo',
    outputs: [
      { source: 'Знак_3.png', name: 'mark.png', height: 200, trim: true },
      { source: 'Знак_2.png', name: 'mark-light.png', height: 200, trim: true },
    ],
  },
};
```

`npm run images` обрабатывает все, `npm run images -- products` — только products.

### 2. Перенести существующие ручные операции

- Логотип: переписать обработку (`.trim().resize(height: 200)`) в pipeline
- Hero: переписать (`.resize(1920, 1080, { fit: 'cover' })`) в pipeline
- После переноса оригиналы должны жить в `assets/`, и `npm run images` должен пересоздавать `public/` файлы 1-в-1.

### 3. Подготовить пустые папки + .gitkeep

```
assets/blog/.gitkeep
assets/story/.gitkeep
```

Чтобы знать, куда класть.

### 4. Расширить `images:check` под все типы

Сейчас валидирует только наличие товарных webp. Добавить проверки:
- `public/logo/mark.png` и `mark-light.png` существуют
- `public/images/home/hero.webp` существует
- Если в backlog появятся обязательные обложки блога — проверять и их

### 5. Документация

Добавить в `CLAUDE.md` или отдельный `docs/assets.md`:
- Что куда класть в `assets/`
- Какие команды запускать после
- Как добавить новый тип ассета (новая запись в `PIPELINES`)

## Критерии готовности

- [ ] `npm run images` обрабатывает все 5 типов ассетов одной командой
- [ ] `npm run images -- <type>` обрабатывает только указанный тип
- [ ] `npm run images:check` валидирует все ключевые файлы
- [ ] Удаление любого webp из `public/images/` + перезапуск `npm run images` восстанавливает его 1-в-1 из `assets/`
- [ ] Документация для добавления новых типов ассетов
- [ ] Lifestyle-папка либо подключена (если решим использовать), либо явно помечена "будущее"

## Приоритет

Не срочно. Брать когда:
- (a) начинаем работать над блогом (обложки постов) — естественный момент
- (b) появится 3-й случай ручной обработки лого/hero — значит pain накопился
- (c) перед запуском продакшена, чтобы было воспроизводимо

## Связанные планы

- [photos-integration](../done/photos-integration/PLAN.md) — заложил базу под products
