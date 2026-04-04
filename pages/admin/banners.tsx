'use client';

import { useEffect, useState } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';

interface Banner {
  id: number;
  image_url: string;
  link?: string;
  title?: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  updated_at: string;
}

export default function BannersAdminPage() {
  const { user, isReady } = useTelegramWebApp();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    image_url: '',
    link: '',
    title: '',
    description: '',
    order_index: 0,
    is_active: true,
  });

  // Загрузка баннеров
  const loadBanners = async () => {
    if (!isReady) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/banners', {
        headers: {
          'X-Telegram-Id': user?.id?.toString() || '',
        },
      });

      if (!response.ok) throw new Error('Ошибка загрузки');

      const data = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Load banners error:', error);
      alert('Ошибка при загрузке баннеров');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [isReady, user?.id]);

  // Создание баннера
  const createBanner = async () => {
    if (!formData.image_url.trim()) {
      alert('Введите URL изображения');
      return;
    }

    try {
      const response = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Ошибка создания');

      setFormData({
        image_url: '',
        link: '',
        title: '',
        description: '',
        order_index: 0,
        is_active: true,
      });
      setShowForm(false);
      await loadBanners();
      alert('Баннер создан');
    } catch (error) {
      console.error('Create banner error:', error);
      alert('Ошибка при создании баннера');
    }
  };

  // Удаление баннера
  const deleteBanner = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить баннер?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Telegram-Id': user?.id?.toString() || '',
        },
      });

      if (!response.ok) throw new Error('Ошибка удаления');

      await loadBanners();
      alert('Баннер удалён');
    } catch (error) {
      console.error('Delete banner error:', error);
      alert('Ошибка при удалении баннера');
    }
  };

  if (!isReady || loading) {
    return (
      <div className="min-h-screen bg-bgDark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-neon">Управление баннерами</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-neon text-bgDark font-semibold rounded hover:opacity-80 transition"
          >
            {showForm ? 'Отмена' : '+ Создать баннер'}
          </button>
        </div>

        {/* Форма создания */}
        {showForm && (
          <div className="bg-cardBg border border-border rounded-lg p-4 mb-6 space-y-4">
            <input
              type="text"
              placeholder="URL изображения"
              value={formData.image_url}
              onChange={e => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Ссылка (опционально)"
              value={formData.link}
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Заголовок (опционально)"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Описание (опционально)"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
            />
            <input
              type="number"
              placeholder="Порядок"
              value={formData.order_index}
              onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              className="w-full bg-bgDark border border-border rounded px-3 py-2 text-white"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Активный баннер</span>
            </label>
            <button
              onClick={createBanner}
              className="w-full px-4 py-2 bg-neon text-bgDark font-semibold rounded hover:opacity-80 transition"
            >
              Создать баннер
            </button>
          </div>
        )}

        {/* Список баннеров */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {banners.map(banner => (
            <div key={banner.id} className="bg-cardBg border border-border rounded-lg overflow-hidden">
              {/* Превью изображения */}
              {banner.image_url && (
                <div className="w-full h-40 bg-bgDark flex items-center justify-center overflow-hidden">
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Баннер'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Информация */}
              <div className="p-4">
                <h3 className="font-bold text-neon mb-2">{banner.title || `Баннер #${banner.id}`}</h3>
                <p className="text-sm text-gray-400 mb-2">{banner.description}</p>
                {banner.link && (
                  <p className="text-xs text-gray-500 mb-3">
                    <strong>Ссылка:</strong> <a href={banner.link} target="_blank" rel="noopener noreferrer" className="text-neon hover:underline">{banner.link}</a>
                  </p>
                )}
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${banner.is_active ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {banner.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <span className="text-xs bg-border text-gray-300 px-2 py-1 rounded">
                    Порядок: {banner.order_index}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="flex-1 px-3 py-2 bg-red-900 text-red-200 font-semibold rounded hover:opacity-80 transition text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {banners.length === 0 && !showForm && (
          <div className="bg-cardBg border border-border rounded-lg p-8 text-center text-gray-400">
            <p>Баннеров не найдено. Создайте первый баннер!</p>
          </div>
        )}
      </div>
    </div>
  );
}

