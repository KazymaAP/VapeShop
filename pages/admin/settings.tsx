import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

interface NotificationSetting {
  id: string;
  event_type: string;
  is_enabled: boolean;
  target_role: string | null;
}

export async function getServerSideProps() {
  return { props: {} };
}

const defaultEvents = [
  { event_type: 'order_new', label: 'Новый заказ', role: 'admin' },
  { event_type: 'order_confirmed', label: 'Заказ подтверждён', role: 'buyer' },
  { event_type: 'order_readyship', label: 'Готов к отправке', role: 'buyer' },
  { event_type: 'order_shipped', label: 'Отправлен', role: 'buyer' },
  { event_type: 'order_done', label: 'Выполнен', role: 'buyer' },
  { event_type: 'order_cancelled', label: 'Отменён', role: 'buyer' },
  { event_type: 'low_stock', label: 'Низкий остаток', role: 'admin' },
  { event_type: 'payment_success', label: 'Оплата прошла', role: 'buyer' },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [minStock, setMinStock] = useState(5);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const data = await res.json();
      setSettings(data.settings || []);
      setMinStock(data.min_stock || 5);
    } catch {
      setSettings([]);
    }
    setLoading(false);
  };

  const toggleSetting = async (eventType: string, current: boolean) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, is_enabled: !current }),
      });
      fetchSettings();
    } catch {
      setMessage('Ошибка обновления');
    }
  };

  const saveMinStock = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_stock: minStock }),
      });
      setMessage('Настройки сохранены');
    } catch {
      setMessage('Ошибка сохранения');
    }
    setSaving(false);
  };

  const eventLabels: Record<string, string> = {};
  defaultEvents.forEach((e) => { eventLabels[e.event_type] = e.label; });

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Настройки</h1>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${message.startsWith('Ошибка') ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Notification Settings */}
            <div className="bg-cardBg border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-textPrimary mb-4">Уведомления</h3>
              <div className="space-y-3">
                {defaultEvents.map((event) => {
                  const setting = settings.find((s) => s.event_type === event.event_type);
                  const isEnabled = setting !== undefined ? setting.is_enabled : true;

                  return (
                    <div key={event.event_type} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-textPrimary text-sm font-medium">{event.label}</p>
                        <p className="text-textSecondary text-xs">
                          {event.role === 'buyer' ? 'Покупателю' : event.role === 'admin' ? 'Админу/Менеджеру' : 'Всем'}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleSetting(event.event_type, isEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-neon' : 'bg-border'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : ''}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low Stock Threshold */}
            <div className="bg-cardBg border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-textPrimary mb-4">Остатки товаров</h3>
              <div className="flex items-center gap-4">
                <label className="text-textSecondary text-sm">
                  Минимальный остаток для оповещения:
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="ml-2 w-20 bg-bgDark border border-border rounded-lg px-3 py-1.5 text-sm text-textPrimary focus:outline-none focus:border-neon"
                  />
                </label>
                <button
                  onClick={saveMinStock}
                  disabled={saving}
                  className="bg-neon text-white rounded-full px-4 py-2 text-sm font-medium ripple disabled:opacity-50"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-cardBg border border-danger/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-danger mb-4">Опасная зона</h3>
              <p className="text-textSecondary text-sm mb-4">
                Эти действия необратимы. Будьте осторожны.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (confirm('Очистить все брошенные корзины?')) {
                      fetch('/api/admin/settings', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clear_abandoned_carts' }),
                      }).then(() => setMessage('Брошенные корзины очищены'));
                    }
                  }}
                  className="bg-danger/20 text-danger border border-danger/40 rounded-xl px-4 py-2 text-sm hover:bg-danger/30 transition-colors"
                >
                  Очистить брошенные корзины
                </button>
                <button
                  onClick={() => {
                    if (confirm('Очистить все логи администратора?')) {
                      fetch('/api/admin/settings', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'clear_admin_logs' }),
                      }).then(() => setMessage('Логи очищены'));
                    }
                  }}
                  className="bg-danger/20 text-danger border border-danger/40 rounded-xl px-4 py-2 text-sm hover:bg-danger/30 transition-colors"
                >
                  Очистить логи
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

