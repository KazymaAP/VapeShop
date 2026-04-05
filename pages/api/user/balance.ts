import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = getTelegramId(req).toString();

  if (req.method === 'GET') {
    try {
      // Получить текущий баланс
      const userResult = await query('SELECT balance FROM users WHERE id = $1', [userId]);
      const currentBalance = userResult.rows[0]?.balance || 0;

      // Получить историю
      const historyResult = await query(
        `SELECT * FROM balance_history 
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );

      res.status(200).json({
        data: {
          current_balance: currentBalance,
          history: historyResult.rows
        }
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  } else if (req.method === 'POST') {
    const { amount, type, description } = req.body;

    try {
      await query(
        'INSERT INTO balance_history (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, type, description]
      );

      const newBalance = await query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [amount, userId]
      );

      res.status(200).json({ data: { balance: newBalance.rows[0].balance } });
    } catch {
      res.status(500).json({ error: 'Failed to update balance' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);

