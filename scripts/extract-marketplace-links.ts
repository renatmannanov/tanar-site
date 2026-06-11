// Extracts per-SKU marketplace links from the owner's CSV into a compact,
// committable JSON snapshot (article -> {ozon, kaspi}). The CSV itself lives
// under internal/ (gitignored — it carries prices/descriptions that must not
// ship in the prod image); only the public URLs end up in the snapshot.
//
// Run locally after the owner updates the table:
//   npx tsx scripts/extract-marketplace-links.ts
// then commit src/core/db/marketplace-links.json and run db:seed-mp-links.
import fs from 'node:fs';
import path from 'node:path';

const CSV_PATH = path.join(
  __dirname,
  '..',
  'internal',
  'content-source',
  'TANAR_links.csv',
);
const OUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'core',
  'db',
  'marketplace-links.json',
);
// Bumped together with the CSV when the catalog grows — a mismatch means the
// table and the snapshot drifted apart, so fail loudly instead of guessing.
const EXPECTED_COUNT = 109;

/**
 * Minimal quote-aware CSV parser. The source has multiline quoted fields
 * (descriptions), so a naive split('\n') breaks rows apart — walk char by
 * char instead, tracking the inQuotes state ("" inside quotes is an escaped ").
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const links: Record<string, { ozon: string; kaspi: string }> = {};

  for (const [index, row] of rows.entries()) {
    // Data rows start with a running integer and a TANAR-NNN article; the
    // header, category dividers (🧥 …) and the ИТОГО footer all fail this.
    const article = (row[1] ?? '').trim();
    if (!/^\d+$/.test((row[0] ?? '').trim()) || !/^TANAR-\d+$/.test(article)) {
      continue;
    }
    const ozon = (row[row.length - 2] ?? '').trim();
    const kaspi = (row[row.length - 1] ?? '').trim();
    if (!ozon.startsWith('https://ozon.kz/')) {
      throw new Error(`row ${index + 1} (${article}): bad Ozon link "${ozon}"`);
    }
    if (!kaspi.startsWith('https://kaspi.kz/')) {
      throw new Error(`row ${index + 1} (${article}): bad Kaspi link "${kaspi}"`);
    }
    if (links[article]) {
      throw new Error(`row ${index + 1}: duplicate article ${article}`);
    }
    links[article] = { ozon, kaspi };
  }

  const count = Object.keys(links).length;
  if (count !== EXPECTED_COUNT) {
    throw new Error(
      `expected ${EXPECTED_COUNT} articles, got ${count} — CSV changed? Update EXPECTED_COUNT together with the CSV.`,
    );
  }

  const sorted = Object.fromEntries(
    Object.entries(links).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(OUT_PATH, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`extract-marketplace-links: ${count} articles -> ${OUT_PATH}`);
}

main();
