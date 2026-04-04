/**
 * Компонент поиска с автодополнением
 * Показывает список товаров при вводе
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import clsx from 'clsx';

interface SearchProduct {
  id: number;
  name: string;
  price: number;
  image_url?: string;
}

interface SearchResult {
  success: boolean;
  data: SearchProduct[];
  timestamp: number;
}

export function SearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce запроса к API (0.3 сек)
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setHighlightedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Загрузка результатов поиска
  const { data: searchData } = useSWR<SearchResult>(
    debouncedQuery ? `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8` : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const results = searchData?.data || [];

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          const product = results[highlightedIndex];
          router.push(`/product/${product.id}`);
          setIsOpen(false);
          setQuery('');
        } else if (query) {
          router.push(`/products?search=${encodeURIComponent(query)}`);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Input */}
      <form onSubmit={handleSearch} className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="🔍 Поиск товаров..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) {
              setIsOpen(true);
            }
          }}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Поиск товаров"
          aria-describedby="search-help"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
        />
        <span id="search-help" className="sr-only">Введите минимум 2 символа для поиска товаров. Используйте стрелки вверх/вниз для навигации, Enter для выбора.</span>

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          role="listbox"
          id="search-results"
        >
          {query.length < 2 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Введите минимум 2 символа для поиска
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Товары не найдены
            </div>
          ) : (
            <>
              {/* Результаты поиска */}
              {results.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                >
                  <div
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer transition',
                      highlightedIndex === index
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    {/* Изображение */}
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}

                    {/* Информация о товаре */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {product.price} ₽
                      </div>
                    </div>

                    {/* Стрелка */}
                    <span className="text-gray-400 dark:text-gray-600">→</span>
                  </div>
                </Link>
              ))}

              {/* Кнопка "Показать все результаты" */}
              <button
                onClick={handleSearch}
                className="w-full px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-100 dark:border-gray-800 transition"
                aria-label={`Показать все результаты поиска (${results.length}+)`}
              >
                Показать все результаты ({results.length}+)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
