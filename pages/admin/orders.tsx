import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface Order {
  id: string;
  user_telegram_id: number;
  status: string;
  total: number;
  delivery_method: string;
  address: string | null;
  delivery_date: string | null;
  promo_code: string | null;
  discount: number;
  manager_note: string | null;
  created_at: string;
  user_name: string | null;
  items?: { name: string; quantity: number; price: number; product_id: string }[];
  history?: { old_status: string; new_status: string; created_at: string; note: string | null }[];
}

const statusFlow = ['new', 'confirmed', 'readyship', 'shipped', 'done'];
const statusLabels: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  readyship: 'Готов к отправке',
  shipped: 'Отправлен',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  confirmed: 'bg-purple-500/20 text-purple-400',
  readyship: 'bg-warning/20 text-warning',
  shipped: 'bg-neon/20 text-neon',
  done: 'bg-success/20 text-success',
  cancelled: 'bg-danger/20 text-danger',
};

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminOrders() {
  const { user } = useTelegramWebApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [managerNote, setManagerNote] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    fetchOrders(status || undefined);
  };

  const fetchOrders = async (status?: string) => {
    let url = '/api/admin/orders';
    if (status) url += `?status=${status}`;
    const res = await fetch(url);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setManagerNote(order.manager_note || '');
  };

  const saveManagerNote = async () => {
    if (!selectedOrder) return;
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedOrder.id, manager_note: managerNote }),
    });
    setSelectedOrder({ ...selectedOrder, manager_note: managerNote });
    fetchOrders();
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: newStatus, telegram_id: user?.id }),
    });
    fetchOrders();
  };

  const exportCsv = () => {
    const headers = ['ID', 'Клиент', 'Дата', 'Сумма', 'Статус', 'Доставка', 'Адрес', 'Промокод', 'Скидка'];
    const rows = orders.map((o) => [
      o.id.slice(0, 8),
      o.user_name || o.user_telegram_id,
      new Date(o.created_at).toLocaleDateString('ru-RU'),
      o.total,
      statusLabels[o.status] || o.status,
      o.delivery_method === 'pickup' ? 'Самовывоз' : 'Курьер',
      o.address || '',
      o.promo_code || '',
      o.discount || 0,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filterStatus ? orders.filter((o) => o.status === filterStatus) : orders;

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Заказы</h1>
          <button
            onClick={exportCsv}
            className="bg-cardBg border border-border rounded-xl px-4 py-2 text-sm text-textSecondary hover:border-neon transition-colors"
          >
            Экспорт CSV
          </button>
        </div>

        {/* Kanban-style status filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!filterStatus ? 'bg-neon text-white' : 'bg-cardBg border border-border text-textSecondary'}`}
          >
            Все ({orders.length})
          </button>
          {statusFlow.map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filterStatus === s ? statusColors[s] : 'bg-cardBg border border-border text-textSecondary'}`}
              >
                {statusLabels[s]} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-20" />
            ))}
          </div>
        ) : (
          <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">ID</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Клиент</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Дата</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Сумма</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Статус</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-bgDark/50">
                    <td className="p-4 text-textPrimary font-mono text-sm">#{order.id.slice(0, 8)}</td>
                    <td className="p-4 text-textPrimary">{order.user_name || order.user_telegram_id}</td>
                    <td className="p-4 text-textSecondary text-sm">{new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                    <td className="p-4 text-neon font-bold">{order.total?.toLocaleString('ru-RU')} ₽</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-border text-textSecondary'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="bg-cardBg border border-border rounded-lg px-2 py-1 text-xs text-textSecondary hover:border-neon transition-colors"
                        >
                          Подробнее
                        </button>
                        {order.status !== 'cancelled' && order.status !== 'done' && (
                          <>
                            {statusFlow.map((s, idx) => {
                              const currentIdx = statusFlow.indexOf(order.status);
                              if (idx === currentIdx + 1) {
                                return (
                                  <button
                                    key={s}
                                    onClick={() => updateStatus(order.id, s)}
                                    className="bg-neon/20 text-neon rounded-lg px-2 py-1 text-xs hover:bg-neon/30 transition-colors"
                                    title={statusLabels[s]}
                                  >
                                    → {statusLabels[s]}
                                  </button>
                                );
                              }
                              return null;
                            })}
                            <button
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              className="bg-danger/20 text-danger rounded-lg px-2 py-1 text-xs hover:bg-danger/30 transition-colors"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
            <div className="bg-cardBg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold gradient-text">Заказ #{selectedOrder.id.slice(0, 8)}</h2>
                  <button onClick={() => setSelectedOrder(null)} className="text-textSecondary hover:text-textPrimary">✕</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-bgDark rounded-xl p-4">
                    <p className="text-textSecondary text-xs mb-1">Клиент</p>
                    <p className="text-textPrimary font-medium">{selectedOrder.user_name || selectedOrder.user_telegram_id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bgDark rounded-xl p-4">
                      <p className="text-textSecondary text-xs mb-1">Дата</p>
                      <p className="text-textPrimary">{new Date(selectedOrder.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div className="bg-bgDark rounded-xl p-4">
                      <p className="text-textSecondary text-xs mb-1">Сумма</p>
                      <p className="text-neon font-bold">{selectedOrder.total?.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>

                  <div className="bg-bgDark rounded-xl p-4">
                    <p className="text-textSecondary text-xs mb-1">Статус</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status] || 'bg-border text-textSecondary'}`}>
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>

                  <div className="bg-bgDark rounded-xl p-4">
                    <p className="text-textSecondary text-xs mb-1">Доставка</p>
                    <p className="text-textPrimary">{selectedOrder.delivery_method === 'pickup' ? 'Самовывоз' : 'Курьер'}</p>
                    {selectedOrder.delivery_method === 'courier' && selectedOrder.address && (
                      <p className="text-textSecondary text-sm mt-1">{selectedOrder.address}</p>
                    )}
                    {selectedOrder.delivery_date && (
                      <p className="text-textSecondary text-sm mt-1">Дата: {new Date(selectedOrder.delivery_date).toLocaleDateString('ru-RU')}</p>
                    )}
                  </div>

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="bg-bgDark rounded-xl p-4">
                      <p className="text-textSecondary text-xs mb-2">Товары</p>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-textPrimary">{item.name} × {item.quantity}</span>
                            <span className="text-neon">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedOrder.discount > 0 && (
                    <div className="bg-bgDark rounded-xl p-4">
                      <p className="text-textSecondary text-xs mb-1">Скидка</p>
                      <p className="text-success">−{selectedOrder.discount.toLocaleString('ru-RU')} ₽</p>
                      {selectedOrder.promo_code && <p className="text-textSecondary text-xs mt-1">Промокод: {selectedOrder.promo_code}</p>}
                    </div>
                  )}

                  <div className="bg-bgDark rounded-xl p-4">
                    <p className="text-textSecondary text-xs mb-2">Заметка менеджера</p>
                    <textarea
                      value={managerNote}
                      onChange={(e) => setManagerNote(e.target.value)}
                      placeholder="Добавить заметку..."
                      rows={3}
                      className="w-full bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
                    />
                    <button
                      onClick={saveManagerNote}
                      className="mt-2 bg-neon text-white rounded-full px-4 py-2 text-sm font-medium ripple"
                    >
                      Сохранить
                    </button>
                  </div>

                  {selectedOrder.history && selectedOrder.history.length > 0 && (
                    <div className="bg-bgDark rounded-xl p-4">
                      <p className="text-textSecondary text-xs mb-2">История изменений</p>
                      <div className="space-y-2">
                        {selectedOrder.history.map((h, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-textSecondary text-xs">{new Date(h.created_at).toLocaleString('ru-RU')}</span>
                            <span className="text-textSecondary">→</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[h.new_status] || 'bg-border text-textSecondary'}`}>
                              {statusLabels[h.new_status] || h.new_status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
