import { NextApiRequest, NextApiResponse } from 'next';
import { query } from './db';
import crypto from 'crypto';

export type UserRole = 'admin' | 'manager' | 'seller' | 'buyer';

/**
 * Извлекает telegram_id из запроса
 * Приоритет:
 * 1. Заголовок X-Telegram-Id (для админки и тестирования)
 * 2. initData из query или headers (от Telegram WebApp)
 */
export async function getTelegramIdFromRequest(req: NextApiRequest): Promise<number | null> {
  try {
    // 1. Проверяем заголовок X-Telegram-Id (админка)
    const headerTelegramId = req.headers['x-telegram-id'];
    if (headerTelegramId) {
      const id = parseInt(headerTelegramId as string, 10);
      if (!isNaN(id)) {
        return id;
      }
    }

    // 2. Пытаемся получить initData из query или headers
    // От Telegram WebApp может прийти как в query ?initData=..., 
    // так и в headers Authorization: Bearer <initData>
    let initData: string | null = null;

    // Из query параметров
    if (req.query.initData) {
      initData = Array.isArray(req.query.initData) 
        ? req.query.initData[0] 
        : req.query.initData;
    }

    // Из заголовка Authorization
    if (!initData && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        initData = authHeader.substring(7);
      }
    }

    // Если у нас есть initData, пытаемся его распарсить
    if (initData) {
      const user = parseInitData(initData);
      if (user?.id) {
        return user.id;
      }
    }

    return null;
  } catch (err) {
    console.error('getTelegramIdFromRequest error:', err);
    return null;
  }
}

/**
 * Простой парсер initData от Telegram WebApp
 * На production ОБЯЗАТЕЛЬНО добавить верификацию подписи HMAC-SHA256
 * 
 * Формат initData: user=%7B%22id%22%3A123456789...
 * 
 * TODO: Добавить верификацию подписи:
 * const bot_token = process.env.TELEGRAM_BOT_TOKEN;
 * const secret_key = crypto.createHmac('sha256', 'WebAppData').update(bot_token).digest();
 * const data_check_string = Object.entries(data)
 *   .sort()
 *   .map(([k, v]) => `${k}=${v}`)
 *   .join('\n');
 * const hash = crypto.createHmac('sha256', secret_key).update(data_check_string).digest('hex');
 * if (hash !== data.hash) { throw new Error('Invalid signature'); }
 */
function parseInitData(initData: string): { id: number } | null {
  try {
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
    console.error('parseInitData error:', err);
    return null;
  }
}

/**
 * Получает роль пользователя из БД
 */
export async function getUserRole(telegramId: number): Promise<UserRole | null> {
  try {
    const result = await query(
      'SELECT role FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].role as UserRole;
  } catch (err) {
    console.error('getUserRole error:', err);
    return null;
  }
}

/**
 * Проверяет, заблокирован ли пользователь
 */
export async function isUserBlocked(telegramId: number): Promise<boolean> {
  try {
    const result = await query(
      'SELECT is_blocked FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return false; // Если пользователя нет, не блокируем
    }

    return result.rows[0].is_blocked === true;
  } catch (err) {
    console.error('isUserBlocked error:', err);
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
      (req as any).telegramId = telegramId;

      // 5. Вызываем оригинальный handler
      return await handler(req, res);
    } catch (err) {
      console.error('requireAuth error:', err);
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
  return (req as any).telegramId || 0;
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
    return { allowed: false, reason: `Недостаточно прав. Требуемые роли: ${allowedRoles.join(', ')}` };
  }

  return { allowed: true };
}
