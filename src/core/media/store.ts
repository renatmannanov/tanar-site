// MediaStore implementation: sharp pipeline → public/images/products/, rows in
// media_assets. SERVER-ONLY (node:fs, node:path, sharp). Import this DIRECTLY
// from server actions as '@/core/media/store' — NOT via index.ts, so its
// node-only deps never reach a client bundle.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import type { MediaAsset, MediaUploadInput, MediaStore } from './types';

// Accepted INPUT formats. HEIC/HEIF is NOT accepted: the prebuilt sharp binary
// on Windows cannot decode HEIC (verified — "heifsave: Unsupported compression").
// The shop owner uploads JPG most of the time anyway.
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // ~10 MB
const MAX_DIMENSION = 2000; // max side, no enlarge
const WIDTHS = [1600, 800, 400] as const; // output webp widths
const PRIMARY_WIDTH = 1600;

const PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), 'public', 'images', 'products');

function mapAssetRow(row: typeof schema.mediaAssets.$inferSelect): MediaAsset {
  return {
    id: row.id,
    scope: row.scope as MediaAsset['scope'],
    url: row.url,
    sortOrder: row.sortOrder,
    productId: row.productId ?? undefined,
    variantId: row.variantId ?? undefined,
    view: (row.view as MediaAsset['view']) ?? undefined,
    model: (row.model as MediaAsset['model']) ?? undefined,
    role: (row.role as MediaAsset['role']) ?? undefined,
    key: row.key ?? undefined,
    alt: row.alt ?? undefined,
  };
}

/** Public URL of a given width, derived by convention from the 1600 url. */
export function urlForWidth(url1600: string, width: number): string {
  return url1600.replace(`-${PRIMARY_WIDTH}.webp`, `-${width}.webp`);
}

async function detectFormat(file: Uint8Array, declaredType?: string): Promise<void> {
  if (declaredType && ACCEPTED_MIME.has(declaredType)) return;
  // Fall back to sharp's own format detection (magic bytes).
  const meta = await sharp(file).metadata();
  const fmt = meta.format; // 'jpeg' | 'png' | 'webp' | 'heif' | ...
  if (fmt === 'jpeg' || fmt === 'png' || fmt === 'webp') return;
  throw new Error(
    `Неподдерживаемый формат изображения: ${fmt ?? declaredType ?? 'неизвестно'}. Разрешены JPG, PNG, WEBP.`,
  );
}

export const mediaStore: MediaStore = {
  async list({ scope, productId }) {
    const conds = [eq(schema.mediaAssets.scope, scope)];
    if (productId) conds.push(eq(schema.mediaAssets.productId, productId));
    const rows = await db
      .select()
      .from(schema.mediaAssets)
      .where(conds.length === 1 ? conds[0] : and(...conds));
    return rows
      .map(mapAssetRow)
      .sort(
        (a, b) =>
          (a.variantId ?? '').localeCompare(b.variantId ?? '') ||
          a.sortOrder - b.sortOrder,
      );
  },

  async upload(file, input: MediaUploadInput) {
    if (file.byteLength > MAX_BYTES) {
      throw new Error(
        `Файл слишком большой (${(file.byteLength / 1024 / 1024).toFixed(1)} МБ). Максимум 10 МБ.`,
      );
    }
    await detectFormat(file);

    const uuid = randomUUID();
    const dir = path.join(PUBLIC_PRODUCTS_DIR, input.slug);
    await fs.mkdir(dir, { recursive: true });

    // rotate() bakes in EXIF orientation; resize caps the longest side at 2000.
    const base = sharp(file)
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });

    for (const w of WIDTHS) {
      const out = await base
        .clone()
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await fs.writeFile(path.join(dir, `${uuid}-${w}.webp`), out);
    }

    const url = `/images/products/${input.slug}/${uuid}-${PRIMARY_WIDTH}.webp`;

    // sortOrder = max(existing for variant) + 1 → append to the end.
    const existing = await db
      .select({ sortOrder: schema.mediaAssets.sortOrder })
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.variantId, input.variantId));
    const nextSort = existing.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;

    const alt = input.alt ?? `Фото ${nextSort + 1}`;
    const role = input.role ?? 'lifestyle';

    // Insert the asset row and (for a flat shot) flip the variant's
    // hasFlatShots flag in ONE transaction — a flat photo and "this color has
    // flats" must never disagree.
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(schema.mediaAssets)
        .values({
          scope: 'product',
          url,
          sortOrder: nextSort,
          productId: input.productId,
          variantId: input.variantId,
          role,
          view: input.view,
          model: input.model,
          alt,
        })
        .returning();

      if (role === 'flat') {
        await tx
          .update(schema.productVariants)
          .set({ hasFlatShots: true })
          .where(eq(schema.productVariants.id, input.variantId));
      }
      return inserted;
    });
    return mapAssetRow(row);
  },

  async get(id) {
    const [row] = await db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.id, id));
    return row ? mapAssetRow(row) : null;
  },

  async readFile(id) {
    const asset = await this.get(id);
    if (!asset) throw new Error('Исходное фото не найдено');
    // url is the public path of the 1600 webp; map it to the file on disk.
    const filePath = path.join(process.cwd(), 'public', asset.url);
    return fs.readFile(filePath);
  },

  async slotTaken(variantId, role, view) {
    const rows = await db
      .select({ id: schema.mediaAssets.id })
      .from(schema.mediaAssets)
      .where(
        and(
          eq(schema.mediaAssets.variantId, variantId),
          eq(schema.mediaAssets.role, role),
          eq(schema.mediaAssets.view, view),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async setRole(id, role) {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.mediaAssets)
        .set({ role, ...(role === 'flat' ? { model: 'flat' } : {}) })
        .where(eq(schema.mediaAssets.id, id))
        .returning();
      // Marking a flat ensures the variant flag is set. (We don't auto-clear it
      // on lifestyle: other flats may still exist for the variant.)
      if (row && role === 'flat' && row.variantId) {
        await tx
          .update(schema.productVariants)
          .set({ hasFlatShots: true })
          .where(eq(schema.productVariants.id, row.variantId));
      }
    });
  },

  async remove(id) {
    const [row] = await db
      .select()
      .from(schema.mediaAssets)
      .where(eq(schema.mediaAssets.id, id));
    if (!row) return; // already gone — idempotent
    // Delete all width variants from disk (best-effort: missing file is fine).
    for (const w of WIDTHS) {
      const fileUrl = urlForWidth(row.url, w);
      const filePath = path.join(process.cwd(), 'public', fileUrl);
      await fs.rm(filePath, { force: true });
    }
    await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  },

  async reorder(items) {
    if (items.length === 0) return;
    await db.transaction(async (tx) => {
      for (const { id, sortOrder } of items) {
        await tx
          .update(schema.mediaAssets)
          .set({ sortOrder })
          .where(eq(schema.mediaAssets.id, id));
      }
    });
  },
};
