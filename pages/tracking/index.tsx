'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTelegramWebApp, hapticSuccess, hapticError } from '@/lib/telegram';
import Toast from '@/components/Toast';

interface TrackingEvent {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
}

interface DeliveryInfo {
  courier_id?: number;
  courier_name?: string;
  courier_phone?: string;
  estimated_delivery?: string;
  tracking_number?: string;
}

interface TrackingData {
  order_id: string;
  current_status: string;
  events: TrackingEvent[];
  delivery?: DeliveryInfo;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '⏳ Ожидание оплаты',
  paid: '✅ Оплачено',
  processing: '📦 Обработка',
  ready_to_ship: '🚚 Готово к отправке',
  shipped: '🚀 В пути',
  out_for_delivery: '🚗 Доставляется',
  delivered: '✨ Доставлено',
  cancelled: '❌ Отменено',
  returned: '↩️ Возвращено',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-500',
  paid: 'bg-blue-500',
  processing: 'bg-blue-600',
  ready_to_ship: 'bg-purple-500',
  shipped: 'bg-indigo-500',
  out_for_delivery: 'bg-cyan-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-orange-500',
};

export default function TrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: _user, webapp: _webapp } = useTelegramWebApp();

  const orderId = searchParams?.get('orderId');
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID not specified');
      setLoading(false);
      return;
    }

    loadTracking();
  }, [orderId]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/tracking?orderId=${orderId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load tracking');
      }

      const data = await response.json();
      setTracking(data);
      hapticSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setToast({ message: errorMessage, type: 'error' });
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto mb-4"></div>
          <p className="text-textSecondary">Загрузка информации о доставке...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-textPrimary mb-2">Ошибка</h2>
          <p className="text-textSecondary mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-neon hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center p-4">
        <p className="text-textSecondary">Заказ не найден</p>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[tracking.current_status] || 'bg-gray-500';
  const statusLabel = STATUS_LABELS[tracking.current_status] || tracking.current_status;

  return (
    <div className="min-h-screen bg-bgDark">
      {/* Header */}
      <div className="bg-cardBg border-b border-border p-4">
        <h1 className="text-2xl font-bold text-textPrimary">Отслеживание заказа</h1>
        <p className="text-textSecondary text-sm mt-1">Заказ #{tracking.order_id.slice(0, 8)}</p>
      </div>

      {/* Current Status */}
      <div className="p-4 mx-4 mt-4 bg-cardBg rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-textSecondary text-sm">Текущий статус:</span>
          <div className={`${statusColor} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
            {statusLabel}
          </div>
        </div>

        {/* Estimated Delivery */}
        {tracking.delivery?.estimated_delivery && (
          <div className="pt-4 border-t border-border">
            <p className="text-textSecondary text-sm mb-2">Ожидаемая дата доставки:</p>
            <p className="text-textPrimary font-semibold">
              {formatDate(tracking.delivery.estimated_delivery)}
            </p>
          </div>
        )}
      </div>

      {/* Delivery Info */}
      {tracking.delivery && tracking.delivery.courier_name && (
        <div className="p-4 mx-4 mt-4 bg-cardBg rounded-lg border border-border">
          <h3 className="text-lg font-bold text-textPrimary mb-4">🚚 Информация о доставке</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-textSecondary">Курьер:</span>
              <span className="text-textPrimary font-semibold">
                {tracking.delivery.courier_name}
              </span>
            </div>

            {tracking.delivery.courier_phone && (
              <div className="flex justify-between items-start">
                <span className="text-textSecondary">Телефон:</span>
                <a
                  href={`tel:${tracking.delivery.courier_phone}`}
                  className="text-neon font-semibold hover:underline"
                >
                  {tracking.delivery.courier_phone}
                </a>
              </div>
            )}

            {tracking.delivery.tracking_number && (
              <div className="flex justify-between items-start">
                <span className="text-textSecondary">Номер доставки:</span>
                <span className="text-textPrimary font-semibold font-mono">
                  {tracking.delivery.tracking_number}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4 mx-4 mt-4">
        <h3 className="text-lg font-bold text-textPrimary mb-4">📅 История изменений</h3>

        <div className="relative">
          {tracking.events.map((event, index) => (
            <div key={index} className="mb-6 relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-0 top-2 w-4 h-4 bg-neon rounded-full"></div>

              {/* Timeline line */}
              {index < tracking.events.length - 1 && (
                <div className="absolute left-1.5 top-6 w-0.5 h-12 bg-border"></div>
              )}

              {/* Event card */}
              <div className="bg-cardBg rounded-lg border border-border p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-textPrimary">
                    {STATUS_LABELS[event.status] || event.status}
                  </p>
                  <span className="text-textSecondary text-xs">{formatDate(event.timestamp)}</span>
                </div>

                {event.description && (
                  <p className="text-textSecondary text-sm">{event.description}</p>
                )}

                {event.location && (
                  <p className="text-textSecondary text-xs mt-2">📍 {event.location}</p>
                )}
              </div>
            </div>
          ))}

          {tracking.events.length === 0 && (
            <div className="text-center py-8">
              <p className="text-textSecondary">История событий пуста</p>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="p-4 mx-4 mb-4 mt-4">
        <button
          onClick={loadTracking}
          className="w-full bg-neon hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition"
        >
          🔄 Обновить статус
        </button>
      </div>

      {/* Back Button */}
      <div className="p-4 mx-4 mb-6">
        <button
          onClick={() => router.push('/orders')}
          className="w-full bg-cardBg hover:bg-gray-700 text-textPrimary font-semibold py-3 px-4 rounded-lg border border-border transition"
        >
          ← Вернуться к заказам
        </button>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
