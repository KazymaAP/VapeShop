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
 * 4. Токены хранятся в Redis/Upstash для персистентности на Vercel
 */

import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';

// Redis инициализация - используем Upstash для Vercel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null;

async function getRedis() {
  if (!redis) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = Redis.fromEnv();
    } catch {
      logger.error('⚠️ Upstash Redis not configured. CSRF tokens will be stored in memory (not persistent).');
      // Fallback to in-memory store
      return null;
    }
  }
  return redis;
}

interface CSRFStore {
  [key: string]: { token: string; timestamp: number };
}

// Fallback in-memory store (только если Redis недоступен)
const csrfStoreFallback: CSRFStore = {};
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Генерирует CSRF token для клиента
 * Вызывается один раз при загрузке страницы или запросе /api/csrf-token
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const data = JSON.stringify({ token, timestamp: Date.now() });
  
  try {
    const redisClient = await getRedis();
    if (redisClient) {
      // Сохраняем в Redis с TTL 24 часа
      await redisClient.setex(`csrf:${sessionId}`, 86400, data);
      return token;
    }
  } catch (error) {
    logger.error('Redis error in generateCSRFToken', { error: error instanceof Error ? error.message : String(error) });
  }
  
  // Fallback to memory
  csrfStoreFallback[sessionId] = {
    token,
    timestamp: Date.now(),
  };
  return token;
}

/**
 * Верифицирует CSRF token
 * Вызывается перед обработкой мутирующих операций
 */
export async function verifyCSRFToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const redisClient = await getRedis();
    if (redisClient) {
      const data = await redisClient.get(`csrf:${sessionId}`);
      if (!data) {
        logger.warn(`CSRF token not found for session ${sessionId}`);
        return false;
      }
      
      const stored = JSON.parse(data as string);
      
      // Проверяем время истечения
      if (Date.now() - stored.timestamp > CSRF_TOKEN_EXPIRY) {
        await redisClient.del(`csrf:${sessionId}`);
        logger.warn(`CSRF token expired for session ${sessionId}`);
        return false;
      }

      // Timing-safe сравнение
      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(stored.token, 'hex'),
          Buffer.from(token, 'hex')
        );
        if (isValid) {
          // Удаляем использованный токен
          await redisClient.del(`csrf:${sessionId}`);
        }
        return isValid;
      } catch {
        logger.warn(`Invalid CSRF token for session ${sessionId}`);
        return false;
      }
    }
  } catch {
    logger.error('Redis error in verifyCSRFToken');
  }
  
  // Fallback to memory
  const stored = csrfStoreFallback[sessionId];

  if (!stored) {
    logger.warn(`CSRF token not found for session ${sessionId}`);
    return false;
  }

  // Проверяем время истечения
  if (Date.now() - stored.timestamp > CSRF_TOKEN_EXPIRY) {
    delete csrfStoreFallback[sessionId];
    logger.warn(`CSRF token expired for session ${sessionId}`);
    return false;
  }

  // Timing-safe сравнение
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(stored.token, 'hex'),
      Buffer.from(token, 'hex')
    );

    if (isValid) {
      delete csrfStoreFallback[sessionId];
    }

    if (!isValid) {
      logger.warn(`Invalid CSRF token for session ${sessionId}`);
    }

    return isValid;
  } catch {
    logger.warn(`Invalid CSRF token for session ${sessionId}`);
    return false;
  }
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
      const sessionId =
        (req as unknown as Record<string, unknown>).telegramId || req.headers['x-session-id'];

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

      // Верифицируем токен (теперь async)
      const isValidToken = await verifyCSRFToken(String(sessionId), csrfToken);
      if (!isValidToken) {
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
 * Для Redis cleanup работает через TTL, здесь только для fallback store
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const sessionId in csrfStoreFallback) {
    if (now - csrfStoreFallback[sessionId].timestamp > CSRF_TOKEN_EXPIRY) {
      delete csrfStoreFallback[sessionId];
    }
  }
}

// Периодически очищаем старые токены в fallback store (раз в час)
setInterval(cleanupExpiredCSRFTokens, 60 * 60 * 1000);
