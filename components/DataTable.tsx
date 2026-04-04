/**
 * Компонент для сортировки и фильтрации таблиц
 * Поддерживает: click на заголовок, фильтры, поиск
 */

import { useState, useMemo } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  searchableFields?: (keyof T)[];
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  selectable = false,
  onSelectionChange,
  searchableFields = [],
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Обработка сортировки
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      // Переключаем направление
      setSortDirection(
        sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc'
      );
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Фильтрованные и отсортированные данные
  const processedData = useMemo(() => {
    let result = [...data];

    // Фильтрация по поиску
    if (searchTerm && searchableFields.length > 0) {
      result = result.filter(row =>
        searchableFields.some(field =>
          String(row[field])
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    // Сортировка
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, searchableFields, sortColumn, sortDirection]);

  // Обработка выделения
  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(processedData.map(row => row.id));
      setSelectedRows(newSelected);
      onSelectionChange?.(Array.from(newSelected));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      {searchableFields.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-bgDark border border-border rounded-lg text-textPrimary placeholder-textSecondary focus:outline-none focus:border-neon"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary">
            🔍
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full">
          <thead className="bg-cardBg border-b border-border">
            <tr>
              {/* Checkbox столбец */}
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === processedData.length && processedData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-neon"
                  />
                </th>
              )}

              {/* Заголовки столбцов */}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={`px-4 py-3 text-left text-sm font-semibold text-textPrimary ${
                    column.sortable ? 'cursor-pointer hover:bg-bgDark' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-textSecondary"
                >
                  Нет данных
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border hover:bg-cardBg transition ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${rowIndex % 2 === 0 ? 'bg-bgDark' : ''}`}
                >
                  {/* Checkbox */}
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 cursor-pointer accent-neon"
                      />
                    </td>
                  )}

                  {/* Ячейки данных */}
                  {columns.map(column => (
                    <td
                      key={String(column.key)}
                      className="px-4 py-3 text-sm text-textPrimary"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      {selectedRows.size > 0 && (
        <div className="text-sm text-textSecondary">
          Выбрано: {selectedRows.size} / {processedData.length}
        </div>
      )}
    </div>
  );
}
