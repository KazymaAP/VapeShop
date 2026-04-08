import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentTelegramId = await getTelegramIdFromRequest(req);

  if (!currentTelegramId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    return handleGet(currentTelegramId, res);
  } else if (req.method === 'PATCH' || req.method === 'PUT') {
    return handleUpdate(currentTelegramId, req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(telegramId: number, res: NextApiResponse) {
  try {
    const result = await query(
      'SELECT telegram_id, first_name, last_name, username, role, is_blocked, email, phone, created_at, updated_at FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Не возвращаем чувствительные данные
    const user = result.rows[0];
    const safeUser = {
      telegram_id: user.telegram_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      role: user.role,
      is_blocked: user.is_blocked,
      created_at: user.created_at,
    };

    res.status(200).json(safeUser);
  } catch (err) {
    logger.error('Get profile error:', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
}

/**
 * PATCH /api/users/profile
 * Обновить профиль текущего пользователя
 * Разрешено обновлять: first_name, last_name, username
 */
async function handleUpdate(telegramId: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { first_name, last_name, username } = req.body;

    // Валидация входных данных
    if (first_name !== undefined && (typeof first_name !== 'string' || first_name.length === 0)) {
      return res.status(400).json({
        error: 'Validation error',
        details: { first_name: 'Имя должно быть строкой' },
      });
    }

    if (last_name !== undefined && typeof last_name !== 'string') {
      return res.status(400).json({
        error: 'Validation error',
        details: { last_name: 'Фамилия должна быть строкой' },
      });
    }

    if (username !== undefined && (typeof username !== 'string' || username.length < 3)) {
      return res.status(400).json({
        error: 'Validation error',
        details: { username: 'Username должен быть минимум 3 символа' },
      });
    }

    // Проверяем, что пользователь существует
    const userCheck = await query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Построение UPDATE запроса (обновляем только указанные поля)
    const updateFields: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex++}`);
      params.push(first_name);
    }

    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex++}`);
      params.push(last_name);
    }

    if (username !== undefined) {
      updateFields.push(`username = $${paramIndex++}`);
      params.push(username);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Не указаны поля для обновления' });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(telegramId);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE telegram_id = $${paramIndex} RETURNING telegram_id, first_name, last_name, username, role, created_at`;

    const result = await query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Failed to update profile' });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Профиль обновлён',
    });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
}
