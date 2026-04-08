/**
 * Хук для безопасного fetch запроса с обработкой ошибок
 * Автоматически обрабатывает ошибки сети и неправильные ответы
 */

import { useState, useCallback } from 'react';

export interface UseFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | unknown;
  onError?: (error: Error) => void;
  onSuccess?: (data: unknown) => void;
}

export interface UseFetchState {
  data: unknown;
  error: Error | null;
  loading: boolean;
}

export function useFetch<T = unknown>(url: string, options?: UseFetchOptions) {
  const [state, setState] = useState<UseFetchState>({
    data: null,
    error: null,
    loading: false,
  });

  const fetch = useCallback(
    async (opts?: UseFetchOptions): Promise<T | null> => {
      setState({ data: null, error: null, loading: true });

      const mergedOptions = { ...options, ...opts };

      try {
        // Add AbortController for timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        // url всегда строка в этом хуке
        const response = await window.fetch(url, {
          method: mergedOptions.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...mergedOptions.headers,
          },
          body: mergedOptions.body ? JSON.stringify(mergedOptions.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Проверяем статус ответа
        if (!response.ok) {
          let errorMessage = `HTTP Error: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Если не можем распарсить JSON, используем по умолчанию
          }
          throw new Error(errorMessage);
        }

        // Пытаемся распарсить JSON
        let data: T;
        try {
          data = await response.json();
        } catch {
          throw new Error('Invalid JSON response');
        }

        setState({ data, error: null, loading: false });

        if (mergedOptions.onSuccess) {
          mergedOptions.onSuccess(data);
        }

        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState({ data: null, error, loading: false });

        if (mergedOptions.onError) {
          mergedOptions.onError(error);
        }

        return null;
      }
    },
    [url, options]
  );

  return { ...state, fetch };
}

/**
 * Утилита для безопасного fetch без React
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: UseFetchOptions
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(url, {
      method: options?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Если не можем распарсить JSON, используем по умолчанию
      }
      throw new Error(errorMessage);
    }

    const data: T = await response.json();

    if (options?.onSuccess) {
      options.onSuccess(data);
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (options?.onError) {
      options.onError(error);
    }

    return { data: null, error };
  }
}
