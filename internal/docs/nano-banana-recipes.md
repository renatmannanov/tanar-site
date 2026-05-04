# Nano-Banana Recipes — каталожные картинки из lifestyle-кадров

> Дата: 2026-05-04
> Источник: эксперимент в рамках photos-integration plan
> Инструмент: nano-banana MCP (Gemini 2.5 Flash Image)

## Зачем

Фотограф снял продукцию **на людях, в природе** (lifestyle). Для каталога часто нужно второе — **студийная "плоская" фотка на белом фоне**, как у Patagonia/Arc'teryx. Раньше это требовало повторной съёмки в студии. Теперь можно сгенерировать через nano-banana напрямую из lifestyle-кадра, точность пиксель-в-пиксель по куртке.

Дополнительно: один раз сделанную flat-картинку можно **перекрашивать в любой цвет** (если есть hex), сохраняя геометрию. Это идеально для каталога: 4 цвета одной модели, абсолютно одинаковая поза, только цвет ткани разный.

## Главный урок про промпт

**Чем короче и лобовее промпт — тем лучше.** Nano-banana консервативна: если в промпте есть и "поменяй X" и "не меняй ничего", она часто выбирает второе. Длинные оговорки "pixel-faithful, do not change anything else" сбивают её с цели.

**Правило:** одна команда — одна цель. Без ссылок на "оригинал должен быть сохранён".

## Рецепт 1 — Lifestyle → Studio Flat (та же куртка, без человека)

**Использование:** есть кадр человека в куртке на фоне гор → получить ту же куртку на белом фоне в форме "стоит на невидимом манекене".

### 1.a — Front (вид спереди)

```
Remove the person and the mountain background from this photo. Show only the
dark blue technical jacket as a flat product shot, worn by an invisible body
to keep its natural shape and proportions. The jacket has a STRAIGHT, RELAXED,
UNISEX cut — NOT tapered or fitted at the waist. The body of the jacket should
be roughly the same width at the chest, waist and hem. Sleeves hang straight
down. Pure white seamless studio background. Soft even lighting, no harsh
shadows. Keep the exact jacket: identical color, fabric texture, zippers, logo,
seams, cuffs, hood — pixel-faithful. Centered composition.
```

**Что важно:**
- "STRAIGHT, RELAXED, UNISEX cut" — без этой фразы банана делает куртку **зауженной** в талии (даже если оригинал был прямой). Уроки опыта.
- "Pixel-faithful" работает только в контексте сохранения **деталей** (логотип, молния), не геометрии. Для геометрии нужны явные слова "straight", "same width at chest/waist/hem", "sleeves hang straight down".

### 1.b — Side (вид 3/4)

Тот же промпт что для front. Банана сама понимает по входному фото что это side-ракурс.

### 1.c — Back (вид сзади) — **особый промпт**

Если использовать дефолтный промпт, банана **сгенерирует ещё один front**, потому что она видит "куртка" и по умолчанию рисует её спереди. Нужен явный сигнал.

```
This is a BACK VIEW of a dark blue technical jacket. Remove the person and
the mountain background. Show only the jacket from behind as a flat product
shot, worn by an invisible body to keep its natural shape and proportions.
The back of the jacket has NO front zipper, NO chest logo, NO front pockets
visible — only the back panel, the back of the hood, raglan or set-in
shoulder seams, and back yoke if present. Pure white seamless studio
background. Soft even lighting, no harsh shadows. Keep exactly the same dark
blue color, fabric texture, and seam placement as the original photo.
Centered composition. Do NOT generate a front view. Do NOT add any logo or
text on the back.
```

**Ключевое:**
- "BACK VIEW" в начале — заглавными буквами, для акцента
- Явный список **чего НЕ должно быть**: молния, логотип, карманы спереди
- "Do NOT generate a front view" — иначе генерит front
- "Do NOT add any logo or text on the back" — иначе галлюцинирует "BNROCH" / "HRROCK" / случайный лого на спине

