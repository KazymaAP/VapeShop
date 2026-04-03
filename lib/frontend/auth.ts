/**
 * Фронтенд утилиты для работы с аутентификацией
 * Используются в админке и других местах для отправки Telegram ID на бэкенд
 */

/**
 * Возвращает заголовки с информацией о пользователе для API запросов
 * Извлекает Telegram ID из Telegram WebApp API
 * 
 * Используется в админке для защиты API эндпоинтов
 * 
 * Пример использования:
 * const headers = getTelegramIdHeader();
 * const res = await fetch('/api/admin/products', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json', ...headers },
 *   body: JSON.stringify(data)
 * });
 */
export function getTelegramIdHeader(): Record<string, string> {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    if (!user || !user.id) {
      console.warn('getTelegramIdHeader: Telegram user not found');
      return {};
    }

    return {
      'X-Telegram-Id': String(user.id),
    };
  } catch (err) {
    console.error('getTelegramIdHeader error:', err);
    return {};
  }
}

/**
 * Возвращает заголовки с initData для авторизации через Telegram WebApp
 * 
 * Используется для будущей верификации подписи на бэкенде
 * (когда перейдём на полную верификацию HMAC-SHA256)
 * 
 * Пример использования:
 * const headers = getInitDataHeader();
 * const res = await fetch('/api/orders', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json', ...headers },
 *   body: JSON.stringify(data)
 * });
 */
export function getInitDataHeader(): Record<string, string> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    
    if (!initData) {
      console.warn('getInitDataHeader: Telegram initData not found');
      return {};
    }

    return {
      'Authorization': `Bearer ${initData}`,
    };
  } catch (err) {
    console.error('getInitDataHeader error:', err);
    return {};
  }
}

/**
 * Получает Telegram ID текущего пользователя из WebApp API
 */
export function getCurrentTelegramId(): number | null {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return user?.id || null;
  } catch (err) {
    console.error('getCurrentTelegramId error:', err);
    return null;
  }
}

/**
 * Получает информацию о текущем пользователе из Telegram WebApp API
 */
export function getCurrentUser() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

/**
 * Проверяет, находимся ли мы в Telegram Mini App
 */
export function isInTelegramApp(): boolean {
  try {
    return !!window.Telegram?.WebApp;
  } catch {
    return false;
  }
}

/**
 * Обёртка для fetch с автоматическим добавлением заголовков Telegram ID
 * 
 * Используется вместо обычного fetch для автоматической отправки ID
 * 
 * Пример:
 * const res = await fetchWithAuth('/api/admin/products', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  // Добавляем заголовок с Telegram ID
  const telegramHeaders = getTelegramIdHeader();
  Object.entries(telegramHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Версия fetchWithAuth, которая также обрабатывает ошибки авторизации
 * 
 * Пример:
 * const data = await fetchWithAuthAndHandle('/api/admin/products', {
 *   method: 'GET',
 *   onUnauthorized: () => router.push('/login'),
 *   onForbidden: () => console.error('Insufficient permissions')
 * });
 */
export async function fetchWithAuthAndHandle(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    onUnauthorized?: () => void;
    onForbidden?: () => void;
    onError?: (err: any) => void;
  } = {}
): Promise<any> {
  try {
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const res = await fetchWithAuth(url, fetchOptions);

    // Обрабатываем ошибки авторизации
    if (res.status === 401) {
      options.onUnauthorized?.();
      throw new Error('Unauthorized');
    }

    if (res.status === 403) {
      options.onForbidden?.();
      throw new Error('Forbidden');
    }

    if (!res.ok) {
      const error = await res.json();
      throw error;
    }

    return await res.json();
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}
