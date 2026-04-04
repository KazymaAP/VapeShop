import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useTelegramWebApp } from '../../../lib/telegram';

export default function SuperAdminDashboard() {
  const { user } = useTelegramWebApp();
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Получить последние логи
      const logsRes = await fetch('/api/admin/audit-logs?page=1&limit=5');
      if (!logsRes.ok) {
        throw new Error(`API Error: ${logsRes.status}`);
      }
      const logsData = await logsRes.json();
      setLogs(logsData.data);
      setStats({
        total: logsData.pagination.total,
        today: logsData.data.filter((l: any) => {
          const d = new Date(l.created_at);
          return d.toDateString() === new Date().toDateString();
        }).length,
        week: logsData.pagination.total
      });

      setAdmins([
        { id: 1, name: 'Admin 1', role: 'admin', active: true },
        { id: 2, name: 'Admin 2', role: 'admin', active: true }
      ]);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AdminLayout title="Super-Admin Dashboard">
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm">Total Logs</h3>
          <p className="text-3xl text-neon font-bold">{stats.total}</p>
        </div>
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm">Today</h3>
          <p className="text-3xl text-neon font-bold">{stats.today}</p>
        </div>
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm">Active Admins</h3>
          <p className="text-3xl text-neon font-bold">{admins.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-lg text-textPrimary font-bold mb-4">Active Administrators</h3>
          <div className="space-y-2">
            {admins.map((admin: any) => (
              <div key={admin.id} className="flex justify-between items-center p-2 bg-bgDark rounded">
                <span className="text-textPrimary">{admin.name}</span>
                <span className="text-success text-sm">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-lg text-textPrimary font-bold mb-4">Recent Actions</h3>
          <div className="space-y-2">
            {logs.slice(0, 3).map((log: any, i: number) => (
              <div key={i} className="text-sm text-textSecondary p-2 bg-bgDark rounded">
                <p>{log.action} on {log.target_type}</p>
                <p className="text-xs text-textSecondary">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-cardBg border border-border rounded-lg p-4">
        <h3 className="text-lg text-textPrimary font-bold mb-4">Global Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="text-textSecondary text-sm">Commission: 15%</label>
            <button className="text-neon text-sm ml-4">Change</button>
          </div>
          <div>
            <label className="text-textSecondary text-sm">Minimum Order: 100₽</label>
            <button className="text-neon text-sm ml-4">Change</button>
          </div>
          <div>
            <label className="text-textSecondary text-sm">Tax: 18%</label>
            <button className="text-neon text-sm ml-4">Change</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
