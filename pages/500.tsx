/**
 * Страница 500 (серверная ошибка)
 */

import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ServerError() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md">
        {/* Иконка ошибки */}
        <div className="text-6xl mb-4">⚠️</div>

        {/* Заголовок */}
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">Ошибка сервера</h1>

        {/* Описание */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          На сервере произошла ошибка. Наша команда уже работает над её решением. Пожалуйста, попробуйте позже. Код ошибки: 500
        </p>

        {/* Кнопки */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            ← Вернуться назад
          </button>
          <Link href="/">
            <a className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition">
              🏠 На главную
            </a>
          </Link>
        </div>

        {/* Что можно сделать */}
        <div className="mt-12 pt-8 border-t border-gray-300 dark:border-gray-700 text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Что вы можете сделать:</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>✓ Обновить страницу (F5 или Cmd+R)</li>
            <li>✓ Очистить кэш браузера</li>
            <li>✓ Попробовать позже</li>
            <li>✓ Связаться с поддержкой если ошибка повторяется</li>
          </ul>
        </div>

        {/* Error ID (для отслеживания) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 font-mono">
            <p>Error ID: {Date.now()}</p>
            <p>Time: {new Date().toISOString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
