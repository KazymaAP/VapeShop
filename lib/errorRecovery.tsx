/**
 * Error Recovery компоненты и утилиты
 */

import { useState } from 'react';

interface RetryableErrorProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function RetryableError({
  message,
  onRetry,
  isRetrying = false,
  action,
  className = ''
}: RetryableErrorProps) {
  return (
    <div
      className={`
        bg-danger/10 border border-danger/30 rounded-lg p-4
        flex items-center justify-between gap-4
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="text-danger font-medium">{message}</p>
          <p className="text-sm text-textSecondary">Пожалуйста, попробуйте ещё раз или свяжитесь с поддержкой</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="px-4 py-2 bg-danger text-white rounded-lg font-medium hover:bg-danger/90 disabled:opacity-50 transition"
          aria-label="Повторить"
        >
          {isRetrying ? '⏳ Повтор...' : 'Повторить'}
        </button>

        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 border border-danger text-danger rounded-lg font-medium hover:bg-danger/5 transition"
            aria-label={action.label}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook для exponential backoff retry логики
 */
interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export function useRetry(fn: () => Promise<any>, options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const retry = async () => {
    setIsRetrying(true);
    setError(null);

    for (let i = 0; i < maxAttempts; i++) {
      try {
        setAttempt(i + 1);
        await fn();
        setIsRetrying(false);
        setAttempt(0);
        return true;
      } catch (err) {
        setError(err as Error);

        if (i < maxAttempts - 1) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            initialDelay * Math.pow(backoffFactor, i),
            maxDelay
          );

          // Визуальный feedback на UI (опционально)
          console.log(`Retry attempt ${i + 1} in ${delay}ms`);

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    setIsRetrying(false);
    return false;
  };

  return { retry, isRetrying, attempt, error };
}

/**
 * Hook для обработки сетевых ошибок с retry
 */
export function useFetchWithRetry<T>(
  url: string,
  options: RetryOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => Promise<boolean>;
  isRetrying: boolean;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFn = async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    setData(json.data || json);
    setError(null);
  };

  const { retry, isRetrying, error: retryError } = useRetry(fetchFn, options);

  const executeRetry = async () => {
    setLoading(true);
    const success = await retry();
    setLoading(false);
    if (!success) {
      setError(retryError);
    }
    return success;
  };

  // Initial load
  useEffect(() => {
    executeRetry();
  }, [url]);

  return {
    data,
    loading,
    error: error || retryError,
    retry: executeRetry,
    isRetrying
  };
}

import { useEffect } from 'react';
