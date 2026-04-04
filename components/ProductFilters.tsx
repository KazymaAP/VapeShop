/**
 * Компонент для фильтрации товаров по типам, брендам, ценовому диапазону
 */

import { useState, useCallback } from 'react';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface ProductFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  brands?: FilterOption[];
  categories?: FilterOption[];
  priceRange?: { min: number; max: number };
}

export interface FilterState {
  brands: string[];
  categories: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
}

export function ProductFilters({
  onFilterChange,
  brands = [],
  categories = [],
  priceRange = { min: 0, max: 10000 },
}: ProductFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    categories: [],
    priceMin: priceRange.min,
    priceMax: priceRange.max,
  });

  const updateFilter = useCallback((newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  }, [filters, onFilterChange]);

  const toggleBrand = (brandId: string) => {
    const updated = filters.brands.includes(brandId)
      ? filters.brands.filter(id => id !== brandId)
      : [...filters.brands, brandId];
    updateFilter({ brands: updated });
  };

  const toggleCategory = (categoryId: string) => {
    const updated = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId];
    updateFilter({ categories: updated });
  };

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-textPrimary mb-3">Цена</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.priceMin}
              onChange={e => updateFilter({ priceMin: Number(e.target.value) })}
              className="w-24 px-2 py-1 bg-bgDark border border-border rounded text-textPrimary"
              placeholder="От"
            />
            <span className="text-textSecondary">-</span>
            <input
              type="number"
              value={filters.priceMax}
              onChange={e => updateFilter({ priceMax: Number(e.target.value) })}
              className="w-24 px-2 py-1 bg-bgDark border border-border rounded text-textPrimary"
              placeholder="До"
            />
            <span className="text-textSecondary text-sm">₽</span>
          </div>
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            value={filters.priceMax}
            onChange={e => updateFilter({ priceMax: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="font-semibold text-textPrimary mb-3">Бренд</h3>
          <div className="space-y-2">
            {brands.map(brand => (
              <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:bg-bgDark p-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                  className="w-4 h-4 accent-neon"
                />
                <span className="text-sm text-textPrimary">{brand.label}</span>
                {brand.count && (
                  <span className="text-xs text-textSecondary ml-auto">({brand.count})</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="font-semibold text-textPrimary mb-3">Категория</h3>
          <div className="space-y-2">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-bgDark p-2 rounded">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="w-4 h-4 accent-neon"
                />
                <span className="text-sm text-textPrimary">{cat.label}</span>
                {cat.count && (
                  <span className="text-xs text-textSecondary ml-auto">({cat.count})</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stock & Sale */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer hover:bg-bgDark p-2 rounded">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={e => updateFilter({ inStock: e.target.checked })}
            className="w-4 h-4 accent-neon"
          />
          <span className="text-sm text-textPrimary">Только в наличии</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer hover:bg-bgDark p-2 rounded">
          <input
            type="checkbox"
            checked={filters.onSale}
            onChange={e => updateFilter({ onSale: e.target.checked })}
            className="w-4 h-4 accent-neon"
          />
          <span className="text-sm text-textPrimary">Со скидкой</span>
        </label>
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          setFilters({
            brands: [],
            categories: [],
            priceMin: priceRange.min,
            priceMax: priceRange.max,
          });
          onFilterChange({
            brands: [],
            categories: [],
            priceMin: priceRange.min,
            priceMax: priceRange.max,
          });
        }}
        className="w-full px-3 py-2 bg-border text-textSecondary rounded hover:bg-border/80 transition text-sm"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
