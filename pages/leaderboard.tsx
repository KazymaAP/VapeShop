import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../lib/telegram';
import { TextSkeleton } from '../components/SkeletonLoader';

interface LeaderboardEntry {
  id: string;
  first_name: string;
  last_name?: string;
  level: number;
  experience: number;
  orders_count: number;
  total_spent: number;
}

export default function LeaderboardPage() {
  const { user: _user } = useTelegramWebApp();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/gamification/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setEntries(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TextSkeleton lines={8} />;

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-400';
    return 'text-textSecondary';
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Лидерборд</h1>

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className="bg-cardBg rounded-lg border border-border p-4 flex items-center gap-4"
          >
            <div className={`text-3xl font-bold w-12 text-center ${getRankColor(idx + 1)}`}>
              {idx + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold text-textPrimary">
                {entry.first_name} {entry.last_name || ''}
              </p>
              <p className="text-textSecondary text-sm">
                Уровень {entry.level} • Заказов: {entry.orders_count}
              </p>
            </div>
            <div className="text-right">
              <p className="text-neon font-bold">⭐ {entry.level}</p>
              <p className="text-textSecondary text-sm">{entry.total_spent.toLocaleString()} ₽</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
