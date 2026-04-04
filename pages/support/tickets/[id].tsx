import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../../lib/telegram';
import ChatWindow from '../../../components/ChatWindow';

export default function SupportTicketPage() {
  const { user } = useTelegramWebApp();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const ticketId = typeof window !== 'undefined' ? window.location.pathname.split('/')[3] : '';

  useEffect(() => {
    loadTicket();
  }, []);

  const loadTicket = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setTicket(data.data);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id.toString() || ''
        },
        body: JSON.stringify({ status: newStatus })
      });
      loadTicket();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;
  if (!ticket) return <div className="text-center py-8 text-textSecondary">Обращение не найдено</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Обращение #{ticketId}</h1>

      {/* Ticket info */}
      <div className="bg-cardBg rounded-lg border border-border p-4 mb-6">
        <h2 className="font-bold text-textPrimary mb-3">{ticket.subject}</h2>
        <p className="text-textSecondary mb-4">{ticket.description}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-textSecondary">Статус:</p>
            <p className="text-textPrimary font-semibold">{ticket.status}</p>
          </div>
          <div>
            <p className="text-textSecondary">Приоритет:</p>
            <p className="text-textPrimary font-semibold">{ticket.priority}</p>
          </div>
          <div>
            <p className="text-textSecondary">Клиент:</p>
            <p className="text-textPrimary font-semibold">{ticket.customer_name}</p>
          </div>
          <div>
            <p className="text-textSecondary">Дата:</p>
            <p className="text-textPrimary font-semibold">{new Date(ticket.created_at).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {ticket.status !== 'closed' && (
            <>
              <button
                onClick={() => updateStatus('in_progress')}
                className="flex-1 px-3 py-2 bg-warning text-white rounded text-sm hover:bg-opacity-90"
              >
                В обработке
              </button>
              <button
                onClick={() => updateStatus('closed')}
                className="flex-1 px-3 py-2 bg-success text-white rounded text-sm hover:bg-opacity-90"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat */}
      <ChatWindow supportTicketId={ticketId} />
    </div>
  );
}
