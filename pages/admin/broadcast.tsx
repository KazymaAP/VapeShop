import { useState } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminBroadcast() {
  const { user } = useTelegramWebApp();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender_id: user?.id }),
      });
      const data = await res.json();
      setResult({ sent: data.sent, failed: data.failed });
      setMessage('');
    } catch {
      setResult({ sent: 0, failed: -1 });
    }

    setSending(false);
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl font-bold gradient-text">Рассылка</h1>
        </div>

        <div className="bg-cardBg border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-textSecondary text-sm mb-2 block">Текст сообщения</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст рассылки..."
              rows={6}
              className="w-full bg-bgDark border border-border rounded-xl px-4 py-3 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon resize-none"
            />
            <p className="text-textSecondary text-xs mt-1">{message.length} символов</p>
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-6 py-3 text-sm text-white font-medium disabled:opacity-50 ripple"
          >
            {sending ? 'Отправка...' : 'Отправить всем'}
          </button>

          {result && (
            <div className={`p-4 rounded-xl text-sm ${result.failed === -1 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
              {result.failed === -1
                ? 'Ошибка при отправке'
                : `Рассылка завершена: ${result.sent} отправлено, ${result.failed} ошибок`}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
