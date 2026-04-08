/**
 * Нижняя навигация для мобильных приложений
 * Показывается только на экранах < 768px (md breakpoint)
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface NavItem {
  icon: string;
  label: string;
  href: string;
  badge?: number;
}

export function BottomNav() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);

  // Получение кол-ва товаров в корзине
  const { data: cartData } = useSWR(
    '/api/cart',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      return res.json();
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  useEffect(() => {
    if (cartData?.data?.items) {
      const count = cartData.data.items.reduce(
        (sum: number, item: { quantity?: number }) => sum + (item.quantity || 0),
        0
      );
      setCartCount(count);
    }
  }, [cartData]);

  const navItems: NavItem[] = [
    { icon: '🏠', label: 'Главная', href: '/' },
    { icon: '🛍️', label: 'Товары', href: '/products' },
    { icon: '🛒', label: 'Корзина', href: '/cart', badge: cartCount },
    { icon: '📦', label: 'Заказы', href: '/orders' },
    { icon: '👤', label: 'Профиль', href: '/profile' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-40 safe-area-inset-bottom"
      role="navigation"
      aria-label="Основная навигация"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            router.pathname === item.href ||
            (item.href !== '/' && router.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition relative',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Иконка */}
              <span className="text-xl leading-none">{item.icon}</span>

              {/* Бейдж с кол-вом */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}

              {/* Текст */}
              <span className="text-xs font-medium">{item.label}</span>

              {/* Активный индикатор */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Компонент для добавления padding-bottom для контента
 * (чтобы контент не был закрыт bottom nav)
 */
export function useBottomNavHeight() {
  return 'pb-16 md:pb-0';
}
