import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../../lib/telegram';

interface ManagerStats {
  name: string;
  telegramId: string;
  ordersProcessed: number;
  averageTime: number;
  satisfaction: number;
}

export default function ManagerStatsPage() {
  const { user } = useTelegramWebApp();
  const [stats, setStats] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/manager-stats', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Статистика менеджеров</h1>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="p-3 text-left text-textSecondary">Менеджер</th>
              <th className="p-3 text-center text-textSecondary">Заказов</th>
              <th className="p-3 text-center text-textSecondary">Ср. время</th>
              <th className="p-3 text-center text-textSecondary">Оценка</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((manager) => (
              <tr key={manager.telegramId} className="border-b border-border">
                <td className="p-3 text-textPrimary">{manager.name}</td>
                <td className="p-3 text-center text-neon font-bold">{manager.ordersProcessed}</td>
                <td className="p-3 text-center text-textSecondary">{manager.averageTime} мин</td>
                <td className="p-3 text-center">
                  <span className="text-warning">★ {manager.satisfaction.toFixed(1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
