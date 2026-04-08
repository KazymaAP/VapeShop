import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest, requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const currentTelegramId = await getTelegramIdFromRequest(req);

    if (!currentTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Получить текущую роль пользователя
      const result = await query('SELECT role FROM users WHERE telegram_id = $1', [
        currentTelegramId,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ role: result.rows[0].role });
    }

    if (req.method === 'PUT') {
      // ⚠️ КРИТИЧНО: Пользователь может менять роль только себе (фронтенд не доверяем)
      // Изменение ролей других пользователей должно быть только в админ-панели
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'Missing required field: role' });
      }

      const validRoles = ['admin', 'manager', 'seller', 'customer', 'support', 'courier'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Пользователь может менять только некритичные данные своего профиля
      // Назначение админских ролей должно быть только через админ-панель (pages/api/admin/users.ts)
      const blockedRoles = ['admin', 'manager', 'super_admin', 'support'];
      if (blockedRoles.includes(role)) {
        // ⚠️ ИСПРАВЛЕНО: Логируем попытку нарушения безопасности в транзакции
        await transaction(async (client) => {
          await client.query(
            `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [
              currentTelegramId,
              'USER_ROLE_UPDATE_BLOCKED',
              `Attempted to assign blocked role: ${role}`,
            ]
          ).catch(() => {}); // Ignore logging errors
        });

        return res.status(403).json({ error: 'Cannot assign this role via user endpoint' });
      }

      // Теперь обновляем роль и логируем в транзакции
      await transaction(async (client) => {
        await client.query('UPDATE users SET role = $1 WHERE telegram_id = $2', [role, currentTelegramId]);

        // И логируем успешное изменение
        await client.query(
          `INSERT INTO audit_log (user_telegram_id, action, details, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [currentTelegramId, 'USER_ROLE_UPDATE', `Changed role to: ${role}`]
        ).catch(() => {}); // Ignore logging errors
      });

      res.status(200).json({ success: true, role });
    }
  } catch (err) {
    logger.error('Role update error:', err);
    res.status(500).json({ error: 'Ошибка обновления роли' });
  }
}

export default requireAuth(handler);
