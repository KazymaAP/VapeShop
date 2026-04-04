import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface Alert {
  type: string;
  count: number;
  message: string;
  items?: any[];
}

export default function AlertsPage() {
  const { user } = useTelegramWebApp();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/admin/alerts', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'pending_orders':
        return 'bg-warning';
      case 'low_stock':
        return 'bg-danger';
      default:
        return 'bg-info';
    }
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Критические события</h1>

      {alerts.length === 0 ? (
        <div className="text-center py-12 text-textSecondary">
          <p>✓ Нет критических событий</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`${getAlertColor(alert.type)} rounded-lg p-4 text-white`}>
              <p className="font-bold text-lg">{alert.message}</p>
              {alert.items && (
                <ul className="mt-2 text-sm opacity-90">
                  {alert.items.map((item: any, i: number) => (
                    <li key={i}>• {item.name} ({item.stock} шт)</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
