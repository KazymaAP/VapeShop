import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../../lib/frontend/auth';

interface NotificationSetting {
  id: number;
  event_type: string;
  is_enabled: boolean;
  target_role: string;
}

interface Stats {
  total_sent: number;
  total_failed: number;
  success_rate: number;
}

/**
 * Страница управления настройками уведомлений
 *
 * Позволяет админам:
 * - Включать/отключать типы уведомлений
 * - Менять целевую роль для каждого уведомления
 * - Просматривать статистику отправки
 */
export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Карта описаний событий
  const eventDescriptions: Record<string, string> = {
    order_new_admin: 'Новый заказ (админам)',
    order_status_changed_buyer: 'Статус заказа изменился (покупателю)',
    order_ready_ship: 'Заказ готов к отправке (покупателю)',
    abandoned_cart: 'Напоминание о брошенной корзине (покупателю)',
  };

  const eventEmojis: Record<string, string> = {
    order_new_admin: '🆕',
    order_status_changed_buyer: '📦',
    order_ready_ship: '🚀',
    abandoned_cart: '💔',
  };

  // Загруженные настройки
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth('/api/admin/settings/notifications');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSettings(data.settings || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(`Ошибка загрузки: ${String(err)}`);
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Сохранить изменения
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth('/api/admin/settings/notifications', {
        method: 'POST',
        body: JSON.stringify({ updates: settings }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSuccess(`Сохранено ${data.updated} настроек`);

      // Перезагружаем для получения обновлённых данных
      setTimeout(() => loadSettings(), 1000);
    } catch (err) {
      setError(`Ошибка сохранения: ${String(err)}`);
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle включение/отключение
  const toggleEnabled = (id: number) => {
    setSettings(settings.map((s) => (s.id === id ? { ...s, is_enabled: !s.is_enabled } : s)));
  };

  // Изменить роль
  const changeRole = (id: number, newRole: string) => {
    setSettings(settings.map((s) => (s.id === id ? { ...s, target_role: newRole } : s)));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p>Загрузка настроек уведомлений...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neon-cyan mb-2">🔔 Настройки уведомлений</h1>
          <p className="text-gray-400">Управляйте типами и целевыми ролями для уведомлений</p>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-neon-purple">
              <p className="text-gray-400 text-sm">Отправлено</p>
              <p className="text-2xl font-bold text-neon-cyan">{stats.total_sent}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-neon-purple">
              <p className="text-gray-400 text-sm">Ошибок</p>
              <p className="text-2xl font-bold text-red-500">{stats.total_failed}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-neon-purple">
              <p className="text-gray-400 text-sm">Успешность</p>
              <p className="text-2xl font-bold text-neon-green">{stats.success_rate}%</p>
            </div>
          </div>
        )}

        {/* Сообщения об ошибках/успехе */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded text-green-400">
            {success}
          </div>
        )}

        {/* Таблица настроек */}
        <div className="bg-gray-800 rounded-lg border border-neon-purple overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-neon-cyan">Событие</th>
                <th className="px-4 py-3 text-left text-neon-cyan">Статус</th>
                <th className="px-4 py-3 text-left text-neon-cyan">Целевая роль</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  {/* Название события */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{eventEmojis[setting.event_type] || '📌'}</span>
                      <div>
                        <p className="font-semibold text-white">
                          {eventDescriptions[setting.event_type] || setting.event_type}
                        </p>
                        <p className="text-xs text-gray-400">{setting.event_type}</p>
                      </div>
                    </div>
                  </td>

                  {/* Статус включён/отключён */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEnabled(setting.id)}
                      className={`px-3 py-1 rounded font-semibold text-sm transition ${
                        setting.is_enabled
                          ? 'bg-neon-green/20 text-neon-green border border-neon-green'
                          : 'bg-red-500/20 text-red-400 border border-red-500'
                      }`}
                    >
                      {setting.is_enabled ? '✅ Включено' : '❌ Отключено'}
                    </button>
                  </td>

                  {/* Целевая роль */}
                  <td className="px-4 py-3">
                    <select
                      value={setting.target_role}
                      onChange={(e) => changeRole(setting.id, e.target.value)}
                      className="bg-gray-700 text-white rounded px-2 py-1 border border-neon-purple focus:outline-none focus:border-neon-cyan"
                    >
                      <option value="admin">👤 Admin</option>
                      <option value="manager">👨‍💼 Manager</option>
                      <option value="seller">🚚 Seller</option>
                      <option value="buyer">🛍️ Buyer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Кнопка сохранения */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-2 rounded font-semibold transition ${
              saving
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-neon-cyan text-black hover:bg-neon-cyan/80'
            }`}
          >
            {saving ? '💾 Сохранение...' : '💾 Сохранить изменения'}
          </button>
          <button
            onClick={loadSettings}
            disabled={loading}
            className="px-6 py-2 rounded font-semibold border border-neon-purple text-neon-purple hover:bg-neon-purple/10 transition"
          >
            🔄 Перезагрузить
          </button>
        </div>

        {/* Справка */}
        <div className="mt-6 bg-gray-800/50 rounded p-4 border border-neon-purple/50">
          <h3 className="font-semibold text-neon-cyan mb-2">📖 Справка</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>
              • <strong>Включено/Отключено</strong> - уведомления для этого события отправляются или
              нет
            </li>
            <li>
              • <strong>Целевая роль</strong> - кому отправлять уведомления (только если включено)
            </li>
            <li>• Изменения сохраняются автоматически при клике на кнопку</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
