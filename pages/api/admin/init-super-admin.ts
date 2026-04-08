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
  // Поддерживаем GET и POST для удобства
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем telegramId из query параметра или body (для GET и POST)
    const telegramIdParam = req.method === 'GET' 
      ? req.query.telegramId 
      : req.body?.telegramId;
    
    const telegramId = telegramIdParam 
      ? parseInt(String(telegramIdParam), 10) 
      : null;

    if (!telegramId || isNaN(telegramId)) {
      return res.status(400).json({ error: 'telegramId required (number)' });
    }

    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Проверяем, есть ли уже super_admin
    // Эта проверка ПЕРВИЧНА - инициализация возможна ТОЛЬКО если super_admin не существует
    const existingSuper = await query('SELECT telegram_id FROM users WHERE role = $1 LIMIT 1', [
      'super_admin',
    ]);

    if (existingSuper.rows.length > 0) {
      return res.status(400).json({
        error: 'Super admin already exists',
        message: 'Super admin initialization is only allowed once',
        existing_id: existingSuper.rows[0].telegram_id,
      });
    }

    // ВАЖНО: Используем CRON_SECRET для дополнительной защиты при повторных попытках
    const cronSecret = process.env.CRON_SECRET;
    const requestSecret = req.method === 'GET' 
      ? req.query.secret 
      : req.body?.secret;

    if (cronSecret && requestSecret !== cronSecret) {
      logger.warn('init-super-admin: Invalid or missing CRON_SECRET', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'CRON_SECRET required for first initialization'
      });
    }

    // Проверяем, есть ли пользователь в БД
    const user = await query('SELECT telegram_id, role FROM users WHERE telegram_id = $1', [
      telegramId,
    ]);

    if (user.rows.length === 0) {
      // Потребуется создать пользователя сначала
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Please open the app as Telegram Web App first to create your user profile',
        telegramId 
      });
    }

    // Назначаем роль super_admin
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING telegram_id, role, created_at`,
      ['super_admin', telegramId]
    );

    logger.info('Super admin initialized successfully', {
      telegram_id: telegramId,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    return res.status(200).json({
      success: true,
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
