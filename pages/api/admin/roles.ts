/**
 * API для управления ролями пользователей (только для super_admin)
 * GET /api/admin/roles - список пользователей с фильтром по роли
 * POST /api/admin/roles - изменить роль пользователя
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse, ApiError } from '@/types/api';

type ApiResp = ApiResponse | ApiError;

const VALID_ROLES = ['customer', 'admin', 'manager', 'courier', 'support', 'seller', 'buyer'];

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const telegramId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      const { role, limit = 50, offset = 0 } = req.query;

      // 🔒 Безопасная валидация роли
      const params: (string | number)[] = [Number(limit), Number(offset)];
      let where = '';

      if (role && role !== 'all') {
        // Преобразуем role в строку (может быть string или string[])
        const roleStr = Array.isArray(role) ? role[0] : role;

        // Проверяем, что роль находится в списке разрешённых
        if (!VALID_ROLES.includes(roleStr)) {
          return res
            .status(400)
            .json({ success: false, error: 'Invalid role filter', timestamp: Date.now() });
        }
        where = 'WHERE role = $3';
        params.push(roleStr);
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

      return res.status(200).json({
        success: true,
        data: result.rows,
        message: `${result.rows.length} users found`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Users fetch error:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to fetch users', timestamp: Date.now() });
    }
  }

  if (req.method === 'POST') {
    try {
      const { userId, newRole } = req.body;

      if (!userId || !newRole) {
        return res
          .status(400)
          .json({ success: false, error: 'userId and newRole required', timestamp: Date.now() });
      }

      // ⚠️ Валидация role
      if (!VALID_ROLES.includes(newRole)) {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid role', timestamp: Date.now() });
      }

      // Проверяем существование пользователя
      const user = await query(`SELECT telegram_id FROM users WHERE telegram_id = $1`, [userId]);

      if (user.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: 'User not found', timestamp: Date.now() });
      }

      // Обновляем роль
      const result = await query(
        `UPDATE users SET role = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *`,
        [newRole, userId]
      );

      // Логируем операцию
      await query(
        `INSERT INTO audit_log (user_id, action, target_type, details, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [telegramId, 'USER_ROLE_CHANGE', JSON.stringify({ target_user: userId, new_role: newRole })]
      ).catch(() => {});

      return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: 'Role updated successfully',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Role update error:', err);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to update role', timestamp: Date.now() });
    }
  }

  return res
    .status(405)
    .json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
}

export default rateLimit(requireAuth(handler, ['super_admin']), RATE_LIMIT_PRESETS.veryStrict);
