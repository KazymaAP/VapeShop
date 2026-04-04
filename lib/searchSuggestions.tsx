/**
 * Search Suggestions with localStorage history
 */

const SEARCH_HISTORY_KEY = 'vapeShop_searchHistory';
const MAX_HISTORY_ITEMS = 10;

/**
 * Управление историей поиска в localStorage
 */
export class SearchHistory {
  static save(query: string) {
    if (!query.trim()) return;

    const history = this.getAll();
    const filtered = history.filter(item => item.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save search history:', e);
    }
  }

  static getAll(): string[] {
    try {
      const data = localStorage.getItem(SEARCH_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear search history:', e);
    }
  }

  static remove(query: string) {
    const history = this.getAll();
    const filtered = history.filter(item => item !== query);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to remove from search history:', e);
    }
  }
}

/**
 * React Hook для Search Suggestions
 */
import { useState, useEffect, useRef } from 'react';

interface Suggestion {
  type: 'history' | 'product' | 'category';
  label: string;
  value: string;
  icon?: string;
}

export function useSearchSuggestions(query: string, products: any[] = []) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) {
      // Показываем историю если input пуст
      const history = SearchHistory.getAll();
      setSuggestions(
        history.map(item => ({
          type: 'history' as const,
          label: item,
          value: item,
          icon: '🕐'
        }))
      );
      return;
    }

    // Debounce поиска
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const lower = query.toLowerCase();

      // Фильтруем товары
      const productSuggestions = products
        .filter(p => p.name?.toLowerCase().includes(lower))
        .slice(0, 5)
        .map(p => ({
          type: 'product' as const,
          label: p.name,
          value: p.id,
          icon: '📦'
        }));

      // История (отфильтрованная по query)
      const history = SearchHistory.getAll();
      const historySuggestions = history
        .filter(item => item.toLowerCase().includes(lower))
        .slice(0, 3)
        .map(item => ({
          type: 'history' as const,
          label: item,
          value: item,
          icon: '🕐'
        }));

      setSuggestions([...historySuggestions, ...productSuggestions]);
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, products]);

  return suggestions;
}

/**
 * Компонент для отображения search suggestions
 */
interface SearchSuggestionsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  onRemoveHistory?: (value: string) => void;
}

export function SearchSuggestions({
  suggestions,
  onSelect,
  onRemoveHistory
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-cardBg border border-border rounded-lg shadow-lg overflow-hidden">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.type}-${suggestion.value}-${index}`}
          className="px-4 py-2 hover:bg-border cursor-pointer flex items-center justify-between group transition"
          onClick={() => onSelect(suggestion)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{suggestion.icon}</span>
            <span className="text-textPrimary">{suggestion.label}</span>
          </div>

          {suggestion.type === 'history' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveHistory?.(suggestion.value);
              }}
              className="opacity-0 group-hover:opacity-100 transition text-textSecondary hover:text-danger"
              aria-label={`Удалить "${suggestion.label}" из истории`}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
