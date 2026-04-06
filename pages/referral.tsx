import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../lib/telegram';

interface ReferralInfo {
  code: string;
  invitedCount: number;
  earned: number;
}

export default function ReferralPage() {
  const { user } = useTelegramWebApp();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferralInfo();
  }, []);

  const loadReferralInfo = async () => {
    try {
      const response = await fetch('/api/user/referral', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setReferralInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to load referral info:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      const response = await fetch('/api/user/referral', {
        method: 'POST',
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setReferralInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to generate code:', err);
    }
  };

  const shareCode = () => {
    if (!referralInfo?.code) return;
    const text = `Я покупаю в VapeShop и получаю кэшбэк! Используй мой код ${referralInfo.code} и получи скидку 5%`;

    // Используем navigator.share если доступно (для мобильных браузеров)
    if (navigator.share) {
      navigator
        .share({
          title: 'VapeShop',
          text,
        })
        .catch((err) => {
          console.error('Ошибка при попытке поделиться:', err);
          // Fallback: копируем в буфер обмена
          copyToClipboard(text);
        });
    } else {
      // Fallback для браузеров без поддержки navigator.share
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          // Показываем уведомление об успехе
          alert('✅ Ссылка скопирована в буфер обмена!');
        })
        .catch(() => {
          // Если clipboard API не работает, используем старый способ
          const textarea = document.createElement('textarea');
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          alert('✅ Ссылка скопирована в буфер обмена!');
        });
    } catch (err) {
      console.error('Ошибка при копировании:', err);
      alert('❌ Ошибка при копировании.');
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Реферальная программа</h1>

      <div className="bg-cardBg rounded-lg border border-border p-6 mb-6">
        <p className="text-textSecondary mb-4">
          Приглашайте друзей и получайте 5% от каждой покупки
        </p>

        {referralInfo?.code ? (
          <>
            <div className="bg-bgDark rounded p-4 mb-4">
              <p className="text-textSecondary text-sm mb-1">Ваш код:</p>
              <p className="text-neon font-bold text-2xl">{referralInfo.code}</p>
            </div>
            <button
              onClick={shareCode}
              className="w-full px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
            >
              Поделиться кодом
            </button>
          </>
        ) : (
          <button
            onClick={generateCode}
            className="w-full px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
          >
            Создать код
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-cardBg rounded-lg border border-border p-4 text-center">
          <p className="text-textSecondary text-sm">Приглашено друзей</p>
          <p className="text-2xl font-bold text-neon mt-2">{referralInfo?.invitedCount || 0}</p>
        </div>
        <div className="bg-cardBg rounded-lg border border-border p-4 text-center">
          <p className="text-textSecondary text-sm">Заработано</p>
          <p className="text-2xl font-bold text-success mt-2">{referralInfo?.earned || 0} ₽</p>
        </div>
      </div>
    </div>
  );
}
