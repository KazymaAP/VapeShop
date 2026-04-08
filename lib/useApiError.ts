/**
 * lib/useApiError.ts
 * Hook для обработки API ошибок с toast уведомлениями (MED-003)
 */

import { useCallback } from 'react';
import { useToast } from './toast';

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: Array<{ field: string; message: string }>;
  status?: number;
}

/**
 * Hook для безопасного API вызова с обработкой ошибок
 */
export function useApiError() {
  const { addToast } = useToast();

  const handleError = useCallback(
    async (response: Response, context?: string) => {
      const errorContext = context ? `[${context}] ` : '';

      try {
        const data: ApiErrorResponse = await response.json();

        if (data.details && Array.isArray(data.details)) {
          // Валидационные ошибки (400)
          const errorMessages = data.details.map((d) => `${d.field}: ${d.message}`).join('\n');
          addToast(`${errorContext}Ошибка валидации:\n${errorMessages}`, 'error');
        } else if (data.error || data.message) {
          addToast(`${errorContext}${data.error || data.message}`, 'error');
        } else {
          addToast(`${errorContext}Ошибка: ${response.status}`, 'error');
        }
      } catch {
        addToast(`${errorContext}Ошибка сервера (${response.status})`, 'error');
      }
    },
    [addToast]
  );

  return { handleError };
}

/**
 * Wrapper для fetch с автоматической обработкой ошибок
 * Примечание: должен использоваться только в компонентах через useApiError хук
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
