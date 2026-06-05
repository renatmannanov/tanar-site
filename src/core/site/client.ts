// Client-safe public API of the site module: types ONLY, NO db.
// Import this from 'use client' components (SettingsForm, FaqEditor). Server
// code uses '@/core/site' (index.ts) which adds the DB read/write functions.

export type SiteSettings = {
  phone1: string | null;
  phone2: string | null;
  instagram: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  pickupInfo: string | null;
  ipName: string | null;
  bin: string | null;
  bankName: string | null;
  iban: string | null;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

// The editable fields of site_settings (everything except id/updatedAt).
export type SiteSettingsInput = SiteSettings;

// A blank settings object — returned when the DB has no row yet or is
// unreachable (build without DATABASE_URL). Keeps the footer/contacts rendering
// without crashing; empty fields are simply not shown.
export const EMPTY_SITE_SETTINGS: SiteSettings = {
  phone1: null,
  phone2: null,
  instagram: null,
  email: null,
  city: null,
  address: null,
  pickupInfo: null,
  ipName: null,
  bin: null,
  bankName: null,
  iban: null,
};
