import { requireAdmin } from '@/lib/require-admin';
import ProductForm from '@/components/admin/ProductForm';
import { createProductAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Новый товар</h1>
      {/* No `initial` → ProductForm uses EMPTY_INPUT. */}
      <ProductForm mode="create" action={createProductAction} />
    </div>
  );
}
