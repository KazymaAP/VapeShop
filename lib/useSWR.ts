/**
 * Кастомные SWR хуки для VapeShop
 * Обеспечивают кэширование и автоматическое обновление данных
 */

import useSWR, { SWRConfiguration } from 'swr';

export interface FetchOptions extends SWRConfiguration {
  params?: Record<string, unknown>;
}

// Дефолтный fetcher для SWR
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Конфигурация по умолчанию для разных типов данных
export const SWR_CONFIG = {
  products: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 60 сек
    focusThrottleInterval: 300000, // 5 мин
  },
  orders: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30 сек
  },
  user: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
    focusThrottleInterval: 600000, // 10 мин
  },
  stats: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 120000, // 2 мин
  },
};

// Типы для API ответов
interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: number;
}

interface ProductsResponse {
  items: Record<string, unknown>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Хук для получения товаров
export function useProducts(page = 1, limit = 20, options?: FetchOptions) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...options?.params,
  });

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<ProductsResponse>>(
    `/api/products?${params}`,
    fetcher,
    { ...SWR_CONFIG.products, ...options }
  );

  return {
    products: data?.data?.items || [],
    pagination: data?.data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

// Хук для получения заказов
export function useOrders(page = 1, limit = 20, options?: FetchOptions) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...options?.params,
  });

  interface OrdersResponse {
    orders: Record<string, unknown>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<OrdersResponse>>(
    `/api/admin/orders?${params}`,
    fetcher,
    { ...SWR_CONFIG.orders, ...options }
  );

  return {
    orders: data?.data?.orders || [],
    pagination: data?.data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

// Хук для профиля пользователя
export function useUserProfile(options?: FetchOptions) {
  interface UserResponse {
    id: number;
    telegram_id: number;
    first_name: string;
    username?: string;
    role: string;
  }

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<UserResponse>>(
    '/api/users/profile',
    fetcher,
    { ...SWR_CONFIG.user, ...options }
  );

  return {
    user: data?.data,
    isLoading,
    error,
    mutate,
  };
}

// Хук для избранного
export function useFavorites(options?: FetchOptions) {
  interface FavoritesResponse {
    products: Record<string, unknown>[];
  }

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<FavoritesResponse>>(
    '/api/favorites',
    fetcher,
    { ...SWR_CONFIG.products, ...options }
  );

  return {
    favorites: data?.data?.products || [],
    isLoading,
    error,
    mutate,
  };
}

// Хук для общей статистики
export function useStats(options?: FetchOptions) {
  interface StatsResponse {
    totalRevenue: number;
    ordersCount: number;
    customersCount: number;
    avgOrderValue: number;
  }

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<StatsResponse>>(
    '/api/admin/stats',
    fetcher,
    { ...SWR_CONFIG.stats, ...options }
  );

  return {
    stats: data?.data,
    isLoading,
    error,
    mutate,
  };
}

// Обобщённый хук SWR с правильной типизацией
export function useFetchData<T = unknown>(url: string | null, options?: FetchOptions) {
  const { data, error, isLoading, mutate } = useSWR<{ data: T }>(url, fetcher, {
    ...SWR_CONFIG.products,
    ...options,
  });

  return {
    data: data?.data,
    isLoading,
    error,
    mutate,
  };
}
