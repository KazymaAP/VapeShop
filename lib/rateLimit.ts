import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 минута
const DEFAULT_MAX_REQUESTS = 10;

/**
 * Простая реализация Rate Limiting через память
 * Для production используйте Redis!
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

function cleanup(now: number) {
  // Очистим старые записи раз в 5 минут
  if (Math.random() < 0.01) {
    for (const key in store) {
      if (store[key].resetTime <= now) {
        delete store[key];
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
    cleanup(now);

    const key = getKey(req, keyGenerator);

    if (!store[key]) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    const record = store[key];

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
  for (const key in store) {
    delete store[key];
  }
}
