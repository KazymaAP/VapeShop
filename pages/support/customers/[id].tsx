import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../../lib/telegram';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function CustomerProfilePage() {
  const { user } = useTelegramWebApp();
  const [customer, setCustomer] = useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const customerId = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '';

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const response = await fetch(`/api/support/customers/${customerId}`, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load customer:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;
  if (!customer) return <div className="text-center py-8 text-textSecondary">Клиент не найден</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Профиль клиента</h1>

      {/* Customer info */}
      <div className="bg-cardBg rounded-lg border border-border p-6 mb-6">
        <h2 className="font-bold text-textPrimary mb-4">
          {customer.first_name} {customer.last_name || ''}
        </h2>
        <div className="space-y-2 text-sm">
          <p className="text-textSecondary">
            Telegram ID: <span className="text-textPrimary">{customer.telegram_id}</span>
          </p>
          {customer.phone && (
            <p className="text-textSecondary">
              Телефон: <span className="text-textPrimary">{customer.phone}</span>
            </p>
          )}
          {customer.username && (
            <p className="text-textSecondary">
              Username: <span className="text-textPrimary">@{customer.username}</span>
            </p>
          )}
          <p className="text-textSecondary">
            Зарегистрирован:{' '}
            <span className="text-textPrimary">
              {new Date(customer.created_at).toLocaleDateString('ru-RU')}
            </span>
          </p>
        </div>
      </div>

      {/* Orders */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-textPrimary mb-4">
          История заказов ({orders.length})
        </h3>
        {orders.length === 0 ? (
          <p className="text-textSecondary">Нет заказов</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="bg-cardBg rounded-lg border border-border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-textPrimary">№{order.orderNumber}</p>
                    <p className="text-textSecondary text-sm">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neon">{order.total} ₽</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        order.status === 'completed' ? 'bg-success' : 'bg-warning'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <a
          href={`/support/tickets?customerId=${customerId}`}
          className="block w-full text-center px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
        >
          Создать обращение
        </a>
      </div>
    </div>
  );
}
