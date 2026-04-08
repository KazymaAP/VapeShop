import { useState, useEffect } from 'react';
import { useTelegramWebApp } from '../../lib/telegram';
import { PAGINATION } from '../../lib/constants';
import AdminSidebar from '../../components/AdminSidebar';
import ActivationModal from '../../components/ActivationModal';
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
  created_at: string;
}

interface PaginationData {
  items: PriceImportItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export async function getServerSideProps() {
  return { props: {} };
}

/**
 * AdminActivate - страница активации товаров
 *
 * Отображает таблицу неактивированных товаров и позволяет
 * их активировать с выбором цены, категории, бренда и изображений.
 */
export default function AdminActivate() {
  const { user } = useTelegramWebApp();
  const [items, setItems] = useState<PriceImportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProductIds, setModalProductIds] = useState<string[]>([]);
  const [modalPrices, setModalPrices] = useState({
    tier1: null as number | null,
    tier2: null as number | null,
    tier3: null as number | null,
    distributor: null as number | null,
  });

  useEffect(() => {
    if (!user) return;
    fetchItems(1);
  }, [user]);

  const fetchItems = async (pageNum: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(
        `/api/admin/price-import?is_activated=false&page=${pageNum}&limit=${PAGINATION.DEFAULT_LIMIT}`
      );
      if (!res.ok) throw new Error('Ошибка при загрузке товаров');
      const data: PaginationData = await res.json();
      setItems(data.items);
      setTotalPages(data.pages);
      setTotalCount(data.total);
      setPage(pageNum);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке товаров';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const openActivationModal = (itemIds: string[], item?: PriceImportItem) => {
    setModalProductIds(itemIds);
    if (item) {
      setModalPrices({
        tier1: item.tier1_price,
        tier2: item.tier2_price,
        tier3: item.tier3_price,
        distributor: item.distributor_price,
      });
    } else if (items.length > 0) {
      const firstItem = items[0];
      setModalPrices({
        tier1: firstItem.tier1_price,
        tier2: firstItem.tier2_price,
        tier3: firstItem.tier3_price,
        distributor: firstItem.distributor_price,
      });
    }
    setModalOpen(true);
  };

  const handleActivateSelected = () => {
    if (selectedIds.size === 0) {
      setError('Выберите товары для активации');
      return;
    }
    openActivationModal(Array.from(selectedIds));
  };

  const handleModalSuccess = () => {
    fetchItems(1);
  };

  return (
    <div className="flex min-h-screen bg-bgDark">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6">
        <div className="mb-6 mt-10 md:mt-0">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Активация товаров</h1>
          <p className="text-textSecondary text-sm mt-1">
            Всего: {totalCount} товаров · Страница {page} из {totalPages}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/20 border border-danger/50 rounded-2xl text-danger text-sm">
            {error}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="mb-6 p-4 bg-neon/10 border border-neon/40 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <span className="text-neon font-medium">Выбрано: {selectedIds.size} товаров</span>
            <button
              onClick={handleActivateSelected}
              className="bg-gradient-to-r from-[#7c3aed] to-neon rounded-full px-6 py-2.5 text-sm text-white font-medium hover:opacity-90 transition-opacity"
            >
              Активировать выбранные ({selectedIds.size})
            </button>
          </div>
        )}

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
            <p className="text-textSecondary mb-2">Нет неактивированных товаров</p>
            <p className="text-textSecondary/60 text-sm">
              Все товары уже активированы или импорт не выполнен
            </p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-cardBg border border-border rounded-2xl overflow-x-auto mb-6">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Название
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Характеристика
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Tier1/2/3
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Дистр.цена
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Остаток
                    </th>
                    <th className="p-4 text-left text-xs uppercase tracking-wider text-neon">
                      Действие
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
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <p className="text-textPrimary font-medium text-sm">{item.name}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-textSecondary text-sm max-w-xs truncate">
                          {item.specification || '—'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-neon font-mono space-y-1">
                          <div>T1: {item.tier1_price.toLocaleString('ru-RU')} ₽</div>
                          <div>T2: {item.tier2_price.toLocaleString('ru-RU')} ₽</div>
                          <div>T3: {item.tier3_price.toLocaleString('ru-RU')} ₽</div>
                        </div>
                      </td>
                      <td className="p-4 text-textSecondary text-sm">
                        {item.distributor_price.toLocaleString('ru-RU')} ₽
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
                      <td className="p-4">
                        <button
                          onClick={() => openActivationModal([item.id], item)}
                          className="px-3 py-2 bg-gradient-to-r from-[#7c3aed] to-neon rounded-lg text-white text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Активировать
                        </button>
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
                  onClick={() => fetchItems(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-cardBg border border-border rounded-lg text-textPrimary text-sm hover:border-neon/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Предыдущая
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchItems(p)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-neon text-white'
                        : 'bg-cardBg border border-border text-textPrimary hover:border-neon/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => fetchItems(page + 1)}
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

      {/* Activation Modal */}
      <ActivationModal
        productIds={modalProductIds}
        tier1Price={modalPrices.tier1}
        tier2Price={modalPrices.tier2}
        tier3Price={modalPrices.tier3}
        distributorPrice={modalPrices.distributor}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
