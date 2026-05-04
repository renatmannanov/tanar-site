# Step 3: Sharp pipeline для оптимизации фото

> Статус: pending

## Цель

Написать Node-скрипт, который читает оригиналы из `assets/products/`, делает **два варианта** для каждой фотки:

1. **`card`** — кроп 3:4 для карточки каталога (компактный, всё симметрично, центр-кропом)
2. **`full`** — оригинальная пропорция, только resize (для большого фото на странице товара и миниатюр)

Конвертит в webp, кладёт в `public/images/products/`. Идемпотентный (пропускает уже обработанные). Плюс отдельный валидатор: проверяет, что для каждого варианта в `products.ts` есть файлы на диске.

## Стратегия по кропу

Никаких manifest.json, никакого AI. Простая логика:

- **`card`** — `position: 'centre'`, кроп 3:4. Работает потому что фотограф снимает объект по центру кадра. Если 1-2 кадра промахнутся — пересобираем после ручного добавления `<filename>.json` (но это **опционально**, не реализуем сразу — заведём только если понадобится).
- **`full`** — без кропа, только resize по ширине, пропорция = пропорция исходника

## Действия

### 1. Установить sharp

```bash
npm install --save-dev sharp
```

### 2. Создать `scripts/process-images.mjs`

Логика:
- Принимает корень `assets/products/`
- Сканит структуру `<slug>/<color>/<model>/{1_front,1_side,1_back}.jpg`
- Для каждой фотки делает 3 файла:
  - `<view>-<model>-card-md.webp` — кроп 3:4, ширина 600px
  - `<view>-<model>-card-lg.webp` — кроп 3:4, ширина 1200px
  - `<view>-<model>-full-lg.webp` — без кропа, ширина 1600px (для большого фото на странице товара)
- Конвертит в webp (quality 82, effort 4)
- Кладёт в `public/images/products/<slug>/<color>/`
- Если на диске уже есть файл новее источника — пропускает
- Логирует прогресс: `✓ shell-jacket-khan/white/girl/front [card-md, card-lg, full-lg]`

Скелет:

```js
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SOURCE_ROOT = resolve(REPO_ROOT, 'assets', 'products');
const OUTPUT_ROOT = resolve(REPO_ROOT, 'public', 'images', 'products');

const VIEWS = { '1_front.jpg': 'front', '1_side.jpg': 'side', '1_back.jpg': 'back' };

const OUTPUTS = [
  { suffix: 'card-md', width: 600, crop: { aspect: 3/4, position: 'centre' } },
  { suffix: 'card-lg', width: 1200, crop: { aspect: 3/4, position: 'centre' } },
  { suffix: 'full-lg', width: 1600, crop: null },
];

async function isUpToDate(srcPath, outPath) {
  try {
    const [src, out] = await Promise.all([fs.stat(srcPath), fs.stat(outPath)]);
    return out.mtimeMs >= src.mtimeMs;
  } catch {
    return false;
  }
}

async function processFile(srcPath, slug, color, model, view) {
  const outDir = resolve(OUTPUT_ROOT, slug, color);
  await fs.mkdir(outDir, { recursive: true });
  const done = [];
  for (const out of OUTPUTS) {
    const outPath = resolve(outDir, `${view}-${model}-${out.suffix}.webp`);
    if (await isUpToDate(srcPath, outPath)) continue;
    let pipeline = sharp(srcPath);
    if (out.crop) {
      // resize в нужный размер с кропом до 3:4
      const targetH = Math.round(out.width / out.crop.aspect); // ширина / (3/4) = высота
      pipeline = pipeline.resize(out.width, targetH, { fit: 'cover', position: out.crop.position });
    } else {
      pipeline = pipeline.resize({ width: out.width, withoutEnlargement: true });
    }
    await pipeline.webp({ quality: 82, effort: 4 }).toFile(outPath);
    done.push(out.suffix);
  }
  if (done.length > 0) {
    console.log(`✓ ${slug}/${color}/${model}/${view} [${done.join(', ')}]`);
  }
}

async function walkProducts() {
  const slugs = await fs.readdir(SOURCE_ROOT);
  for (const slug of slugs) {
    const slugPath = resolve(SOURCE_ROOT, slug);
    const stat = await fs.stat(slugPath);
    if (!stat.isDirectory()) continue;
    const colors = await fs.readdir(slugPath);
    for (const color of colors) {
      const colorPath = resolve(slugPath, color);
      if (!(await fs.stat(colorPath)).isDirectory()) continue;
      const models = await fs.readdir(colorPath);
      for (const model of models) {
        const modelPath = resolve(colorPath, model);
        if (!(await fs.stat(modelPath)).isDirectory()) continue;
        const files = await fs.readdir(modelPath);
        for (const file of files) {
          const view = VIEWS[file];
          if (!view) continue;
          await processFile(resolve(modelPath, file), slug, color, model, view);
        }
      }
    }
  }
}

walkProducts().catch((err) => { console.error(err); process.exit(1); });
```

### 3. Создать `scripts/check-images.ts`

**Важно про runtime**: `src/data/products.ts` импортирует `@/lib/product` (path alias из `tsconfig.json`). Голый `tsx` paths не резолвит, поэтому нужен `tsx --tsconfig ./tsconfig.json` + `tsconfig-paths`, **либо** проще — установить `tsx` и завернуть в обёртку через `node --import tsx/esm`. Самый надёжный путь без танцев с tsconfig:

