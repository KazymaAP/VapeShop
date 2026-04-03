import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any>({
    kpi: { total_revenue: 0, total_orders: 0, avg_order: 0 },
    revenue_by_day: [],
    top_products: [],
    top_categories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  if (loading) return <div>Loading...</div>;

  return (
    <AdminLayout title="Analytics Dashboard">
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm mb-2">Total Revenue</h3>
          <p className="text-3xl text-neon font-bold">₽{data.kpi.total_revenue.toLocaleString()}</p>
        </div>
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm mb-2">Total Orders</h3>
          <p className="text-3xl text-neon font-bold">{data.kpi.total_orders}</p>
        </div>
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textSecondary text-sm mb-2">Average Order</h3>
          <p className="text-3xl text-neon font-bold">₽{data.kpi.avg_order.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textPrimary font-bold mb-4">Revenue by Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.revenue_by_day}>
              <CartesianGrid stroke="#2a2a33" />
              <XAxis stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#111115', border: '1px solid #2a2a33' }} />
              <Line type="monotone" dataKey="revenue" stroke="#c084fc" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-cardBg border border-border rounded-lg p-4">
          <h3 className="text-textPrimary font-bold mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.top_products.slice(0, 5)}>
              <CartesianGrid stroke="#2a2a33" />
              <XAxis stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#111115', border: '1px solid #2a2a33' }} />
              <Bar dataKey="sold" fill="#c084fc" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-cardBg border border-border rounded-lg p-4">
        <h3 className="text-textPrimary font-bold mb-4">Top Categories</h3>
        <div className="space-y-2">
          {data.top_categories.slice(0, 5).map((cat: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 bg-bgDark rounded">
              <span className="text-textPrimary">{cat.category}</span>
              <span className="text-neon">{cat.sold} sold • ₽{cat.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
