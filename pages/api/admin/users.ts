import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search } = req.query;
      let whereClause = '';
      const params: unknown[] = [];

      if (search) {
        whereClause = `WHERE u.first_name ILIKE $1 OR u.username ILIKE $1 OR u.telegram_id::text LIKE $1`;
        params.push(`%${search}%`);
      }

      const result = await query(
        `SELECT u.*, COUNT(o.id) as orders_count
         FROM users u
         LEFT JOIN orders o ON u.telegram_id = o.user_telegram_id
         ${whereClause}
         GROUP BY u.telegram_id
         ORDER BY u.created_at DESC`,
        params
      );

      res.status(200).json({ users: result.rows });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { telegram_id, role, is_blocked } = req.body;

      if (role) {
        await query('UPDATE users SET role = $1 WHERE telegram_id = $2', [role, telegram_id]);
      }

      if (typeof is_blocked === 'boolean') {
        await query('UPDATE users SET is_blocked = $1 WHERE telegram_id = $2', [is_blocked, telegram_id]);
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
