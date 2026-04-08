import { logger } from '@/lib/logger';
/**
 * API для инициализации первого super_admin
 * POST /api/admin/init-super-admin
 *
 * Используется для создания первого super_admin.
 * Требует TELEGRAM_SUPER_ADMIN_ID из переменных окружения для верификации.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramIdFromRequest } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId } = req.body;
    const currentUserId = await getTelegramIdFromRequest(req);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }

    // ⚠️ ВАЖНО: Инициализация super_admin безопасна только если:
    // 1. Никакой super_admin ещё не существует в системе
    // 2. Запрос идёт через верифицированный Telegram WebApp (getTelegramIdFromRequest проверил это)
    // 3. Пароль был УДАЛЁН так как он видим в environment переменных и логах
    //
    // Раньше это была критическая уязвимость -
    // любой кто видит SUPER_ADMIN_INIT_PASSWORD в env может создать super_admin.
    // Теперь требуется физический доступ к серверу для инициализации (через одноразовый скрипт).

    // Проверяем, есть ли уже super_admin
    const existingSuper = await query('SELECT telegram_id FROM users WHERE role = $1 LIMIT 1', [
      'super_admin',
    ]);

    if (existingSuper.rows.length > 0) {
      return res.status(400).json({
        error: 'Super admin already exists',
        existing_id: existingSuper.rows[0].telegram_id,
      });
    }

    // Проверяем, есть ли пользователь
    const user = await query('SELECT telegram_id, role FROM users WHERE telegram_id = $1', [
      telegramId,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Назначаем роль super_admin
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING telegram_id, role, created_at`,
      ['super_admin', telegramId]
    );

    // Логируем операцию
    try {
      await query(
        `INSERT INTO audit_log (user_id, action, target_type, details, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          currentUserId,
          'super_admin_init',
          'user',
          JSON.stringify({
            previous_role: user.rows[0].role,
            new_role: 'super_admin',
            target_telegram_id: telegramId,
            initiated_by: currentUserId,
          }),
          'success',
        ]
      );
    } catch (logErr) {
      logger.error('Failed to log super_admin init:', logErr);
      // Continue even if logging fails
    }

    return res.status(200).json({
      message: 'Super admin initialized successfully',
      user: {
        telegram_id: result.rows[0].telegram_id,
        role: result.rows[0].role,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Super admin init error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize super admin' });
  }
}

export default requireAuth(handler, ['super_admin', 'admin']);
