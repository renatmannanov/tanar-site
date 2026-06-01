import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/core/catalog';
import { requireAdmin } from '@/lib/require-admin';
import ProductForm from '@/components/admin/ProductForm';
import { productToInput } from '../../product-mapper';
import { updateProductAction, deleteProductAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const initial = productToInput(product);
  // .bind (NOT an inline arrow): an inline closure would be a fresh client
  // function and would not serialize as a server action reference.
  const boundAction = updateProductAction.bind(null, product.slug);
  const boundDelete = deleteProductAction.bind(null, product.slug);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Редактирование: {product.name}</h1>
      <ProductForm
        mode="edit"
        initial={initial}
        action={boundAction}
        deleteAction={boundDelete}
      />
    </div>
  );
}
