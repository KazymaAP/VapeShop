/**
 * Компонент для отображения рекомендуемых/лучших товаров
 * Используется на главной странице и в каталоге
 */

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import clsx from 'clsx';
import ProductCard from './ProductCard';
import { SkeletonLoader } from './SkeletonLoader';

const DEFAULT_PRODUCT_IMAGE = '/no-image.png';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  average_rating?: number;
  review_count?: number;
  discount_percent?: number;
  is_active: boolean;
}

interface FeaturedProductsProps {
  title?: string;
  description?: string;
  limit?: number;
  category?: string;
  showViewMore?: boolean;
  className?: string;
}

export function FeaturedProducts({
  title = '⭐ Лучшие товары',
  description,
  limit = 8,
  category,
  showViewMore = true,
  className = '',
}: FeaturedProductsProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'sales' | 'new'>('rating');

  // Загрузка товаров
  const { data, isLoading, error } = useSWR<{ success: boolean; data: Product[] }>(
    `/api/products/best-sellers?limit=${limit}&sortBy=${sortBy}${category ? `&category=${category}` : ''}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load products');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const products = data?.data || [];

  if (error) {
    return (
      <div className={clsx('text-center text-red-600 dark:text-red-400', className)}>
        ❌ Ошибка загрузки товаров
      </div>
    );
  }

  return (
    <section className={clsx('space-y-6', className)}>
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>

        {/* Фильтры сортировки */}
        {!isLoading && (
          <div className="hidden sm:flex gap-2">
            <SortButton
              active={sortBy === 'rating'}
              onClick={() => setSortBy('rating')}
              label="⭐ Рейтинг"
            />
            <SortButton
              active={sortBy === 'sales'}
              onClick={() => setSortBy('sales')}
              label="🔥 Популярные"
            />
            <SortButton
              active={sortBy === 'new'}
              onClick={() => setSortBy('new')}
              label="✨ Новинки"
            />
          </div>
        )}
      </div>

      {/* Мобильный selector для сортировки */}
      <div className="sm:hidden">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'sales' | 'new')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        >
          <option value="rating">⭐ По рейтингу</option>
          <option value="sales">🔥 По популярности</option>
          <option value="new">✨ Новинки</option>
        </select>
      </div>

      {/* Сетка товаров */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(limit)].map((_, i) => (
            <ProductCard
              key={i}
              id={`skeleton-${i}`}
              name=""
              price={0}
              stock={0}
              loading={true}
              onAddToCart={() => {}}
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">Товары не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product: Product) => (
            <ProductCard
              key={product.id}
              id={String(product.id)}
              name={product.name}
              price={product.price}
              image={product.image_url || DEFAULT_PRODUCT_IMAGE}
              stock={100}
              onAddToCart={() => {}}
            />
          ))}
        </div>
      )}

      {/* Кнопка "Показать все" */}
      {showViewMore && products.length > 0 && (
        <div className="text-center pt-4">
          <Link href={category ? `/products?category=${category}` : '/products'} className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
            🛍️ Показать все товары
          </Link>
        </div>
      )}
    </section>
  );
}

/**
 * Компонент кнопки для сортировки
 */
function SortButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-lg font-medium transition whitespace-nowrap',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
      )}
    >
      {label}
    </button>
  );
}
