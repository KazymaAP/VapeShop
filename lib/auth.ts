import { NextApiRequest, NextApiResponse } from 'next';
import { query } from './db';
import crypto from 'crypto';
import { logger } from './logger';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'support'
  | 'courier'
  | 'seller'
  | 'customer'
  | 'buyer';

/**
 * Извлекает telegram_id из запроса с ОБЯЗАТЕЛЬНОЙ верификацией
 *
 * ⚠️ КРИТИЧНО: Всегда требуется верификация initData через HMAC!
 * X-Telegram-Id заголовок используется только для локального тестирования,
 * в production должна использоваться только подписанная initData.
 *
 * Приоритет:
 * 1. initData из заголовка Authorization или query (от Telegram WebApp) — ВЕРИФИЦИРОВАННАЯ
 * 2. X-Telegram-Id заголовок ТОЛЬКО если NODE_ENV !== 'production' (для разработки)
 */
export async function getTelegramIdFromRequest(req: NextApiRequest): Promise<number | null> {
  try {
    // 1. Получаем initData из query или headers (от Telegram WebApp)
    let initData: string | null = null;

    // Из query параметров
    if (req.query.initData) {
      initData = Array.isArray(req.query.initData) ? req.query.initData[0] : req.query.initData;
    }

    // Из заголовка Authorization
    if (!initData && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        initData = authHeader.substring(7);
      }
    }

    // Если у нас есть initData, пытаемся его верифицировать и распарсить
    if (initData) {
      const user = parseInitData(initData);
      if (user?.id) {
        return user.id;
      }
    }

    // 2. Fallback для локальной разработки: X-Telegram-Id заголовок
    // ⚠️ ЭТО ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ! В production должно быть отключено.
    if (process.env.NODE_ENV !== 'production') {
      const headerTelegramId = req.headers['x-telegram-id'];
      if (headerTelegramId) {
        const id = parseInt(headerTelegramId as string, 10);
        if (!isNaN(id)) {
          logger.warn(
            `ПРЕДУПРЕЖДЕНИЕ: Используется X-Telegram-Id для тестирования. ` +
              `На production это должно быть отключено. Telegram ID: ${id}`
          );
          return id;
        }
      }
    }

    return null;
  } catch (err) {
    logger.error('getTelegramIdFromRequest error', err);
    return null;
  }
}

/**
 * Верифицирует подпись HMAC-SHA256 для initData от Telegram WebApp
 *
 * ⚠️ ОБЯЗАТЕЛЬНАЯ защита на production!
 *
 * Формат initData: user=%7B%22id%22%3A123456789...&hash=abc123...
 *
 * Процесс верификации:
 * 1. Получить secret_key из bot token (HMAC-SHA256 с ключом 'WebAppData')
 * 2. Собрать data_check_string из всех параметров кроме 'hash'
 * 3. Вычислить hash (HMAC-SHA256 с secret_key)
 * 4. Сравнить с полученным hash (timing-safe сравнение)
 *
 * @param initData URL-encoded строка с параметрами от Telegram WebApp
 * @returns true если подпись верна, false иначе
 */
