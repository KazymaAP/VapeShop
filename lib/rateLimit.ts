import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

// In-memory fallback store (когда Redis недоступна)
const storeFallback: RateLimitStore = {};
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 минута
const DEFAULT_MAX_REQUESTS = 10;

// Redis инициализация
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null;

async function getRedis() {
  if (!redis) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = Redis.fromEnv();
    } catch {
      logger.warn('⚠️ Upstash Redis not configured. Rate limiting will use in-memory store (not distributed).');
      return null;
    }
  }
  return redis;
}

/**
 * Реализация Rate Limiting через Redis (Upstash) для Vercel
 * С fallback на in-memory store
 *
 * Примеры использования:
 *
 * // Защитить endpoint от злоупотреблений
 * export default rateLimit(handler, { windowMs: 60000, max: 10 });
 *
 * // С ключом по telegram_id
 * export default rateLimit(handler, {
 *   windowMs: 60000,
 *   max: 5,
 *   keyGenerator: (req) => req.body.telegram_id
 * });
 */
export interface RateLimitOptions {
  windowMs?: number; // Временное окно в миллисекундах (по умолчанию 1 мин)
  max?: number; // Максимум запросов за временное окно (по умолчанию 10)
  keyGenerator?: (req: NextApiRequest) => string; // Функция для генерации ключа
  message?: string; // Сообщение об ошибке
  statusCode?: number; // HTTP статус код
}

function getKey(req: NextApiRequest, keyGen?: (req: NextApiRequest) => string): string {
  if (keyGen) {
    return keyGen(req);
  }
  // По умолчанию используем IP адрес
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
}

function cleanupFallback(now: number) {
  // Очистим старые записи раз в 5 минут
  if (Math.random() < 0.01) {
    for (const key in storeFallback) {
      if (storeFallback[key].resetTime <= now) {
        delete storeFallback[key];
      }
    }
  }
}

export function rateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: RateLimitOptions = {}
) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const max = options.max || DEFAULT_MAX_REQUESTS;
  const message = options.message || 'Слишком много запросов. Попробуйте позже.';
  const statusCode = options.statusCode || 429;
  const keyGenerator = options.keyGenerator;

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const now = Date.now();
    const key = getKey(req, keyGenerator);
    const redisKey = `ratelimit:${key}`;
    
    try {
      const redisClient = await getRedis();
      if (redisClient) {
        // Используем Redis для распределённого rate limiting
        const count = await redisClient.incr(redisKey);
        
        if (count === 1) {
          // Первый запрос в окне - установим TTL
          await redisClient.expire(redisKey, Math.ceil(windowMs / 1000));
        }
        
        const resetTime = now + windowMs;
        
        // Добавим заголовки для информирования клиента
        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());
        
        if (count > max) {
          return res.status(statusCode).json({
            error: message,
            retryAfter: Math.ceil(windowMs / 1000),
          });
        }
        
        // Все хорошо, вызовем исходный handler
        return await handler(req, res);
      }
    } catch (error) {
      logger.error('Redis error in rateLimit:', error);
      // Fallback to memory continue below
    }
    
    // Fallback: используем in-memory store
    cleanupFallback(now);

    if (!storeFallback[key]) {
      storeFallback[key] = { count: 0, resetTime: now + windowMs };
    }

    const record = storeFallback[key];

    if (now >= record.resetTime) {
      // Временное окно истекло, сбросим счётчик
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;

    // Добавим заголовки для информирования клиента
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
    res.setHeader('X-RateLimit-Reset', record.resetTime.toString());

    if (record.count > max) {
      return res.status(statusCode).json({
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    // Вызовем исходный handler
    return await handler(req, res);
  };
}

/**
 * Очистить данные rate limit для тестирования
 */
export function clearRateLimitStore() {
  for (const key in storeFallback) {
    delete storeFallback[key];
  }
}

// Предустановленные конфиги для разных типов API
export const RATE_LIMIT_PRESETS = {
  loose: { windowMs: 60 * 1000, max: 100 }, // 100 запросов в минуту
  normal: { windowMs: 60 * 1000, max: 60 }, // 60 запросов в минуту
  strict: { windowMs: 60 * 1000, max: 20 }, // 20 запросов в минуту
  veryStrict: { windowMs: 60 * 1000, max: 5 }, // 5 запросов в минуту
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 попыток за 15 минут
  order: { windowMs: 60 * 1000, max: 10 }, // 10 заказов в минуту
  search: { windowMs: 60 * 1000, max: 30 }, // 30 поисков в минуту
};
