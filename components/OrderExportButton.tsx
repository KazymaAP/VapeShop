/**
 * Компонент для экспорта заказов в Excel
 * Используется на странице /admin/orders
 */

import { useState } from 'react';

interface ExportFiltersProps {
  onExporting?: (state: boolean) => void;
}

export function OrderExportButton({ onExporting }: ExportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      onExporting?.(true);

      // Построение URL с параметрами
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (status) params.append('status', status);

      const url = `/api/admin/export-orders?${params}`;

      // Выполнение запроса
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Получение blob файла
      const blob = await response.blob();

      // Создание ссылки для скачивания
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Закрытие диалога
      setIsOpen(false);
      setDateFrom('');
      setDateTo('');
      setStatus('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Ошибка экспорта: ${message}`);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      onExporting?.(false);
    }
  };

  return (
    <div className="relative">
      {/* Кнопка */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        disabled={isExporting}
      >
        📊 {isExporting ? 'Экспортирую...' : 'Экспорт в Excel'}
      </button>

      {/* Модальное окно */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end md:items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-lg md:rounded-lg w-full md:w-96 p-6 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📊 Экспорт заказов
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Фильтры */}
            <div className="space-y-4 mb-6">
              {/* Дата от */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата от:
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Дата до */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата до:
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Статус */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Статус:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Все статусы</option>
                  <option value="pending">⏳ Ожидание</option>
                  <option value="processing">🔄 В обработке</option>
                  <option value="completed">✅ Завершен</option>
                  <option value="cancelled">❌ Отменен</option>
                </select>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
              >
                {isExporting ? '⏳ Экспортирую...' : '✅ Экспортировать'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition disabled:opacity-50 font-medium"
              >
                Отмена
              </button>
            </div>

            {/* Подсказка */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              Не указывайте даты, чтобы экспортировать все заказы
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