## Рецепт 2 — Перекраска (тот же flat в другой цвет)

**Использование:** есть готовый studio-flat в одном цвете, нужно получить тот же flat в другом цвете для **визуально единообразной** галереи 4 цветов одной модели.

```
Change the jacket fabric color to hex #a8332a (deep brick red).
Logo and zippers stay light grey.
```

Всё. Две короткие фразы. Не больше.

**Что НЕ работает:**
- ❌ Длинный промпт `"Recolor this jacket from dark blue to red. Keep absolutely everything else identical: same shape, same pose, same fabric texture..."` — банана **оставляет цвет неизменным** (на 3 ракурсах из 3 в нашем тесте).
- ❌ Передавать референс-картинку через `referenceImages` — банана пытается **взять с неё всё**, не только цвет, и путается.
- ❌ Слова типа "exact", "pixel-faithful", "do not change anything else" — банана читает их как "не меняй ничего вообще".

**Что работает:**
- ✅ Hex кодом конкретно (`#a8332a`)
- ✅ Описание в скобках для контекста (`(deep brick red)`)
- ✅ Одна-две точечных оговорки про не-цвет элементы (`Logo and zippers stay light grey`) — но **минимум**

### Промпт для back с перекраской

Back чувствительнее, нужно явно напомнить что это вид сзади:

```
Change the jacket fabric color to hex #a8332a (deep brick red).
Hood lining and cuffs stay as they are.
```

(Не упоминать про "back view" — она уже есть на входной картинке, и банана не пытается её "перевернуть".)

## Рекомендуемый процесс для каталога одного товара

Для одной куртки в N цветах × 3 ракурса:

1. **Один раз** делаем 3 baseline-flat для одного цвета (например, тёмно-синий — оригинальный кадр девушки):
   - front: рецепт 1.a
   - side: рецепт 1.a (тот же промпт)
   - back: рецепт 1.c (отдельный промпт)
   Проверяем визуально, сохраняем как PNG в `scratch/`.
2. **Для каждого нового цвета** прогоняем рецепт 2 на 3-х baseline-кадрах. Hex берём из `products.ts` (`variant.hex`).
3. Каждый PNG прогоняем через sharp в 3-х размерах (`card-md`, `card-lg`, `full-lg`) с правильным кропом (3:4 для card, original для full).
4. Кладём в `public/images/products/<slug>/<color>/<view>-flat-{md|lg}.webp`.
5. Помечаем `variant.hasFlatShots: true` в `products.ts`.

## Цена

Каждый вызов nano-banana — копейки (центы). Для 4 цветов × 3 ракурса = 9 вызовов после одного baseline (3 ракурса). Итого ~12 запросов на одну модель.

## Ограничения / что не пробовали

- **Сложные принты** (футболка с шелкографией, лого на груди) — не тестировали. Гипотеза: перекраска **фона** ткани сработает, лого останется. Проверить.
- **Трикотаж** (худи, футболка) — не тестировали. Текстура другая, но логика та же.
- **Сложные градиенты цвета** (двухцветные куртки) — не пробовали. Скорее всего не сработает с hex.
- **Текстовые принты** на ткани — нет в товарах.
- **Манжеты/подкладки контрастного цвета** — банана сейчас сохраняет их сама (видела в lifestyle), но если хотим менять отдельно — нужен другой промпт.

## Файлы экспериментов

- `scratch/nano-banana-test/khan-darkblue-front-flat-v2.png` — baseline тёмно-синий (с прямым кроем)
- `scratch/nano-banana-test/khan-darkblue-side-flat.png`
- `scratch/nano-banana-test/khan-darkblue-back-flat.png`
- `scratch/nano-banana-test/khan-red-{front,side,back}-flat.png` — перекраска

## Связанные планы

- [task_tracker/backlog/flat-shots-pipeline.md](../../task_tracker/backlog/flat-shots-pipeline.md) — будущая автоматизация (скилл, прогон по всем товарам, бизнес-модель).
