import { listFaqItems } from '@/core/site';
import { requireAdmin } from '@/lib/require-admin';
import FaqEditor from '@/components/admin/FaqEditor';
import {
  createFaqItemAction,
  updateFaqItemAction,
  deleteFaqItemAction,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function FaqAdminPage() {
  await requireAdmin();
  const items = await listFaqItems();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">FAQ</h1>
      <FaqEditor
        initial={items}
        actions={{
          create: createFaqItemAction,
          update: updateFaqItemAction,
          remove: deleteFaqItemAction,
        }}
      />
    </div>
  );
}
