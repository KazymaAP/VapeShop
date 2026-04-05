import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DashboardData } from '../../types/api';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    kpi: { total_revenue: 0, total_orders: 0, avg_order: 0 },
    revenue_by_day: [],
    top_products: [],
    top_categories: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-advanced');
      const dashData = await res.json();
      setData(dashData.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* KPI Cards */}
        <div className="bg-cardBg border border-border rounded-lg p-6">
          <p className="text-textSecondary text-sm mb-2">Общая выручка</p>
          <p className="text-3xl font-bold text-neon">₽{data.kpi.total_revenue.toLocaleString()}</p>
        </div>

        <div className="bg-cardBg border border-border rounded-lg p-6">
          <p className="text-textSecondary text-sm mb-2">Всего заказов</p>
          <p className="text-3xl font-bold text-neon">{data.kpi.total_orders}</p>
        </div>

        <div className="bg-cardBg border border-border rounded-lg p-6">
          <p className="text-textSecondary text-sm mb-2">Средний заказ</p>
          <p className="text-3xl font-bold text-neon">₽{data.kpi.avg_order.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="bg-cardBg border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-textPrimary mb-4">Выручка по дням</h3>
          {loading ? (
            <div className="h-64 skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenue_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a33" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111115',
                    border: '1px solid #2a2a33',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c084fc"
                  strokeWidth={2}
                  dot={{ fill: '#c084fc' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-cardBg border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold text-textPrimary mb-4">Топ товары</h3>
          {loading ? (
            <div className="h-64 skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.top_products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a33" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111115',
                    border: '1px solid #2a2a33',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sold" fill="#c084fc" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-cardBg border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold text-textPrimary mb-4">Топ категории</h3>
        <div className="space-y-3">
          {data.top_categories.map((cat, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-bgDark rounded">
              <span className="text-textPrimary">{cat.category}</span>
              <span className="text-neon">
                {cat.sold} sold • ₽{cat.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
