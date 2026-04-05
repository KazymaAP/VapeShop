/**
 * CSRF защита для Next.js API
 *
 * Для Telegram Mini App у нас уже есть верификация Telegram через HMAC,
 * но всё равно нужна CSRF защита для пользовательских форм.
 *
 * Стратегия:
 * 1. Все мутирующие операции (POST, PUT, DELETE) требуют CSRF token
 * 2. CSRF token генерируется на фронте и отправляется в X-CSRF-Token заголовке
 * 3. На бэке проверяется соответствие токена с сессией пользователя
 */

import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';

interface CSRFStore {
  [key: string]: { token: string; timestamp: number };
}

const csrfStore: CSRFStore = {};
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Генерирует CSRF token для клиента
 * Вызывается один раз при загрузке страницы или запросе /api/csrf-token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfStore[sessionId] = {
    token,
    timestamp: Date.now(),
  };
  return token;
}

/**
 * Верифицирует CSRF token
 * Вызывается перед обработкой мутирующих операций
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfStore[sessionId];

  if (!stored) {
    console.warn(`CSRF token not found for session ${sessionId}`);
    return false;
  }

  // Проверяем время истечения
  if (Date.now() - stored.timestamp > CSRF_TOKEN_EXPIRY) {
    delete csrfStore[sessionId];
    console.warn(`CSRF token expired for session ${sessionId}`);
    return false;
  }

  // Timing-safe сравнение
  const isValid = crypto.timingSafeEqual(
    Buffer.from(stored.token, 'hex'),
    Buffer.from(token, 'hex')
  );

  if (!isValid) {
    console.warn(`Invalid CSRF token for session ${sessionId}`);
  }

  return isValid;
}

/**
 * Middleware для проверки CSRF токена на мутирующих операциях
 *
 * Использование:
 * export default withCSRFProtection(handler, ['POST', 'PUT', 'DELETE']);
 */
export function withCSRFProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  protectedMethods: string[] = ['POST', 'PUT', 'DELETE', 'PATCH']
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (protectedMethods.includes(req.method || '')) {
      // Получаем session ID (telegram ID пользователя)
      const sessionId = (req as unknown as Record<string, unknown>).telegramId || req.headers['x-session-id'];

      if (!sessionId) {
        return res.status(401).json({ error: 'No session ID found' });
      }

      // Получаем CSRF token из заголовка
      const csrfToken = req.headers['x-csrf-token'] as string;

      if (!csrfToken) {
        return res.status(403).json({
          error: 'CSRF token missing',
          message: 'X-CSRF-Token header required for this operation',
        });
      }

      // Верифицируем токен
      if (!verifyCSRFToken(String(sessionId), csrfToken)) {
        return res.status(403).json({
          error: 'Invalid CSRF token',
          message: 'CSRF token validation failed',
        });
      }
    }

    return await handler(req, res);
  };
}

/**
 * Очистить старые CSRF tokens (вызывается периодически)
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const sessionId in csrfStore) {
    if (now - csrfStore[sessionId].timestamp > CSRF_TOKEN_EXPIRY) {
      delete csrfStore[sessionId];
    }
  }
}

// Периодически очищаем старые токены (раз в час)
setInterval(cleanupExpiredCSRFTokens, 60 * 60 * 1000);
