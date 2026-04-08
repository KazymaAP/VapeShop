import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import { TextSkeleton } from '../../components/SkeletonLoader';

interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export default function SupportTicketsPage() {
  const { user } = useTelegramWebApp();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      const response = await fetch(`/api/support/tickets?status=${filter}`, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-success',
    medium: 'bg-warning',
    high: 'bg-danger',
  };

  if (loading) return <TextSkeleton lines={6} />;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Обращения</h1>

      <div className="flex gap-2 mb-6">
        {['open', 'in_progress', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded font-semibold ${
              filter === status
                ? 'bg-neon text-white'
                : 'bg-cardBg border border-border text-textPrimary'
            }`}
          >
            {status === 'open' ? 'Новые' : status === 'in_progress' ? 'В обработке' : 'Закрытые'}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <p className="text-center text-textSecondary">Обращений не найдено</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <a
              key={ticket.id}
              href={`/support/tickets/${ticket.id}`}
              className="block bg-cardBg rounded-lg border border-border p-4 hover:border-neon transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-textPrimary">{ticket.subject}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[ticket.priority]} text-white`}
                >
                  {ticket.priority === 'low'
                    ? 'Низкий'
                    : ticket.priority === 'medium'
                      ? 'Средний'
                      : 'Высокий'}
                </span>
              </div>
              <p className="text-textSecondary text-sm">Клиент: {ticket.customerName}</p>
              <p className="text-textSecondary text-sm">
                Дата: {new Date(ticket.createdAt).toLocaleString('ru-RU')}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
