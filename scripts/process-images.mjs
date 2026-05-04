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
  { suffix: 'card-md', width: 600, crop: { aspect: 3 / 4, position: 'centre' } },
  { suffix: 'card-lg', width: 1200, crop: { aspect: 3 / 4, position: 'centre' } },
  { suffix: 'full-lg', width: 1600, crop: null },
];

try {
  await fs.access(SOURCE_ROOT);
} catch {
  console.error(`assets/ not found at ${SOURCE_ROOT}`);
  console.error('See task_tracker/.../photos-integration/PLAN.md — step_1 explains the layout.');
  process.exit(1);
}

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
      const targetH = Math.round(out.width / out.crop.aspect);
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
