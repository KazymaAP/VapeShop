import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

const PAGE_SIZE = 20;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search, page = '1' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const offset = (pageNum - 1) * PAGE_SIZE;

      let whereClause = '';
      const params: (string | number | boolean | null)[] = [];

      if (search) {
        whereClause = `WHERE u.first_name ILIKE $1 OR u.username ILIKE $1 OR u.telegram_id::text LIKE $1`;
        params.push(`%${search}%`);
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / PAGE_SIZE);

      // Get paginated results
      const result = await query(
        `SELECT u.*, COUNT(o.id) as orders_count
         FROM users u
         LEFT JOIN orders o ON u.telegram_id = o.user_telegram_id
         ${whereClause}
         GROUP BY u.telegram_id
         ORDER BY u.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, PAGE_SIZE, offset]
      );

      res.status(200).json({ users: result.rows, page: pageNum, totalPages, total });
    } catch (error) {
      logger.error('Failed to load users', error);
      res.status(500).json({ error: 'Ошибка загрузки пользователей' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { telegram_id, role, is_blocked } = req.body;

      await transaction(async (client) => {
        if (role) {
          await client.query('UPDATE users SET role = $1 WHERE telegram_id = $2', [role, telegram_id]);
        }

        if (typeof is_blocked === 'boolean') {
          await client.query('UPDATE users SET is_blocked = $1 WHERE telegram_id = $2', [
            is_blocked,
            telegram_id,
          ]);
        }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Failed to update user', error);
      res.status(500).json({ error: 'Ошибка обновления пользователя' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
