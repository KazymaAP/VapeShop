import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', target_type: '', user_id: '' });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (filters.action) params.append('action', filters.action);
      if (filters.target_type) params.append('target_type', filters.target_type);
      if (filters.user_id) params.append('user_id', filters.user_id);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AdminLayout title="Audit Logs">
      <div className="mb-6 bg-cardBg border border-border rounded-lg p-4">
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Action"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="p-2 bg-bgDark border border-border rounded text-textPrimary"
          />
          <input
            type="text"
            placeholder="Target Type"
            value={filters.target_type}
            onChange={(e) => setFilters({ ...filters, target_type: e.target.value })}
            className="p-2 bg-bgDark border border-border rounded text-textPrimary"
          />
          <input
            type="text"
            placeholder="User ID"
            value={filters.user_id}
            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
            className="p-2 bg-bgDark border border-border rounded text-textPrimary"
          />
        </div>
      </div>

      <div className="space-y-2">
        {logs.map((log: any, i: number) => (
          <div key={i} className="bg-cardBg border border-border rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neon font-bold">{log.action}</p>
                <p className="text-textSecondary text-sm">{log.target_type} #{log.target_id}</p>
                <p className="text-textSecondary text-xs">{new Date(log.created_at).toLocaleString()}</p>
              </div>
              <span className="text-textSecondary text-sm">User: {log.user_id}</span>
            </div>
            {log.details && (
              <p className="text-textSecondary text-xs mt-2 bg-bgDark p-2 rounded">
                {JSON.stringify(log.details).slice(0, 100)}...
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 bg-neon text-bgDark rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-textPrimary">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-neon text-bgDark rounded"
        >
          Next
        </button>
      </div>
    </AdminLayout>
  );
}
