import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '@/lib/telegram';
import { TextSkeleton } from '../../components/SkeletonLoader';
import { _TIMERS as TIMERS } from '@/lib/constants';

interface AlertItem {
  name: string;
  stock: number;
}

interface Alert {
  type: string;
  count: number;
  message: string;
  items?: AlertItem[];
}

export default function AlertsPage() {
  const { user } = useTelegramWebApp();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await fetch('/api/admin/alerts', {
          headers: { 'X-Telegram-Id': user?.id.toString() || '' },
        });
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.data || []);
        } else {
          const errorMsg = `Failed to load alerts: HTTP ${response.status} ${response.statusText}`;
          console.error(errorMsg);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? `Failed to load alerts: ${err.message}`
            : 'Failed to load alerts: Unknown error';
        console.error(errorMsg, err);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, TIMERS.POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (loading) return <TextSkeleton lines={5} />;

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
                  {alert.items.map((item, i: number) => (
                    <li key={i}>
                      • {item.name} ({item.stock} шт)
                    </li>
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
