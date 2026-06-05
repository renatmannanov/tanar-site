import { getSiteSettings } from '@/core/site';
import { requireAdmin } from '@/lib/require-admin';
import SettingsForm from '@/components/admin/SettingsForm';
import { updateSiteSettingsAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Настройки сайта</h1>
      <SettingsForm initial={settings} action={updateSiteSettingsAction} />
    </div>
  );
}
