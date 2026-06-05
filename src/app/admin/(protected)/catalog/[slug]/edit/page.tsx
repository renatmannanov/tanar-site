import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/core/catalog';
import { listProductImages } from '@/core/media';
import { requireAdmin } from '@/lib/require-admin';
import ProductForm, { type VariantMedia } from '@/components/admin/ProductForm';
import { productToInput } from '../../product-mapper';
import { updateProductAction, deleteProductAction } from '../../actions';
import {
  uploadVariantImageAction,
  removeVariantImageAction,
  reorderVariantImagesAction,
  setVariantImageRoleAction,
  generateFlatAction,
  recolorFlatAction,
  recolorLifestyleAction,
  approveGeneratedAction,
} from '../../media-actions';

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

  // Load this product's images (one query), group them per variant keyed by
  // colorId — the stable key the form's variants carry.
  const images = await listProductImages(product.id);
  const imagesByVariantId = new Map<string, typeof images>();
  for (const img of images) {
    if (!img.variantId) continue;
    const list = imagesByVariantId.get(img.variantId) ?? [];
    list.push(img);
    imagesByVariantId.set(img.variantId, list);
  }
  const variantMedia: Record<string, VariantMedia> = {};
  for (const v of product.variants) {
    variantMedia[v.id] = {
      variantId: v.variantId,
      images: imagesByVariantId.get(v.variantId) ?? [],
    };
  }

  const mediaActions = {
    upload: uploadVariantImageAction,
    remove: removeVariantImageAction,
    reorder: reorderVariantImagesAction,
    setRole: setVariantImageRoleAction,
    generateFlat: generateFlatAction,
    recolorFlat: recolorFlatAction,
    recolorLifestyle: recolorLifestyleAction,
    approveGenerated: approveGeneratedAction,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Редактирование: {product.name}</h1>
      <ProductForm
        mode="edit"
        initial={initial}
        action={boundAction}
        deleteAction={boundDelete}
        productId={product.id}
        variantMedia={variantMedia}
        mediaActions={mediaActions}
      />
    </div>
  );
}
