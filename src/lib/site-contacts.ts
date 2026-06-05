// Single source of truth for brand contact data (iteration 1: in-code constant).
// Footer (step 5), /contacts (step 3) and the DB seed (iteration 2) all read
// from here. Client-safe: a plain object, no server-only imports.
//
// PII note: phones, Instagram, address and legal данные (ИП/БИН) are published
// at the owner's explicit request (decision logged in the plan, 2026-06-05).
// IBAN/bank are intentionally NOT included here — they ship only in Phase 3.

export type SiteContacts = {
  phones: ReadonlyArray<{ label: string; value: string; tel: string }>;
  instagram: { handle: string; url: string };
  city: string;
  address: string;
  pickup: string;
  legal: { ipName: string; bin: string };
};

export const SITE_CONTACTS: SiteContacts = {
  phones: [
    { label: 'Айман', value: '+7 701 744 38 73', tel: '+77017443873' },
    { label: 'Милена', value: '+7 707 722 05 06', tel: '+77077220506' },
  ],
  instagram: {
    handle: '@tanar_qazaqstan',
    url: 'https://instagram.com/tanar_qazaqstan',
  },
  city: 'Алматы',
  address: 'ул. Розыбакиева, 205Д',
  pickup: 'ул. Розыбакиева, 205Д (маршрут уточняйте по телефону)',
  legal: {
    ipName: 'ИП СУЛТАНГАЛИЕВА',
    bin: '770807401605',
  },
};
