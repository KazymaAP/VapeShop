import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await query(
      `SELECT u.telegram_id as id, u.first_name, u.last_name,
              ul.level, ul.experience,
              COUNT(o.id) as orders_count,
              COALESCE(SUM(o.total), 0) as total_spent
       FROM users u
       LEFT JOIN user_levels ul ON u.telegram_id = ul.user_telegram_id
       LEFT JOIN orders o ON u.telegram_id = o.user_telegram_id AND o.status IN ('done', 'delivered')
       WHERE u.role = 'customer'
       GROUP BY u.telegram_id, u.first_name, u.last_name, ul.level, ul.experience
       ORDER BY ul.level DESC, ul.experience DESC
       LIMIT 50`,
      []
    );

    res.status(200).json({ data: result.rows });
  } catch (err) {
    logger.error(err instanceof Error ? err.message : 'Unknown error');
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

export default handler;
