/**
 * Quick View модал для быстрого просмотра товара без перехода на полную страницу
 * Показывает: изображение, название, цена, рейтинг, описание, кнопки действия
 */

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '../types/api';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (productId: string, quantity: number) => Promise<void>;
  onViewDetails?: (productId: string) => void;
}

export function QuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onViewDetails,
}: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!isOpen || !product) return null;

  // Обработчик добавления в корзину
  const handleAddToCart = async () => {
    if (!onAddToCart) return;

    try {
      setIsAdding(true);
      await onAddToCart(product.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        setQuantity(1);
      }, 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const defaultImage = product.images?.[0] || '/images/product-placeholder.png';
  const rating = product.rating || 0;
  const ratingCount = product.reviews_count || 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <div
          className="bg-cardBg rounded-lg border border-border max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 id="quick-view-title" className="text-xl font-bold text-textPrimary">
              Быстрый просмотр
            </h2>
            <button
              onClick={onClose}
              className="text-textSecondary hover:text-textPrimary transition"
              aria-label="Закрыть модал"
            >
              ✕
            </button>
          </div>

          {/* Содержимое */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Изображение */}
              <div className="bg-bgDark rounded-lg overflow-hidden">
                <div className="relative w-full aspect-square">
                  <Image src={defaultImage} alt={product.name} fill className="object-cover" />
                </div>
              </div>

              {/* Информация */}
              <div className="flex flex-col justify-between">
                {/* Название и категория */}
                <div>
                  <h3 className="text-2xl font-bold text-textPrimary mb-2">{product.name}</h3>
                  {/* Категория не включена в API ответ, используйте category_id если нужно */}

                  {/* Рейтинг */}
                  {rating > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center">
                        {'⭐'.repeat(Math.floor(rating))}
                        {rating % 1 !== 0 && '✧'}
                      </div>
                      <span className="text-sm text-textSecondary">
                        {rating.toFixed(1)} ({ratingCount} отзывов)
                      </span>
                    </div>
                  )}

                  {/* Описание */}
                  {/* Описание не включено в ProductResponse, используйте specification */}
                </div>

                {/* Цена и действия */}
                <div className="space-y-4">
                  {/* Цена */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-neon">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  {/* Скидка */}
                  {/* Скидка процентов не включена в ProductResponse */}

                  {/* Количество */}
                  <div className="flex items-center gap-4">
                    <label htmlFor="quantity" className="text-textSecondary">
                      Количество:
                    </label>
                    <div className="flex items-center border border-border rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 hover:bg-bgDark transition"
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        max={product.stock || 99}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center bg-transparent border-none outline-none"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                        className="px-3 py-2 hover:bg-bgDark transition"
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Кнопки действия */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleAddToCart}
                      disabled={isAdding || (product.stock || 0) <= 0}
                      className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                        addedSuccess
                          ? 'bg-success text-white'
                          : 'bg-neon text-bgDark hover:shadow-neon disabled:opacity-50'
                      }`}
                    >
                      {addedSuccess ? '✓ Добавлено' : isAdding ? 'Добавляю...' : 'В корзину'}
                    </button>

                    {onViewDetails && (
                      <button
                        onClick={() => {
                          onViewDetails(product.id);
                          onClose();
                        }}
                        className="px-4 py-3 border border-border rounded-lg hover:bg-bgDark transition"
                      >
                        Полный просмотр
                      </button>
                    )}
                  </div>

                  {/* Stock indicator */}
                  {product.stock !== undefined && (
                    <p className={`text-sm ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>
                      {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
