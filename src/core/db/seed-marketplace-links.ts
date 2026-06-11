import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db, queryClient } from './client';
import { skus } from './schema';

// Seeds per-SKU marketplace links from the committed snapshot (produced by
// scripts/extract-marketplace-links.ts out of the owner's gitignored CSV).
//
// IDEMPOTENT and prod-safe (no ALLOW_PROD_SEED): it touches NOTHING but
// skus.marketplaces, keyed by the unique TANAR article. A repeat run rewrites
// the same values. Articles present in the snapshot but missing in the DB are
// reported, not fatal — useful when the catalog and the table drift apart.
//
// Direct db access is fine here: the script lives in src/core/db (seed layer).

async function main() {
  const snapshotPath = path.join(__dirname, 'marketplace-links.json');
  const links: Record<string, { ozon: string; kaspi: string }> = JSON.parse(
    fs.readFileSync(snapshotPath, 'utf8'),
  );

  let updated = 0;
  const notFound: string[] = [];
  await db.transaction(async (tx) => {
    for (const [article, marketplaces] of Object.entries(links)) {
      const rows = await tx
        .update(skus)
        .set({ marketplaces, updatedAt: new Date() })
        .where(eq(skus.article, article))
        .returning({ id: skus.id });
      if (rows.length === 0) notFound.push(article);
      else updated += rows.length;
    }
  });

  console.log(
    `seed-marketplace-links: updated ${updated}, not found in DB: [${notFound.join(', ')}]`,
  );
  await queryClient.end();
}

main();
