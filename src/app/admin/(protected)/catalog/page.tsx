import Link from 'next/link';
import { getAllProducts, CATEGORY_LABELS, formatPrice } from '@/core/catalog';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  published: 'Опубликован',
  archived: 'Архив',
  coming_soon: 'Скоро',
};

export default async function CatalogListPage() {
  await requireAdmin();
  const products = await getAllProducts();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Каталог</h1>
        <Link
          href="/admin/catalog/new"
          className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Создать товар
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">Товаров пока нет.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Название</th>
                <th className="px-4 py-2 font-medium">Категория</th>
                <th className="px-4 py-2 font-medium">Цена</th>
                <th className="px-4 py-2 font-medium">Статус</th>
                <th className="px-4 py-2 font-medium">Цветов</th>
                <th className="px-4 py-2 font-medium">Остаток</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce(
                  (sum, v) => sum + v.skus.reduce((s, sku) => s + sku.stockQty, 0),
                  0,
                );
                return (
                  <tr key={p.slug} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/catalog/${p.slug}/edit`}
                        className="font-medium text-gray-900 underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{CATEGORY_LABELS[p.category]}</td>
                    <td className="px-4 py-2 text-gray-600">{formatPrice(p.price)}</td>
                    <td className="px-4 py-2 text-gray-600">{STATUS_LABELS[p.status] ?? p.status}</td>
                    <td className="px-4 py-2 text-gray-600">{p.variants.length}</td>
                    <td className="px-4 py-2 text-gray-600">{stock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
