/**
 * Компонент для отображения навигационной цепочки (Breadcrumb)
 * Используется на страницах товаров, категорий и т.д.
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  separatorClassName?: string;
}

export function Breadcrumb({
  items = [],
  className = '',
  separatorClassName = '',
}: BreadcrumbProps) {
  const router = useRouter();

  // Если items не переданы, генерируем из URL
  const breadcrumbs: BreadcrumbItem[] =
    items.length > 0 ? items : generateBreadcrumbs(router.pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx(
        'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 overflow-x-auto',
        className
      )}
    >
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2 whitespace-nowrap">
          {/* Сепаратор */}
          {index > 0 && (
            <span
              className={clsx('text-gray-400 dark:text-gray-500 select-none', separatorClassName)}
              aria-hidden="true"
            >
              →
            </span>
          )}

          {/* Ссылка или текст */}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-semibold text-gray-900 dark:text-white">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-blue-600 dark:text-blue-400 hover:underline transition"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * Альтернативная версия с иконками
 */
export function BreadcrumbWithIcons({
  items = [],
  className = '',
}: {
  items?: BreadcrumbItem[];
  className?: string;
}) {
  const router = useRouter();
  const breadcrumbs = items.length > 0 ? items : generateBreadcrumbs(router.pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx(
        'flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 overflow-x-auto',
        className
      )}
    >
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2 whitespace-nowrap">
          {/* Иконка для пункта */}
          {index === 0 && <span className="text-lg">🏠</span>}
          {index > 0 && <span className="text-gray-400 dark:text-gray-500">/</span>}

          {/* Ссылка или текст */}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-blue-600 dark:text-blue-400 hover:underline transition line-clamp-1"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * Функция для автоматического генерирования breadcrumbs из URL
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Главная', href: '/' }];

  if (pathname === '/') {
    return breadcrumbs;
  }

  const segments = pathname.split('/').filter(Boolean);

  segments.forEach((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = formatLabel(segment);

    // Пропускаем динамические сегменты (например, [id])
    if (!segment.startsWith('[') && !segment.endsWith(']')) {
      breadcrumbs.push({ label, href });
    }
  });

  return breadcrumbs;
}

/**
 * Форматирование текста для breadcrumb
 */
function formatLabel(segment: string): string {
  // Удаляем параметры и форматируем
  const formatted = segment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const labels: Record<string, string> = {
    products: 'Товары',
    product: 'Товар',
    admin: '🔐 Админ',
    orders: 'Заказы',
    cart: '🛒 Корзина',
    profile: '👤 Профиль',
    favorites: '❤️ Избранное',
    reviews: '⭐ Отзывы',
    categories: 'Категории',
    brands: 'Бренды',
    sale: '🏷️ Распродажа',
    settings: '⚙️ Настройки',
    tracking: '📍 Трекинг',
  };

  return labels[segment] || formatted;
}
