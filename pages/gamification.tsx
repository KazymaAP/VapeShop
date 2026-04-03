import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../lib/telegram';

interface UserLevel {
  level: number;
  experience: number;
  badges: string[];
}

export default function GamificationPage() {
  const { user } = useTelegramWebApp();
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevel();
  }, []);

  const loadLevel = async () => {
    try {
      const response = await fetch('/api/gamification/level', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setLevel(data.data);
      }
    } catch (err) {
      console.error('Failed to load level:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;
  if (!level) return <div className="text-center py-8 text-textSecondary">Ошибка загрузки</div>;

  const nextLevelExp = 100;
  const progressPercent = (level.experience / nextLevelExp) * 100;

  const badges = ['🏆', '⭐', '🎯', '🔥', '💎', '🌟'];

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Геймификация</h1>

      {/* Level card */}
      <div className="bg-gradient-to-r from-neon to-purple-600 rounded-lg p-6 mb-6 text-white">
        <p className="text-sm opacity-90">Ваш уровень</p>
        <h2 className="text-5xl font-bold mt-2">{level.level}</h2>
        <p className="text-sm opacity-90 mt-2">Купец ранга {level.level}</p>
      </div>

      {/* Experience bar */}
      <div className="bg-cardBg rounded-lg border border-border p-4 mb-6">
        <div className="flex justify-between mb-2">
          <p className="text-textSecondary text-sm">Опыт до следующего уровня</p>
          <p className="text-neon font-bold">{level.experience}/{nextLevelExp}</p>
        </div>
        <div className="w-full bg-bgDark rounded-full h-3">
          <div
            className="bg-gradient-to-r from-neon to-purple-600 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Badges */}
      <div className="mb-6">
        <h3 className="font-bold text-textPrimary mb-4">Бейджи</h3>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((badge, idx) => (
            <div
              key={idx}
              className={`aspect-square flex items-center justify-center rounded-lg text-2xl ${
                level.badges.includes(badge) || idx < level.level
                  ? 'bg-neon/20 border border-neon'
                  : 'bg-bgDark border border-border opacity-50'
              }`}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-cardBg rounded-lg border border-border p-4">
        <h3 className="font-bold text-textPrimary mb-4">Преимущества уровня</h3>
        <ul className="space-y-2 text-sm text-textSecondary">
          <li>✓ Скидка {5 + level.level}% на все покупки</li>
          <li>✓ Ускоренная доставка</li>
          <li>✓ Приоритетная поддержка</li>
          <li>✓ Эксклюзивные предложения</li>
        </ul>
      </div>
    </div>
  );
}
