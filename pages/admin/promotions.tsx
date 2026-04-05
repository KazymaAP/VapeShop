import React, { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface Promotion {
  id: string;
  name: string;
  type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function PromotionsPage() {
  const { user } = useTelegramWebApp();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percent',
    discount_value: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/admin/promotions', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setPromotions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id.toString() || '',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setFormData({
          name: '',
          type: 'percent',
          discount_value: '',
          start_date: '',
          end_date: '',
        });
        setShowForm(false);
        loadPromotions();
      }
    } catch (err) {
      console.error('Failed to create promotion:', err);
    }
  };

  if (loading) return <div className="text-center py-8 text-textSecondary">Загрузка...</div>;

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neon">Промокоды и акции</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
        >
          + Новая акция
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-cardBg rounded-lg border border-border p-6 mb-6"
        >
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Название акции"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
            >
              <option value="percent">Процент скидки (%)</option>
              <option value="fixed">Фиксированная сумма (₽)</option>
            </select>
            <input
              type="number"
              placeholder="Размер скидки"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
              className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
              required
            />
            <input
              type="datetime-local"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
              required
            />
            <input
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 bg-bgDark border border-border rounded text-textPrimary"
              required
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-neon text-white rounded font-semibold hover:bg-opacity-90"
            >
              Создать акцию
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-cardBg rounded-lg border border-border p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-textPrimary">{promo.name}</h3>
              <span
                className={`px-2 py-1 rounded text-xs ${promo.is_active ? 'bg-success' : 'bg-danger'} text-white`}
              >
                {promo.is_active ? 'Активна' : 'Неактивна'}
              </span>
            </div>
            <p className="text-textSecondary text-sm">
              Скидка: {promo.discount_value} {promo.type === 'percent' ? '%' : '₽'}
            </p>
            <p className="text-textSecondary text-sm">
              {new Date(promo.start_date).toLocaleDateString('ru-RU')} -{' '}
              {new Date(promo.end_date).toLocaleDateString('ru-RU')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
