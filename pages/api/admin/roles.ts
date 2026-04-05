/**
 * API для управления ролями пользователей (только для super_admin)
 * GET /api/admin/roles - список пользователей с фильтром по роли
 * POST /api/admin/roles - изменить роль пользователя
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse } from '@/types/api';

const VALID_ROLES = ['customer', 'admin', 'manager', 'courier', 'support', 'seller', 'buyer'];

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const telegramId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      const { role, limit = 50, offset = 0 } = req.query;

      // 🔒 Безопасная валидация роли
      const params: (string | number)[] = [Number(limit), Number(offset)];
      let where = '';

      if (role && role !== 'all') {
        // Проверяем, что роль находится в списке разрешённых
        if (!VALID_ROLES.includes(role as string)) {
          return res.status(400).json({ error: 'Invalid role filter' });
        }
        where = 'WHERE role = $3';
        params.push(role);
      }

      const result = await query(
        `SELECT 
           telegram_id,
           first_name,
           last_name,
           username,
           role,
           created_at,
           updated_at
         FROM users
         ${where}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        where ? params : params.slice(0, 2)
      );

      const countParams = where ? [role] : [];
      const totalResult = await query(`SELECT COUNT(*) as count FROM users ${where}`, countParams);

      return res.status(200).json({
        data: result.rows,
        total: parseInt(totalResult.rows[0].count),
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (err) {
      console.error('Users fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { userId, newRole } = req.body;

      if (!userId || !newRole) {
        return res.status(400).json({ error: 'userId and newRole required' });
      }

      // ⚠️ Валидация role
      if (!VALID_ROLES.includes(newRole)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Проверяем существование пользователя
      const user = await query(`SELECT telegram_id FROM users WHERE telegram_id = $1`, [userId]);

      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Обновляем роль
      const result = await query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *`,
        [newRole, userId]
      );

      // Логируем операцию
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [telegramId, 'USER_ROLE_CHANGE', JSON.stringify({ target_user: userId, new_role: newRole })]
      ).catch(() => {});

      return res.status(200).json({
        data: result.rows[0],
        message: 'Role updated successfully',
      });
    } catch (err) {
      console.error('Role update error:', err);
      return res.status(500).json({ error: 'Failed to update role' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default rateLimit(requireAuth(handler, ['super_admin']), RATE_LIMIT_PRESETS.veryStrict);
