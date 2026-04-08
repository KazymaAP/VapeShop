import { useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';

export default function ExportOrders() {
  const [format, setFormat] = useState('xlsx');
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    status: '',
    min_amount: '',
    max_amount: '',
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.status) params.append('status', filters.status);
      if (filters.min_amount) params.append('min_amount', filters.min_amount);
      if (filters.max_amount) params.append('max_amount', filters.max_amount);

      const res = await fetch(`/api/admin/orders/export?${params}`);

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders.${format === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout title="Export Orders">
      <div className="bg-cardBg border border-border rounded-lg p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-textPrimary text-sm mb-2">Format</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="xlsx"
                  checked={format === 'xlsx'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                <span className="text-textPrimary">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value)}
                />
                <span className="text-textPrimary">CSV (.csv)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-textPrimary text-sm mb-2">Date From</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full p-2 bg-bgDark border border-border rounded text-textPrimary"
            />
          </div>

          <div>
            <label className="block text-textPrimary text-sm mb-2">Date To</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full p-2 bg-bgDark border border-border rounded text-textPrimary"
            />
          </div>

          <div>
            <label className="block text-textPrimary text-sm mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full p-2 bg-bgDark border border-border rounded text-textPrimary"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-textPrimary text-sm mb-2">Min Amount</label>
              <input
                type="number"
                value={filters.min_amount}
                onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
                placeholder="0"
                className="w-full p-2 bg-bgDark border border-border rounded text-textPrimary"
              />
            </div>
            <div>
              <label className="block text-textPrimary text-sm mb-2">Max Amount</label>
              <input
                type="number"
                value={filters.max_amount}
                onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
                placeholder="999999"
                className="w-full p-2 bg-bgDark border border-border rounded text-textPrimary"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-4 py-2 bg-neon text-bgDark rounded-lg font-bold disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export Orders'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
