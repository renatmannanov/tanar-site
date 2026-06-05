import { sql } from 'drizzle-orm';
import { db, queryClient } from './client';

// Guard: never run against anything but the local dev/test databases.
const url = process.env.DATABASE_URL ?? '';
if (!/tanar_dev|tanar_test/.test(url)) {
  throw new Error(
    `DATABASE_URL must point to tanar_dev or tanar_test for seed/reset; got: ${url}`,
  );
}

async function main() {
  await db.execute(
    sql`TRUNCATE products, product_variants, skus, media_assets, orders, order_items, inventory_log, site_settings, faq_items CASCADE`,
  );
  console.log('reset OK: all tables truncated');
  await queryClient.end();
}

main();
