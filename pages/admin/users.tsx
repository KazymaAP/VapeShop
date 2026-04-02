import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

interface User {
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  role: string;
  is_blocked: boolean;
  orders_count: number;
  created_at: string;
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminUsers() {
  const { user } = useTelegramWebApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch(`/api/admin/users?search=${search}`);
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const toggleBlock = async (telegramId: number, current: boolean) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, is_blocked: !current }),
    });
    fetchUsers();
  };

  const changeRole = async (telegramId: number, role: string) => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, role }),
    });
    fetchUsers();
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Пользователи</h1>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или username..."
            className="w-full md:w-80 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16" />
            ))}
          </div>
        ) : (
          <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">ID</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Имя</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Роль</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Заказов</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Статус</th>
                  <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.telegram_id} className="border-b border-border/50 hover:bg-bgDark/50">
                    <td className="p-4 text-textSecondary font-mono text-sm">{u.telegram_id}</td>
                    <td className="p-4">
                      <p className="text-textPrimary font-medium">{u.first_name} {u.last_name || ''}</p>
                      {u.username && <p className="text-textSecondary text-xs">@{u.username}</p>}
                    </td>
                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.telegram_id, e.target.value)}
                        className="bg-bgDark border border-border rounded-lg px-2 py-1 text-xs text-textPrimary focus:outline-none focus:border-neon"
                      >
                        <option value="buyer">Покупатель</option>
                        <option value="manager">Менеджер</option>
                        <option value="seller">Курьер</option>
                        <option value="admin">Админ</option>
                      </select>
                    </td>
                    <td className="p-4 text-textPrimary">{u.orders_count}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.is_blocked ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                        {u.is_blocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleBlock(u.telegram_id, u.is_blocked)}
                        className="text-textSecondary hover:text-danger transition-colors"
                      >
                        {u.is_blocked ? '🔓' : '🔒'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
