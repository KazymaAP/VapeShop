import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ⚠️ КРИТИЧНО: используем текущего пользователя, игнорируем telegram_id из query
    const currentTelegramId = await getTelegramIdFromRequest(req);

    if (!currentTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query('SELECT * FROM users WHERE telegram_id = $1', [currentTelegramId]);

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
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
}
