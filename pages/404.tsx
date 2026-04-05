/**
 * Страница 404 (товар не найден)
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md">
        {/* Иконка ошибки */}
        <div className="text-6xl mb-4 animate-bounce">😕</div>

        {/* Заголовок */}
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Страница не найдена
        </h1>

        {/* Описание */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Похоже, что страница, которую вы ищете, не существует или была перемещена. Код ошибки: 404
        </p>

        {/* Кнопки */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <a className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition inline-block">
              🏠 На главную
            </a>
          </Link>
          <Link href="/products">
            <a className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition inline-block">
              🛍️ Каталог товаров
            </a>
          </Link>
        </div>

        {/* Полезные ссылки */}
        <div className="mt-12 pt-8 border-t border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Полезные ссылки:</p>
          <div className="space-y-2 text-sm">
            <Link href="/">
              <a className="text-blue-600 dark:text-blue-400 hover:underline block">
                Главная страница
              </a>
            </Link>
            <Link href="/products">
              <a className="text-blue-600 dark:text-blue-400 hover:underline block">
                Каталог товаров
              </a>
            </Link>
            <Link href="/orders">
              <a className="text-blue-600 dark:text-blue-400 hover:underline block">Мои заказы</a>
            </Link>
            <Link href="/profile">
              <a className="text-blue-600 dark:text-blue-400 hover:underline block">Профиль</a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
