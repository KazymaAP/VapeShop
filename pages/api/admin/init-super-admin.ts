/**
 * API для инициализации первого super_admin
 * POST /api/admin/init-super-admin
 * 
 * Используется для создания первого super_admin.
 * Требует TELEGRAM_SUPER_ADMIN_ID из переменных окружения для верификации.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Требуем админ права для инициализации super_admin
    const authResult = await requireAuth(req, res, ['super_admin', 'admin']);
    if (!authResult) return;

    const { telegramId, password } = req.body;

    // ⚠️ Требуем переменную окружения для инициализации
    const envPassword = process.env.SUPER_ADMIN_INIT_PASSWORD;

    if (!envPassword || !password || password !== envPassword) {
      return res.status(403).json({ 
        error: 'Unauthorized. Требуется SUPER_ADMIN_INIT_PASSWORD.' 
      });
    }

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }

    // Проверяем, есть ли уже super_admin
    const existingSuper = await query(
      'SELECT telegram_id FROM users WHERE role = $1 LIMIT 1',
      ['super_admin']
    );

    if (existingSuper.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Super admin already exists',
        existing_id: existingSuper.rows[0].telegram_id
      });
    }

    // Проверяем, есть ли пользователь
    const user = await query(
      'SELECT telegram_id, role FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Назначаем роль super_admin
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *`,
      ['super_admin', telegramId]
    );

    // Логируем операцию
    await query(
      `INSERT INTO admin_logs (user_telegram_id, action, details, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [telegramId, 'SUPER_ADMIN_INIT', JSON.stringify({ 
        previous_role: user.rows[0].role,
        new_role: 'super_admin' 
      })]
    ).catch(() => {});

    return res.status(200).json({
      message: 'Super admin initialized successfully',
      user: result.rows[0],
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Super admin init error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize super admin' });
  }
}
