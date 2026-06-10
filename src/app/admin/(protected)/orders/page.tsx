import { listOrders, type OrderStatus } from '@/core/orders';
import { formatPrice } from '@/core/catalog/client';
import { requireAdmin } from '@/lib/require-admin';
import OrderStatusSelect from './OrderStatusSelect';
import DeleteOrderButton from './DeleteOrderButton';

export const dynamic = 'force-dynamic';

// Muted (~30% opacity) status tinting; «Новый» stays plain. Phase 2 ties the
// same transitions to stock: confirmed = reserve, done = write-off,
// cancelled = release reserve — mechanics documented in @/core/orders
// (updateOrderStatus) and ARCHITECTURE-ecommerce.md.
const STATUS_ROW_BG: Record<OrderStatus, string> = {
  pending: '',
  confirmed: 'bg-sky-300/30',
  done: 'bg-emerald-300/30',
  cancelled: 'bg-stone-400/30',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function OrdersAdminPage() {
  await requireAdmin();
  const orders = await listOrders();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-semibold">Заказы</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">Заказов пока нет.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">№</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Состав</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3 w-44">Статус</th>
                <th className="px-4 py-3 w-12" aria-label="Действия" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  data-testid="order-row"
                  data-status={order.status}
                  className={`align-middle ${STATUS_ROW_BG[order.status]}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {order.number}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {order.items.map((item) => (
                      <p key={item.id}>
                        {item.nameSnapshot} — {item.qty} шт
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={order.id} initial={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DeleteOrderButton
                      orderId={order.id}
                      orderNumber={order.number}
                      status={order.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
