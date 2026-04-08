import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';
import ErrorBoundary from '../../components/ErrorBoundary';

export async function getServerSideProps() {
  return { props: {} };
}

function AdminDashboardContent() {
  const router = useRouter();
  const { user } = useTelegramWebApp();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ role: string } | null>(null);

  const checkAdmin = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/profile?telegram_id=${user?.id}`);
      const data = await res.json();
      setProfile(data);
      if (['admin', 'manager', 'seller'].includes(data.role)) {
        setIsAdmin(true);
        // Fetch stats separately after confirming admin role
        const statsRes = await fetch('/api/admin/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
    setLoading(false);
  }, [user?.id, router]);

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user, checkAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center">
        <p className="text-textSecondary">Проверка доступа...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Дашборд</h1>
          <div className="flex items-center gap-3">
            <select
              value={profile?.role || 'admin'}
              onChange={async (e) => {
                const response = await fetch(`/api/users/role?telegram_id=${user?.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: e.target.value }),
                });
                if (response.ok) {
                  const data = await response.json();
                  setProfile(data);
                }
              }}
              className="bg-cardBg border border-border rounded-full px-4 py-1.5 text-xs text-textPrimary focus:outline-none focus:border-neon"
            >
              <option value="admin">Администратор</option>
              <option value="manager">Менеджер</option>
              <option value="seller">Курьер</option>
            </select>
            <div className="bg-neon/20 border border-neon/40 rounded-full px-4 py-1.5 text-xs text-neon">
              {profile?.role === 'admin'
                ? 'Администратор'
                : profile?.role === 'manager'
                  ? 'Менеджер'
                  : 'Курьер'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-cardBg border border-border rounded-2xl p-5 skeleton h-28"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Выручка (мес)"
                value={`${stats.revenue.toLocaleString('ru-RU')} ₽`}
              />
              <StatCard title="Заказы" value={stats.orders.toString()} />
              <StatCard title="Пользователи" value={stats.users.toString()} />
              <StatCard
                title="Низкий остаток"
                value={stats.lowStock.toString()}
                color="text-warning"
              />
            </div>

            <div className="mt-6 bg-cardBg border border-border rounded-2xl p-4">
              <h3 className="font-semibold text-textPrimary mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => router.push('/admin/products')}
                  className="bg-bgDark border border-border rounded-xl p-3 text-sm text-textSecondary hover:border-neon hover:text-neon transition-colors"
                >
                  📦 Товары
                </button>
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="bg-bgDark border border-border rounded-xl p-3 text-sm text-textSecondary hover:border-neon hover:text-neon transition-colors"
                >
                  📋 Заказы
                </button>
                <button
                  onClick={() => router.push('/admin/import')}
                  className="bg-bgDark border border-border rounded-xl p-3 text-sm text-textSecondary hover:border-neon hover:text-neon transition-colors"
                >
                  📁 Импорт CSV
                </button>
                <button
                  onClick={() => router.push('/admin/users')}
                  className="bg-bgDark border border-border rounded-xl p-3 text-sm text-textSecondary hover:border-neon hover:text-neon transition-colors"
                >
                  👥 Пользователи
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ErrorBoundary>
      <AdminDashboardContent />
    </ErrorBoundary>
  );
}

function StatCard({
  title,
  value,
  color = 'text-neon',
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-cardBg border border-border rounded-2xl p-5 hover:border-neon hover:shadow-neon transition-all hover:-translate-y-0.5">
      <p className="text-xs uppercase tracking-wider text-textSecondary mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
