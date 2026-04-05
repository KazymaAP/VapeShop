import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../lib/telegram';

interface ChatWindowProps {
  orderId?: string;
  supportTicketId?: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSupport?: boolean;
}

export default function ChatWindow({ orderId, supportTicketId }: ChatWindowProps) {
  const { user } = useTelegramWebApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [orderId, supportTicketId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const endpoint = orderId
        ? `/api/orders/${orderId}/chat`
        : `/api/support/tickets/${supportTicketId}/messages`;

      const response = await fetch(endpoint, {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();
      setMessages(data.data || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const endpoint = orderId
      ? `/api/orders/${orderId}/chat`
      : `/api/support/tickets/${supportTicketId}/messages`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id.toString() || '',
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      setInput('');
      loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cardBg rounded-lg border border-border">
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-textSecondary">Загрузка...</p>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isSupport || msg.sender !== user?.username ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.isSupport || msg.sender !== user?.username
                  ? 'bg-bgDark text-textPrimary'
                  : 'bg-neon text-white'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <span className="text-xs opacity-60">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Введите сообщение..."
          className="flex-1 px-3 py-2 bg-bgDark border border-border rounded text-textPrimary placeholder-textSecondary"
          aria-label="Введите сообщение"
        />
        <button
          onClick={handleSendMessage}
          className="px-4 py-2 bg-neon text-white rounded hover:bg-opacity-90"
          aria-label="Отправить сообщение"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
