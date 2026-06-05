import { queryClient } from './client';
import {
  countSiteSettings,
  countFaqItems,
  updateSiteSettings,
  createFaqItem,
} from '@/core/site';
import { SITE_CONTACTS } from '@/lib/site-contacts';
import { FAQ_ITEMS } from '@/lib/faq';

// Seeds ONLY editable site content (site_settings + faq_items) from the
// iteration-1 constants. Separate from seed.ts on purpose:
//
//   seed.ts TRUNCATEs + re-imports the catalog and is blocked on prod by the
//   count(products)>0 guard. On prod the catalog is already seeded, so that
//   guard would also block the site/faq insert living inside seed.ts. This
//   script touches NEITHER the catalog nor any TRUNCATE — it only inserts the
//   two content tables when they are empty.
//
// IDEMPOTENT: inserts each table only if empty, so a repeat run never
// overwrites edits the owner made through the admin. Safe to run on prod
// (no ALLOW_PROD_SEED needed — it can't destroy catalog data).

async function main() {
  if ((await countSiteSettings()) === 0) {
    const c = SITE_CONTACTS;
    await updateSiteSettings({
      phone1: c.phones[0]?.value ?? null,
      phone1Name: c.phones[0]?.label ?? null,
      phone2: c.phones[1]?.value ?? null,
      phone2Name: c.phones[1]?.label ?? null,
      instagram: c.instagram.url,
      email: null, // owner adds later; empty → not shown on storefront
      city: c.city,
      address: c.address,
      pickupInfo: c.pickup,
      ipName: c.legal.ipName,
      bin: c.legal.bin,
      bankName: null, // IBAN/bank not published until Phase 3
      iban: null,
    });
    console.log('seed-site: site_settings inserted');
  } else {
    console.log('seed-site: site_settings already present — skipped');
  }

  if ((await countFaqItems()) === 0) {
    let order = 0;
    for (const item of FAQ_ITEMS) {
      await createFaqItem({
        question: item.question,
        answer: item.answer,
        sortOrder: order++,
      });
    }
    console.log(`seed-site: ${FAQ_ITEMS.length} faq_items inserted`);
  } else {
    console.log('seed-site: faq_items already present — skipped');
  }

  await queryClient.end();
}

main();
