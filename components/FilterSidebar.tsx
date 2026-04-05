/**
 * Боковая панель с фильтрами для каталога товаров
 * Фильтры: категория, бренд, цена, наличие
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import useSWR from 'swr';

interface FilterSidebarProps {
  onFilterChange?: (filters: FilterState) => void;
  className?: string;
}

export interface FilterState {
  category?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
}

interface Category {
  id: number;
  name: string;
  product_count?: number;
}

interface Brand {
  id: number;
  name: string;
  product_count?: number;
}

interface FiltersData {
  categories: Category[];
  brands: Brand[];
  priceRange: {
    min: number;
    max: number;
  };
}

export function FilterSidebar({ onFilterChange, className }: FilterSidebarProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Загрузка доступных фильтров
  const { data: filtersData } = useSWR<{ success: boolean; data: FiltersData }>(
    '/api/products/filters',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load filters');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  // Синхронизация фильтров с URL параметрами
  useEffect(() => {
    const newFilters: FilterState = {};
    if (router.query.category) newFilters.category = String(router.query.category);
    if (router.query.brand) newFilters.brand = String(router.query.brand);
    if (router.query.priceMin) newFilters.priceMin = Number(router.query.priceMin);
    if (router.query.priceMax) newFilters.priceMax = Number(router.query.priceMax);
    if (router.query.inStock) newFilters.inStock = router.query.inStock === 'true';
    setFilters(newFilters);
  }, [router.query]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);

    // Обновление URL параметров
    const query = { ...router.query };
    Object.keys(newFilters).forEach((key) => {
      const value = newFilters[key as keyof FilterState];
      if (value !== undefined && value !== null && value !== '') {
        query[key] = String(value);
      } else {
        delete query[key];
      }
    });

    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true }
    );
  };

  const resetFilters = () => {
    setFilters({});
    router.push(router.pathname, undefined, { shallow: true });
    onFilterChange?.({});
  };

  const data = filtersData?.data;
  const categories = data?.categories || [];
  const brands = data?.brands || [];
  const priceRange = data?.priceRange || { min: 0, max: 10000 };

  return (
    <>
      {/* Мобильная кнопка открытия */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-medium flex items-center justify-between"
          aria-expanded={isExpanded}
          aria-controls="filters-panel"
          aria-label="Открыть фильтры поиска"
        >
          🔍 Фильтры
          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
        </button>
      </div>

      {/* Панель фильтров */}
      <aside
        id="filters-panel"
        className={clsx(
          'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-6',
          'md:sticky md:top-4 md:h-fit max-h-[80vh] overflow-y-auto',
          className,
          isExpanded ? 'block' : 'hidden md:block'
        )}
        role="region"
        aria-label="Фильтры поиска"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Фильтры</h3>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              aria-label="Сбросить все фильтры"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Категории */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm uppercase tracking-wide">
              Категория
            </h4>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value={category.id}
                    checked={filters.category === String(category.id)}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        category: e.target.checked ? String(e.target.value) : undefined,
                      })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600">
                    {category.name}
                  </span>
                  {category.product_count && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      ({category.product_count})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Бренды */}
        {brands.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm uppercase tracking-wide">
              Бренд
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {brands.map((brand) => (
                <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    value={brand.id}
                    checked={filters.brand === String(brand.id)}
                    onChange={(e) =>
                      handleFilterChange({
                        ...filters,
                        brand: e.target.checked ? String(e.target.value) : undefined,
                      })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600">
                    {brand.name}
                  </span>
                  {brand.product_count && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      ({brand.product_count})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Диапазон цены */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm uppercase tracking-wide">
            Цена
          </h4>
          <div className="space-y-2">
            {/* Input Min */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">От (₽)</label>
              <input
                type="number"
                placeholder={String(priceRange.min)}
                value={filters.priceMin || ''}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    priceMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              />
            </div>

            {/* Input Max */}
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">До (₽)</label>
              <input
                type="number"
                placeholder={String(priceRange.max)}
                value={filters.priceMax || ''}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    priceMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* В наличии */}
        <label className="flex items-center gap-2 cursor-pointer p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <input
            type="checkbox"
            checked={filters.inStock === true}
            onChange={(e) =>
              handleFilterChange({
                ...filters,
                inStock: e.target.checked ? true : undefined,
              })
            }
            className="rounded accent-blue-600"
          />
          <span className="text-gray-900 dark:text-white font-medium">✅ Только в наличии</span>
        </label>

        {/* Применить фильтры (мобильный) */}
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full md:hidden px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Применить фильтры
        </button>
      </aside>
    </>
  );
}
