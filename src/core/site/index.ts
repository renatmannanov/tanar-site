// Server-side public API of the site module: DB read + write for editable
// brand settings (singleton) and FAQ items. No node-only deps (no sharp/fs), so
// reads and writes both live here — unlike media, where the writer is split out.
// Client components import types from '@/core/site/client'.
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/core/db';
import {
  EMPTY_SITE_SETTINGS,
  type FaqItem,
  type SiteSettings,
  type SiteSettingsInput,
} from './client';

export type {
  SiteSettings,
  SiteSettingsInput,
  FaqItem,
} from './client';
export { EMPTY_SITE_SETTINGS } from './client';

function mapSettingsRow(
  row: typeof schema.siteSettings.$inferSelect,
): SiteSettings {
  return {
    phone1: row.phone1,
    phone1Name: row.phone1Name,
    phone2: row.phone2,
    phone2Name: row.phone2Name,
    instagram: row.instagram,
    email: row.email,
    city: row.city,
    address: row.address,
    pickupInfo: row.pickupInfo,
    ipName: row.ipName,
    bin: row.bin,
    bankName: row.bankName,
    iban: row.iban,
    whatsapp: row.whatsapp,
  };
}

/**
 * The brand settings singleton (first row). Returns EMPTY_SITE_SETTINGS when no
 * row exists OR the DB is unreachable — so build (no DATABASE_URL) and SSG pages
 * that embed the footer never crash. Mirrors the lazy-db pattern in the project.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await db.select().from(schema.siteSettings).limit(1);
    return rows[0] ? mapSettingsRow(rows[0]) : EMPTY_SITE_SETTINGS;
  } catch {
    return EMPTY_SITE_SETTINGS;
  }
}

/** FAQ items ordered by sortOrder. Returns [] on any DB error (see above). */
export async function listFaqItems(): Promise<FaqItem[]> {
  try {
    const rows = await db
      .select()
      .from(schema.faqItems)
      .orderBy(asc(schema.faqItems.sortOrder), asc(schema.faqItems.createdAt));
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      sortOrder: r.sortOrder,
    }));
  } catch {
    return [];
  }
}

// ── Writes (admin only — callers must requireAdmin first) ───────────────────

/** Upsert the singleton: update the first row, or insert if none exists. */
export async function updateSiteSettings(
  input: SiteSettingsInput,
): Promise<void> {
  const values = { ...input, updatedAt: new Date() };
  const existing = await db
    .select({ id: schema.siteSettings.id })
    .from(schema.siteSettings)
    .limit(1);
  if (existing[0]) {
    await db
      .update(schema.siteSettings)
      .set(values)
      .where(eq(schema.siteSettings.id, existing[0].id));
  } else {
    await db.insert(schema.siteSettings).values(values);
  }
}

export async function createFaqItem(input: {
  question: string;
  answer: string;
  sortOrder?: number;
}): Promise<void> {
  await db.insert(schema.faqItems).values({
    question: input.question,
    answer: input.answer,
    sortOrder: input.sortOrder ?? 0,
  });
}

export async function updateFaqItem(
  id: string,
  input: { question: string; answer: string; sortOrder: number },
): Promise<void> {
  await db
    .update(schema.faqItems)
    .set(input)
    .where(eq(schema.faqItems.id, id));
}

export async function deleteFaqItem(id: string): Promise<void> {
  await db.delete(schema.faqItems).where(eq(schema.faqItems.id, id));
}

/** Count rows — used by the seed to stay idempotent (insert only if empty). */
export async function countSiteSettings(): Promise<number> {
  return db.$count(schema.siteSettings);
}

export async function countFaqItems(): Promise<number> {
  return db.$count(schema.faqItems);
}
