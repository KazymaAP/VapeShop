import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import AdminSidebar from '../../components/AdminSidebar';
import { fetchWithAuth } from '../../lib/frontend/auth';

interface PriceImportItem {
  id: string;
  name: string;
  specification: string | null;
  quantity: number;
  tier1_price: number;
  tier2_price: number;
  tier3_price: number;
  distributor_price: number;
  is_activated: boolean;
  created_at: string;
}

interface PaginationData {
  items: PriceImportItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type FilterType = 'all' | 'active' | 'inactive';

export async function getServerSideProps() {
  return { props: {} };
}

/**
 * AdminPriceImport - страница просмотра импортированных товаров
 *
 * Отображает все импортированные товары с фильтрацией по статусу активации,
 * поиском и возможностью удаления неактивированных товаров.
 */
export default function AdminPriceImport() {
  const { user } = useTelegramWebApp();
  const [items, setItems] = useState<PriceImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchItems(1, filter);
  }, [user, filter]);

  const fetchItems = async (pageNum: number, filterVal: FilterType) => {
    setLoading(true);
    setError('');
    try {
      let query = `/api/admin/price-import?page=${pageNum}&limit=20&sort=created_at&order=desc`;

      if (filterVal === 'active') query += '&is_activated=true';
      if (filterVal === 'inactive') query += '&is_activated=false';

      if (search) query += `&search=${encodeURIComponent(search)}`;

      const res = await fetchWithAuth(query);
      if (!res.ok) throw new Error('Ошибка при загрузке товаров');
      const data: PaginationData = await res.json();
      setItems(data.items);
      setTotalPages(data.pages);
      setTotalCount(data.total);
      setPage(pageNum);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || 'Ошибка при загрузке товаров');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

    setDeleting(id);
    setDeleteError('');
    try {
      const res = await fetchWithAuth(`/api/admin/price-import/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Ошибка при удалении');
      }
      setItems(items.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setDeleteError(error.message || 'Ошибка при удалении товара');
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    // Debounce search - in real app would use useCallback with timeout
  };

  const statusBadge = (isActivated: boolean) => {
    if (isActivated) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
          ✓ Активирован
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning">
        ⏳ Ожидание
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Импортированные товары</h1>
          <p className="text-textSecondary text-sm mt-1">Всего: {totalCount} товаров</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/20 border border-danger/50 rounded-2xl text-danger text-sm">
            {error}
          </div>
        )}

        {deleteError && (
          <div className="mb-6 p-4 bg-danger/20 border border-danger/50 rounded-2xl text-danger text-sm">
            {deleteError}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['all', 'active', 'inactive'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-neon text-white'
                  : 'bg-cardBg border border-border text-textPrimary hover:border-neon/50'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Неактивные'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full md:w-80 bg-cardBg border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon transition-colors"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-cardBg border border-border rounded-2xl p-4 skeleton h-16"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-cardBg border border-border rounded-2xl p-12 text-center">
            <p className="text-textSecondary mb-2">Товаров не найдено</p>
            <p className="text-textSecondary/60 text-sm">
              {search ? 'Измените критерии поиска' : 'Импортируйте товары в разделе "Импорт CSV"'}
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto mb-6">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Название
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Характеристика
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Tier1/2/3 (₽)
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Дистр.цена (₽)
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Остаток
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Статус
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 hover:bg-bgDark/50 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-textPrimary font-medium text-sm max-w-xs truncate">
                            {item.name}
                          </p>
                          <p className="text-textSecondary text-xs mt-1">
                            ID: {item.id.slice(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-textSecondary text-sm max-w-xs truncate">
                          {item.specification || '—'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-neon font-mono space-y-1">
                          <div>{item.tier1_price.toLocaleString('ru-RU')}</div>
                          <div>{item.tier2_price.toLocaleString('ru-RU')}</div>
                          <div>{item.tier3_price.toLocaleString('ru-RU')}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-textSecondary font-mono text-sm">
                          {item.distributor_price.toLocaleString('ru-RU')}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-sm font-medium ${
                            item.quantity > 0 ? 'text-success' : 'text-warning'
                          }`}
                        >
                          {item.quantity} шт
                        </span>
                      </td>
                      <td className="p-4">{statusBadge(item.is_activated)}</td>
                      <td className="p-4">
                        {!item.is_activated && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deleting === item.id}
                            className="px-3 py-2 bg-danger/20 border border-danger/50 text-danger rounded-lg text-xs font-medium hover:bg-danger/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {deleting === item.id ? '⏳' : '🗑️ Удалить'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={() => fetchItems(page - 1, filter)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-cardBg border border-border rounded-lg text-textPrimary text-sm hover:border-neon/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Предыдущая
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const startPage = Math.max(1, page - 3);
                  return startPage + i;
                }).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchItems(p, filter)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-neon text-white'
                        : 'bg-cardBg border border-border text-textPrimary hover:border-neon/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {totalPages > 7 && page < totalPages - 3 && (
                  <>
                    <span className="text-textSecondary">...</span>
                    <button
                      onClick={() => fetchItems(totalPages, filter)}
                      className="w-10 h-10 rounded-lg text-sm font-medium bg-cardBg border border-border text-textPrimary hover:border-neon/50 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => fetchItems(page + 1, filter)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-cardBg border border-border rounded-lg text-textPrimary text-sm hover:border-neon/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Следующая →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
