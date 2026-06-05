'use server';

import { revalidatePath } from 'next/cache';
import { updateSiteSettings, type SiteSettingsInput } from '@/core/site';
import { requireAdmin } from '@/lib/require-admin';

export async function updateSiteSettingsAction(
  input: SiteSettingsInput,
): Promise<{ error?: string }> {
  await requireAdmin();

  try {
    await updateSiteSettings(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
  }

  // Footer is in the root layout → revalidate the whole layout so every page
  // (incl. /blog, /catalog) picks up new contacts, not just /contacts.
  revalidatePath('/admin/settings');
  revalidatePath('/contacts');
  revalidatePath('/faq');
  revalidatePath('/', 'layout');
  return {};
}
