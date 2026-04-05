import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface Delivery {
  id: string;
  orderNumber: string;
  address: string;
  contactName: string;
  contactPhone: string;
  itemCount: number;
  status: string;
  createdAt: string;
}

export default function CourierDeliveriesPage() {
  const { user } = useTelegramWebApp();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const response = await fetch('/api/courier/deliveries', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Мои доставки</h1>

      {deliveries.length === 0 ? (
        <div className="text-center py-12 text-textSecondary">
          <p>Нет активных доставок</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="bg-cardBg rounded-lg border border-border p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-neon">Заказ #{delivery.orderNumber}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    delivery.status === 'pending' ? 'bg-warning' : 'bg-success'
                  } text-white`}
                >
                  {delivery.status === 'pending' ? 'В пути' : 'Доставлен'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-textSecondary">
                  <span className="text-textPrimary">Адрес:</span> {delivery.address}
                </p>
                <p className="text-textSecondary">
                  <span className="text-textPrimary">Контакт:</span> {delivery.contactName}
                </p>
                <p className="text-textSecondary">
                  <span className="text-textPrimary">Телефон:</span>{' '}
                  <a href={`tel:${delivery.contactPhone}`} className="text-neon hover:underline">
                    {delivery.contactPhone}
                  </a>
                </p>
                <p className="text-textSecondary">
                  <span className="text-textPrimary">Товаров:</span> {delivery.itemCount}
                </p>
              </div>

              <a
                href={`/courier/deliveries/${delivery.id}/complete`}
                className="block w-full text-center px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
              >
                Отметить как доставлено
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
