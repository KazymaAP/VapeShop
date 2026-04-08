/**
 * Компонент для отображения рейтинга звёздочками
 * Используется на карточках товаров и в отзывах
 */

import clsx from 'clsx';

interface RatingStarsProps {
  rating: number; // 0-5
  count?: number; // Кол-во отзывов
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  interactive?: boolean; // Интерактивный режим (для выбора рейтинга)
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function RatingStars({
  rating,
  count,
  size = 'md',
  showCount = false,
  interactive = false,
  onRatingChange,
  className = '',
}: RatingStarsProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const stars = Array.from({ length: 5 }, (_, i) => {
    const starValue = i + 1;
    const isFilled = starValue <= Math.round(rating);
    const isPartial = starValue - rating > 0 && starValue - rating < 1;

    return (
      <button
        key={starValue}
        onClick={() => onRatingChange?.(starValue)}
        className={clsx(
          'transition cursor-pointer',
          interactive && 'hover:scale-110',
          !interactive && 'cursor-default'
        )}
        disabled={!interactive}
        aria-label={`${starValue} из 5 звёзд`}
        aria-current={starValue === Math.round(rating) ? 'true' : undefined}
      >
        <div className="relative inline-block">
          {/* Пустая звезда */}
          <Star
            className={clsx(sizeMap[size], 'text-gray-300 dark:text-gray-600')}
            filled={false}
          />

          {/* Заполненная звезда */}
          {isFilled && (
            <Star
              className={clsx(
                sizeMap[size],
                'text-yellow-400 dark:text-yellow-500 absolute top-0 left-0'
              )}
              filled={true}
            />
          )}

          {/* Частично заполненная звезда */}
          {isPartial && (
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${(1 - (starValue - rating)) * 100}%` }}
            >
              <Star
                className={clsx(sizeMap[size], 'text-yellow-400 dark:text-yellow-500')}
                filled={true}
              />
            </div>
          )}
        </div>
      </button>
    );
  });

  return (
    <div
      className={clsx('flex items-center gap-2', className)}
      role="img"
      aria-label={`Рейтинг: ${rating.toFixed(1)} из 5 звёзд`}
    >
      <div className="flex items-center gap-1">{stars}</div>

      {/* Рейтинг и кол-во отзывов */}
      {showCount && (
        <div className="flex items-center gap-1 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
          {count !== undefined && count > 0 && (
            <span className="text-gray-600 dark:text-gray-400">({count})</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Простая версия для большого отображения
 */
export function RatingStarsBig({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center',
              i < Math.round(rating)
                ? 'bg-yellow-100 dark:bg-yellow-900'
                : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <span className={clsx('text-lg', i < Math.round(rating) ? '⭐' : '☆')}>
              {i < Math.round(rating) ? '★' : '☆'}
            </span>
          </div>
        ))}
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{rating.toFixed(1)}</div>
        {count !== undefined && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {count === 1 ? '1 отзыв' : count < 5 ? `${count} отзыва` : `${count} отзывов`}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Компонент звезды (SVG)
 */
function Star({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/**
 * Компонент для интерактивного выбора рейтинга
 */
export function RatingSelector({
  value = 0,
  onChange,
  size = 'lg',
}: {
  value?: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">
        Ваша оценка:
      </label>
      <RatingStars
        rating={value}
        size={size}
        interactive={true}
        onRatingChange={onChange}
        className="text-2xl"
      />
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        {value === 0 && '🤐 Выберите оценку'}
        {value === 1 && '😠 Очень плохо'}
        {value === 2 && '😕 Плохо'}
        {value === 3 && '😐 Нормально'}
        {value === 4 && '😊 Хорошо'}
        {value === 5 && '😍 Отлично'}
      </div>
    </div>
  );
}
