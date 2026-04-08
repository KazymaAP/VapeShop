import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTelegramWebApp } from '../lib/telegram';
import { EmptyState } from '../components/EmptyState';

interface SavedItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  image: string;
}

export default function SavedForLaterPage() {
  const { user } = useTelegramWebApp();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedItems();
  }, []);

  const loadSavedItems = async () => {
    try {
      const response = await fetch('/api/cart/saved', {
        headers: { 'X-Telegram-Id': user?.id.toString() || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeSavedItem = async (id: string) => {
    try {
      await fetch('/api/cart/saved', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id.toString() || '',
        },
        body: JSON.stringify({ id }),
      });
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const moveToCart = async (productId: string) => {
    try {
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user?.id.toString() || '',
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      loadSavedItems();
    } catch (err) {
      console.error('Failed to move to cart:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bgDark flex items-center justify-center">
        <p className="text-textSecondary">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bgDark p-4">
      <h1 className="text-2xl font-bold mb-6 text-neon">Отложенное</h1>

      {items.length === 0 ? (
        <EmptyState
          type="no-products"
          title="Отложенных товаров нет"
          description="Нажмите на иконку сердца на товаре, чтобы добавить его в отложенное"
          action={{ label: 'Вернуться в каталог', href: '/' }}
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-cardBg rounded-lg border border-border p-4 flex gap-4">
              <Image
                src={item.image}
                alt={item.productName}
                className="w-20 h-20 object-cover rounded"
                width={80}
                height={80}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-textPrimary">{item.productName}</h3>
                <p className="text-neon font-bold mt-1">{item.price} ₽</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => moveToCart(item.productId)}
                  className="px-3 py-1 bg-neon text-white rounded text-sm hover:bg-opacity-90"
                >
                  В корзину
                </button>
                <button
                  onClick={() => removeSavedItem(item.id)}
                  className="px-3 py-1 bg-danger text-white rounded text-sm hover:bg-opacity-90"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
