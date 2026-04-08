import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramIdFromRequest } from '@/lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getTelegramIdFromRequest(req);

  if (req.method === 'GET') {
    try {
      // Получить текущий баланс
      const userResult = await query('SELECT balance FROM users WHERE telegram_id = $1', [userId]);
      const currentBalance = userResult.rows[0]?.balance || 0;

      // Получить историю
      const historyResult = await query(
        `SELECT * FROM balance_history 
         WHERE user_telegram_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      res.status(200).json({
        data: {
          current_balance: currentBalance,
          history: historyResult.rows,
        },
      });
    } catch (err) {
      logger.error('Balance fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  } else if (req.method === 'POST') {
    const { amount, operation, description } = req.body;

    try {
      await query(
        'INSERT INTO balance_history (user_telegram_id, amount, operation, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, operation, description]
      );

      const newBalance = await query(
        'UPDATE users SET balance = balance + $1 WHERE telegram_id = $2 RETURNING balance',
        [amount, userId]
      );

      res.status(200).json({ data: { balance: newBalance.rows[0].balance } });
    } catch (err) {
      logger.error('Balance update error:', err);
      res.status(500).json({ error: 'Failed to update balance' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);
