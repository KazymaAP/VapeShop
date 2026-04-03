import React, { useState } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface Customer {
  id: string;
  username?: string;
  telegramId: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  orders: number;
}

export default function SupportSearchPage() {
  const { user } = useTelegramWebApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/support/search-customer?q=${encodeURIComponent(query)}`, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data.data || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Поиск клиента</h1>

      <div className="bg-cardBg rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Телефон, Telegram ID или имя..."
            className="flex-1 px-3 py-2 bg-bgDark border border-border rounded text-textPrimary placeholder-textSecondary"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? '...' : 'Найти'}
          </button>
        </div>
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-center text-textSecondary">Клиентов не найдено</p>
      )}

      <div className="space-y-4">
        {results.map((customer) => (
          <div key={customer.id} className="bg-cardBg rounded-lg border border-border p-4">
            <h3 className="text-lg font-bold text-neon">{customer.firstName} {customer.lastName || ''}</h3>
            <p className="text-textSecondary text-sm">Telegram ID: {customer.telegramId}</p>
            {customer.phone && <p className="text-textSecondary text-sm">Телефон: {customer.phone}</p>}
            {customer.username && <p className="text-textSecondary text-sm">@{customer.username}</p>}
            <p className="text-textSecondary text-sm mt-2">Заказов: {customer.orders}</p>
            
            <a
              href={`/support/customers/${customer.id}`}
              className="block mt-3 px-4 py-2 bg-neon text-white rounded text-center font-semibold hover:bg-opacity-90"
            >
              Открыть профиль
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
