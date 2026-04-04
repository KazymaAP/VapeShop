/**
 * Компонент EmptyState для отображения пустых состояний с иконками и подсказками
 */

import Link from 'next/link';

interface EmptyStateProps {
  type: 'empty-cart' | 'no-orders' | 'no-results' | 'no-favorites' | 'no-products' | 'custom';
  title?: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

const EMPTY_STATE_CONFIG: Record<string, { emoji: string; title: string; description: string; action?: { label: string; href: string } }> = {
  'empty-cart': {
    emoji: '🛒',
    title: 'Корзина пуста',
    description: 'Добавьте товары из каталога, чтобы начать покупки',
    action: { label: 'Перейти в каталог', href: '/products' }
  },
  'no-orders': {
    emoji: '📦',
    title: 'У вас нет заказов',
    description: 'Оформите первый заказ и отслеживайте его статус здесь',
    action: { label: 'В каталог товаров', href: '/products' }
  },
  'no-results': {
    emoji: '🔍',
    title: 'Ничего не найдено',
    description: 'Попробуйте изменить критерии поиска или фильтры'
  },
  'no-favorites': {
    emoji: '❤️',
    title: 'Избранное пусто',
    description: 'Добавляйте понравившиеся товары в избранное для быстрого доступа',
    action: { label: 'Исследовать товары', href: '/products' }
  },
  'no-products': {
    emoji: '📋',
    title: 'Товаров нет',
    description: 'В этой категории пока нет товаров. Посмотрите другие категории.'
  }
};

export function EmptyState({
  type,
  title,
  description,
  icon,
  action,
  className = ''
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const finalEmoji = icon || config?.emoji || '👋';
  const finalTitle = title || config?.title || 'Состояние';
  const finalDescription = description || config?.description || '';
  const finalAction = action || config?.action;

  return (
    <div
      className={`
        flex flex-col items-center justify-center py-12 px-4 text-center
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Иконка */}
      <div className="text-6xl mb-4" role="img" aria-label={finalTitle}>
        {finalEmoji}
      </div>

      {/* Заголовок */}
      <h2 className="text-2xl font-bold text-textPrimary mb-2">
        {finalTitle}
      </h2>

      {/* Описание */}
      <p className="text-textSecondary max-w-sm mb-6">
        {finalDescription}
      </p>

      {/* CTA кнопка */}
      {finalAction && (
        <Link href={finalAction.href}>
          <a className="px-6 py-2.5 bg-gradient-to-r from-[#7c3aed] to-neon rounded-full text-white font-semibold hover:shadow-neon transition">
            {finalAction.label}
          </a>
        </Link>
      )}
    </div>
  );
}
