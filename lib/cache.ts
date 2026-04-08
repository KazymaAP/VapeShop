/**
 * Простая in-memory кэш система для критических запросов
 * 
 * ⚠️ ПРИМЕЧАНИЕ: Для production необходимо использовать Redis
 * Эта реализация пригодна для development и небольших deployment'ов только!
 * 
 * Использование:
 * 
 * const data = cache.get('categories');
 * if (!data) {
 *   const result = await query('SELECT * FROM categories WHERE is_active = true');
 *   cache.set('categories', result.rows, 3600); // TTL 1 час
 * }
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry>();

/**
 * Получить значение из кэша
 * 
 * @param key ключ кэша
 * @returns значение если существует и не испарилось, иначе null
 */
export function get<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Проверяем expiration
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.value as T;
}

/**
 * Установить значение в кэш
 * 
 * @param key ключ кэша
 * @param value значение
 * @param ttlSeconds время жизни в секундах (по умолчанию 5 минут)
 */
export function set<T>(key: string, value: T, ttlSeconds: number = 300): void {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  cacheStore.set(key, { value, expiresAt });
}

/**
 * Удалить значение из кэша
 * 
 * @param key ключ кэша
 */
export function del(key: string): void {
  cacheStore.delete(key);
}

/**
 * Очистить весь кэш
 */
export function clear(): void {
  cacheStore.clear();
}

/**
 * Получить или установить значение (get-or-set паттерн)
 * 
 * Используется для кэширования результата асинхронной функции:
 * 
 * const categories = await getOrSet(
 *   'categories',
 *   async () => {
 *     const result = await query('SELECT * FROM categories WHERE is_active = true');
 *     return result.rows;
 *   },
 *   3600 // TTL 1 час
 * );
 * 
 * @param key ключ кэша
 * @param fetcher асинхронная функция для получения значения если кэш пуст
 * @param ttlSeconds время жизни в секундах (по умолчанию 5 минут)
 * @returns закэшированное или новое значение
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = get<T>(key);
  
  if (cached !== null) {
    return cached;
  }
  
  const value = await fetcher();
  set(key, value, ttlSeconds);
  return value;
}

/**
 * Получить статистику кэша (для debug)
 */
export function getStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}

/**
 * Префиксы кэшей для организации
 */
export const CACHE_KEYS = {
  CATEGORIES: 'cache:categories',
  BRANDS: 'cache:brands',
  PRODUCTS_FEATURED: 'cache:products:featured',
  PRODUCTS_POPULAR: 'cache:products:popular',
  PRODUCTS_NEW: 'cache:products:new',
  PRODUCTS_PROMOTION: 'cache:products:promotion',
  PRODUCTS_HITS: 'cache:products:hits',
  SEARCH_SUGGESTIONS: 'cache:search:suggestions',
  LEADERBOARD: 'cache:leaderboard',
  STATS: 'cache:stats',
} as const;

// ⚠️ ПРИМЕЧАНИЕ: Все кэши сбрасываются при перезагрузке сервера (Node процесс)
// Для persistence нужна Redis или другое хранилище