export function verifyTelegramInitData(initData: string): boolean {
  try {
    const bot_token = process.env.TELEGRAM_BOT_TOKEN;

    if (!bot_token) {
      logger.error('TELEGRAM_BOT_TOKEN not found in environment');
      return false;
    }

    // Парсим параметры
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const auth_date_str = params.get('auth_date');

    if (!hash) {
      logger.error('No hash found in initData');
      return false;
    }

    // Проверка возраста данных (24 часа максимум)
    if (auth_date_str) {
      const auth_date = parseInt(auth_date_str, 10);
      const current_time = Math.floor(Date.now() / 1000);
      const max_age = 24 * 60 * 60; // 24 hours in seconds

      if (current_time - auth_date > max_age) {
        logger.warn('initData expired', {
          auth_date,
          current_time,
          age_seconds: current_time - auth_date,
        });
        return false;
      }
    } else {
      logger.warn('auth_date not found in initData');
      return false;
    }

    // Создаём secret_key: HMAC-SHA256 от bot_token с ключом 'WebAppData'
    const secret_key = crypto.createHmac('sha256', 'WebAppData').update(bot_token).digest();

    // Собираем data_check_string из параметров (кроме hash), отсортированные
    const data_check_array: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        data_check_array.push(`${key}=${value}`);
      }
    });
    data_check_array.sort();
    const data_check_string = data_check_array.join('\n');

    // Вычисляем ожидаемый hash
    const computed_hash = crypto
      .createHmac('sha256', secret_key)
      .update(data_check_string)
      .digest('hex');

    // Сравниваем (используем timing-safe сравнение для защиты от timing attacks)
    const receivedHashBuffer = Buffer.from(hash, 'hex');
    const computedHashBuffer = Buffer.from(computed_hash, 'hex');

    // Проверка длины буферов перед сравнением
    if (receivedHashBuffer.length !== computedHashBuffer.length) {
      logger.warn('Hash length mismatch. Possible tampering attempt.');
      return false;
    }

    const isValid = crypto.timingSafeEqual(computedHashBuffer, receivedHashBuffer);

    if (!isValid) {
      logger.warn('Invalid initData signature detected', { computed_hash, received_hash: hash });
    }

    return isValid;
  } catch (err) {
    logger.error('verifyTelegramInitData error', err);
    return false;
  }
}

/**
 * Парсер initData от Telegram WebApp с верификацией подписи
 *
 * Формат initData: user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22John%22%7D&chat_instance=...&hash=...
 *
 * Возвращает распарсенные данные пользователя или null если подпись невалидна
 */
function parseInitData(initData: string): { id: number } | null {
  try {
    // Сначала проверяем подпись
    if (!verifyTelegramInitData(initData)) {
      logger.error('initData verification failed');
      return null;
    }

    // initData приходит в формате URL-encoded строки
    // Пример: user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22John%22%7D&chat_instance=...

    const params = new URLSearchParams(initData);
    const userParam = params.get('user');

    if (!userParam) {
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userParam));

    if (user?.id && typeof user.id === 'number') {
      return { id: user.id };
    }

    return null;
  } catch (err) {
    logger.error('parseInitData error', err);
    return null;
  }
}

/**
 * Получает роль пользователя из БД
 */