```bash
npm install --save-dev tsx tsconfig-paths
```

Файл `scripts/check-images.ts`:

```ts
import 'tsconfig-paths/register';
import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '@/data/products';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const PRODUCTS_ROOT = resolve(REPO_ROOT, 'public', 'images', 'products');

async function exists(path: string): Promise<boolean> {
  try { await fs.access(path); return true; } catch { return false; }
}

const errors: string[] = [];
const warnings: string[] = [];

for (const product of products) {
  if (!product.variants) continue;
  for (const variant of product.variants) {
    for (const model of variant.models) {
      const base = resolve(PRODUCTS_ROOT, product.slug, variant.id);
      const required = [`front-${model}-card-md.webp`, `front-${model}-full-lg.webp`];
      for (const file of required) {
        if (!(await exists(resolve(base, file)))) {
          errors.push(`${product.slug}/${variant.id}/${file}`);
        }
      }
      for (const view of ['side', 'back']) {
        if (!(await exists(resolve(base, `${view}-${model}-full-lg.webp`)))) {
          warnings.push(`${product.slug}/${variant.id}/${view}-${model}-full-lg.webp (optional)`);
        }
      }
    }
  }
}

if (warnings.length > 0) {
  console.warn('Warnings (optional shots missing):');
  warnings.forEach(w => console.warn('  -', w));
}
if (errors.length > 0) {
  console.error('Missing required images:');
  errors.forEach(e => console.error('  -', e));
  process.exit(1);
}
console.log('✓ all variants have images');
```

### 3.1. Fallback если `@/`-алиас не работает

Если `tsconfig-paths` всё-таки не подхватится (бывает на Windows / с `moduleResolution: bundler`), есть простой запасной вариант — заменить импорт на относительный:

```ts
import { products } from '../src/data/products';
```

И запускать:
```bash
tsx --tsconfig ./tsconfig.json scripts/check-images.ts
```

Если и это падает — последний резерв: парсить `src/data/products.ts` regex'ом по `slug:`, `id:`, `models:` (некрасиво, но 20 строк и работает гарантированно). Этот вариант реализуем **только если** оба способа выше упали.

### 4. Добавить скрипты в `package.json`

```json
{
  "scripts": {
    "images": "node scripts/process-images.mjs",
    "images:check": "tsx scripts/check-images.ts"
  }
}
```

### 4.1. Добавить понятную ошибку в process-images.mjs если нет ассетов

В начало `scripts/process-images.mjs`:

```js
try {
  await fs.access(SOURCE_ROOT);
} catch {
  console.error(`assets/ not found at ${SOURCE_ROOT}`);
  console.error('See task_tracker/done/photos-integration/PLAN.md — step_1 explains the layout.');
  process.exit(1);
}
```

Это спасёт того, кто склонирует репо и запустит `npm run images` без папки ассетов — увидит понятное сообщение, а не stack trace.

### 5. Обновить `.gitignore`

Добавить:
```
# временные файлы для итераций над фотками
/scratch/
```

`public/images/products/` — НЕ игнорим, оптимизированные webp коммитим.

## Что получаем на диске

Для одного цвета одного товара (например, `shell-jacket-khan/darkblue/girl/`):

```
public/images/products/shell-jacket-khan/darkblue/
├── front-girl-card-md.webp    ← 600w, 3:4, ~40KB
├── front-girl-card-lg.webp    ← 1200w, 3:4, ~120KB
├── front-girl-full-lg.webp    ← 1600w, оригинал, ~250KB
├── side-girl-card-md.webp
├── side-girl-card-lg.webp
├── side-girl-full-lg.webp
├── back-girl-card-md.webp
├── back-girl-card-lg.webp
└── back-girl-full-lg.webp
```

Если у цвета сняты м+ж — то же самое × 2 (12 файлов).

## Критерии готовности

- [ ] `sharp`, `tsx`, `tsconfig-paths` установлены в devDependencies
- [ ] `npm run images` — успешно, без ошибок, генерирует webp
- [ ] Для `shell-jacket-khan/darkblue/girl/` (или любого другого) есть все 9 файлов:
  - `front-girl-card-md.webp`, `front-girl-card-lg.webp`, `front-girl-full-lg.webp`
  - `side-girl-*` (3 файла)
  - `back-girl-*` (3 файла)
- [ ] Размер `card-md` < 100 KB
- [ ] Размер `card-lg` < 200 KB
- [ ] Размер `full-lg` < 350 KB
- [ ] Повторный запуск `npm run images` — пропускает обработанные (вывод почти пустой)
- [ ] `npm run images:check` запускается и валидирует

## Verification

```bash
npm run images 2>&1 | tail -30
ls public/images/products/shell-jacket-khan/darkblue/
du -sh public/images/products/
```

## Что НЕ делать

- НЕ заливать sharp в обычные deps (`dependencies`) — только `devDependencies`
- НЕ автоматически вызывать `npm run images` в `prebuild` — это ручная операция, фотки уже закоммичены
- НЕ удалять оригиналы из `assets/` после оптимизации
- НЕ вводить manifest.json для ручного фокуса — оставляем на потом, если 1-2 кадра промахнутся
