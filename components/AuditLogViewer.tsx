/**
 * Компонент для просмотра журнала аудита (audit_log)
 * Доступен только для admin и manager
 */

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { SkeletonLoader, OrderCardSkeleton } from './SkeletonLoader';
import clsx from 'clsx';

interface AuditLog {
  id: number;
  user_telegram_id: number;
  action: string;
  table_name: string;
  record_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: number;
}

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  LOGIN: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{
    action?: string;
    table?: string;
    user?: string;
  }>({});

  // Построение URL с параметрами
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(filter.action && { action: filter.action }),
    ...(filter.table && { table: filter.table }),
    ...(filter.user && { user: filter.user }),
  });

  const { data, isLoading, error } = useSWR<AuditLogsResponse>(
    `/api/admin/audit-logs?${queryParams}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 минута
    }
  );

  const logs = data?.data.logs || [];
  const total = data?.data.total || 0;
  const totalPages = data?.data.totalPages || 1;

  // Вычисляем таблицы и действия из логов
  const tables = useMemo(() => {
    const unique = new Set(logs.map((log) => log.table_name));
    return Array.from(unique);
  }, [logs]);

  const actions = useMemo(() => {
    const unique = new Set(logs.map((log) => log.action));
    return Array.from(unique);
  }, [logs]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800">
        <p className="text-red-800 dark:text-red-200">❌ Ошибка загрузки логов: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Журнал аудита</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Всего записей: {total}</p>
      </div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        {/* Фильтр по действию */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Действие
          </label>
          <select
            value={filter.action || ''}
            onChange={(e) => {
              setFilter({ ...filter, action: e.target.value || undefined });
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Все</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        {/* Фильтр по таблице */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Таблица
          </label>
          <select
            value={filter.table || ''}
            onChange={(e) => {
              setFilter({ ...filter, table: e.target.value || undefined });
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Все</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>

        {/* Фильтр по пользователю */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ID пользователя
          </label>
          <input
            type="text"
            placeholder="Введите Telegram ID"
            value={filter.user || ''}
            onChange={(e) => {
              setFilter({ ...filter, user: e.target.value || undefined });
              setPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Таблица логов */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Время
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Пользователь
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Действие
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Таблица
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                ID записи
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                Изменения
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Логи не найдены
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-800 transition"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">
                    {log.user_telegram_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-block px-2 py-1 rounded-full text-xs font-medium',
                        ACTION_COLORS[log.action as keyof typeof ACTION_COLORS] ||
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      )}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {log.table_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                    {log.record_id}
                  </td>
                  <td className="px-4 py-3">
                    {log.old_values || log.new_values ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 dark:text-blue-400 hover:underline">
                          Показать
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 rounded dark:bg-gray-700 text-xs font-mono overflow-auto max-h-40">
                          {log.old_values && (
                            <div className="mb-2">
                              <strong className="text-red-600 dark:text-red-400">Было:</strong>
                              <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <strong className="text-green-600 dark:text-green-400">Стало:</strong>
                              <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Страница {page} из {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ← Назад
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 dark:border-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Далее →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