export async function getUserRole(telegramId: number): Promise<UserRole | null> {
  try {
    const result = await query('SELECT role FROM users WHERE telegram_id = $1', [telegramId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].role as UserRole;
  } catch (err) {
    logger.error('getUserRole error', err);
    return null;
  }
}

/**
 * Проверяет, заблокирован ли пользователь
 */
export async function isUserBlocked(telegramId: number): Promise<boolean> {
  try {
    const result = await query('SELECT is_blocked FROM users WHERE telegram_id = $1', [telegramId]);

    if (result.rows.length === 0) {
      return false; // Если пользователя нет, не блокируем
    }

    return result.rows[0].is_blocked === true;
  } catch (err) {
    logger.error('isUserBlocked error', err);
    return false;
  }
}

/**
 * Проверяет, что пользователь имеет одну из допустимых ролей
 */
export async function hasRequiredRole(
  telegramId: number,
  allowedRoles: UserRole[]
): Promise<boolean> {
  const role = await getUserRole(telegramId);
  return role !== null && allowedRoles.includes(role);
}

/**
 * Middleware для защиты API эндпоинтов
 *
 * Использование:
 * export default requireAuth(handler, ['admin', 'manager']);
 *
 * Где handler - стандартный Next.js API handler
 *
 * Проверяет:
 * 1. telegramId существует
 * 2. Пользователь не заблокирован
 * 3. Роль входит в allowedRoles
 *
 * Если проверка не пройдена, возвращает 401 или 403 с ошибкой
 */
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  allowedRoles: UserRole[] = ['admin']
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. Получаем telegramId
      const telegramId = await getTelegramIdFromRequest(req);

      if (!telegramId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Не найдена информация о пользователе',
        });
      }

      // 2. Проверяем, заблокирован ли пользователь
      const blocked = await isUserBlocked(telegramId);
      if (blocked) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Ваш аккаунт был заблокирован',
        });
      }

      // 3. Проверяем роль
      const hasRole = await hasRequiredRole(telegramId, allowedRoles);
      if (!hasRole) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Недостаточно прав. Требуемые роли: ${allowedRoles.join(', ')}`,
        });
      }

      // 4. Добавляем telegramId в req для использования в handler
      (req as { telegramId?: number }).telegramId = telegramId;

      // 5. Вызываем оригинальный handler
      return await handler(req, res);
    } catch (err) {
      logger.error('requireAuth error', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Ошибка при проверке прав доступа',
      });
    }
  };
}

/**
 * Вспомогательная функция для получения telegramId из req
 * Используется внутри handler после requireAuth
 *
 * Пример:
 * export default requireAuth(async (req, res) => {
 *   const telegramId = getTelegramId(req);
 *   // ...
 * }, ['admin']);
 */
export function getTelegramId(req: NextApiRequest): number {
  return (req as { telegramId?: number }).telegramId || 0;
}

/**
 * Проверяет, является ли пользователь super-администратором
 */
export async function isSuperAdmin(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['super_admin']);
}

/**
 * Проверяет, является ли пользователь администратором (admin или super_admin)
 */
export async function isAdmin(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['admin', 'super_admin']);
}

/**
 * Проверяет, является ли пользователь менеджером
 */
export async function isManager(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['manager']);
}

/**
 * Проверяет, является ли пользователь сотрудником поддержки
 */
export async function isSupport(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['support']);
}

/**
 * Проверяет, является ли пользователь курьером
 */
export async function isCourier(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['courier']);
}

/**
 * Проверяет, является ли пользователь обычным покупателем
 */
export async function isCustomer(telegramId: number): Promise<boolean> {
  return hasRequiredRole(telegramId, ['customer', 'buyer']);
}

/**
 * Проверка доступа к эндпоинту без middleware
 * Используется, если нужна более гибкая проверка внутри handler
 *
 * Пример:
 * const telegramId = await getTelegramIdFromRequest(req);
 * if (!telegramId || !(await hasRequiredRole(telegramId, ['admin']))) {
 *   return res.status(403).json({ error: 'Forbidden' });
 * }
 */
export async function checkAccess(
  telegramId: number | null,
  allowedRoles: UserRole[]
): Promise<{ allowed: boolean; reason?: string }> {
  if (!telegramId) {
    return { allowed: false, reason: 'Не найдена информация о пользователе' };
  }

  const blocked = await isUserBlocked(telegramId);
  if (blocked) {
    return { allowed: false, reason: 'Аккаунт заблокирован' };
  }

  const hasRole = await hasRequiredRole(telegramId, allowedRoles);
  if (!hasRole) {
    return {
      allowed: false,
      reason: `Недостаточно прав. Требуемые роли: ${allowedRoles.join(', ')}`,
    };
  }

  return { allowed: true };
}

/**
 * ⚠️ КРИТИЧНО: Проверка CRON_SECRET с protection от timing attacks
 * Использование:
 * if (!verifyCronSecret(req)) return res.status(401).json({ error: 'Unauthorized' });
 *
 * Поддерживает:
 * - заголовок X-Cron-Secret
 * - query параметр token
 * - header Authorization Bearer
 */
export function verifyCronSecret(req: NextApiRequest): boolean {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length === 0) {
    logger.error('CRON_SECRET not configured');
    return false;
  }

  // Получаем token из разных мест
  let providedToken: string | null = null;

  // 1. Из заголовка X-Cron-Secret
  const headerToken = req.headers['x-cron-secret'];
  if (headerToken && typeof headerToken === 'string') {
    providedToken = headerToken;
  }

  // 2. Из query параметра token (для Vercel Crons)
  if (!providedToken && req.query.token) {
    providedToken = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  }

  // 3. Из заголовка Authorization: Bearer <token>
  if (!providedToken && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.substring(7);
    }
  }

  if (!providedToken) {
    logger.warn('No CRON token provided');
    return false;
  }

  // Constant-time сравнение для защиты от timing attacks
  try {
    const providedBuffer = Buffer.from(providedToken);
    const expectedBuffer = Buffer.from(process.env.CRON_SECRET);

    // Проверяем длину (защита от информации о длине)
    if (providedBuffer.length !== expectedBuffer.length) {
      logger.warn('CRON token length mismatch');
      return false;
    }

    // Constant-time сравнение
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (err) {
    logger.error('CRON token verification error', err);
    return false;
  }
}
