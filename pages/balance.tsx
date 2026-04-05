import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../lib/telegram';

interface BalanceEntry {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface BalanceData {
  current_balance: number;
  history: BalanceEntry[];
}

export default function BalancePage() {
  const { user } = useTelegramWebApp();
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const response = await fetch('/api/user/balance', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setBalanceData(data.data);
      }
    } catch (err) {
      console.error('Failed to load balance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;
  if (!balanceData) return <div className="text-center py-8 text-textSecondary">Ошибка</div>;

  const getTypeColor = (type: string) => {
    if (type === 'refund' || type === 'cashback' || type === 'referral') return 'text-success';
    if (type === 'purchase' || type === 'withdrawal') return 'text-danger';
    return 'text-textSecondary';
  };

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Ваш баланс</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-neon to-purple-600 rounded-lg p-6 mb-6 text-white">
        <p className="text-sm opacity-90">Доступный баланс</p>
        <h2 className="text-4xl font-bold mt-2">{balanceData.current_balance} ₽</h2>
        <p className="text-sm opacity-90 mt-2">Можно использовать при оплате</p>
      </div>

      {/* History */}
      <h3 className="font-bold text-textPrimary mb-4">История</h3>
      <div className="space-y-3">
        {balanceData.history.map((entry) => (
          <div
            key={entry.id}
            className="bg-cardBg rounded-lg border border-border p-3 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-textPrimary">{entry.description}</p>
              <p className="text-textSecondary text-sm">
                {new Date(entry.created_at).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <p className={`font-bold ${getTypeColor(entry.type)}`}>
              {entry.type.includes('refund') || entry.type.includes('cashback') ? '+' : '-'}
              {entry.amount} ₽
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
