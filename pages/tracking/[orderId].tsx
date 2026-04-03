import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface TrackingEvent {
  status: string;
  timestamp: string;
  description: string;
}

interface TrackingData {
  orderNumber: string;
  status: string;
  estimatedDelivery: string;
  currentLocation?: string;
  events: TrackingEvent[];
  courierName?: string;
  courierPhone?: string;
}

export default function TrackingPage() {
  const { user } = useTelegramWebApp();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = window.location.pathname.split('/').pop();
    loadTracking(orderId!);
  }, []);

  const loadTracking = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/tracking`, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setTracking(data.data);
      }
    } catch (err) {
      console.error('Failed to load tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;
  if (!tracking) return <div className="text-center py-8 text-textSecondary">Заказ не найден</div>;

  const statusColors: Record<string, string> = {
    pending: 'bg-warning',
    confirmed: 'bg-info',
    shipped: 'bg-success',
    delivered: 'bg-success',
    cancelled: 'bg-danger'
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Отслеживание заказа</h1>

      {/* Order info */}
      <div className="bg-cardBg rounded-lg border border-border p-4 mb-6">
        <p className="text-textSecondary mb-2">Номер заказа: <span className="text-neon font-bold">{tracking.orderNumber}</span></p>
        <p className="text-textSecondary mb-2">Статус: <span className={`px-3 py-1 rounded text-white ${statusColors[tracking.status]}`}>{tracking.status}</span></p>
        <p className="text-textSecondary">Ожидаемая доставка: <span className="text-textPrimary">{tracking.estimatedDelivery}</span></p>
      </div>

      {/* Timeline */}
      <div className="bg-cardBg rounded-lg border border-border p-4 mb-6">
        <h2 className="text-lg font-bold text-textPrimary mb-4">История статусов</h2>
        <div className="space-y-4">
          {tracking.events.map((event, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-neon" />
                {idx < tracking.events.length - 1 && (
                  <div className="w-0.5 h-12 bg-border" />
                )}
              </div>
              <div>
                <p className="font-semibold text-textPrimary">{event.status}</p>
                <p className="text-textSecondary text-sm">{event.description}</p>
                <p className="text-textSecondary text-xs mt-1">{new Date(event.timestamp).toLocaleString('ru-RU')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Courier info */}
      {tracking.courierName && (
        <div className="bg-cardBg rounded-lg border border-border p-4">
          <h2 className="text-lg font-bold text-textPrimary mb-4">Информация о курьере</h2>
          <p className="text-textSecondary mb-2">Имя: <span className="text-textPrimary">{tracking.courierName}</span></p>
          {tracking.courierPhone && (
            <p className="text-textSecondary">Телефон: <a href={`tel:${tracking.courierPhone}`} className="text-neon hover:underline">{tracking.courierPhone}</a></p>
          )}
        </div>
      )}
    </div>
  );
}
