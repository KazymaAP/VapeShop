import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default requireAuth(async (req, res) => {
  const telegramId = req.headers['x-telegram-id'] as string;

  if (req.method === 'GET') {
    try {
      const result = await query(
        'SELECT p.*, s.saved_at FROM saved_for_later s JOIN products p ON s.product_id = p.id WHERE s.user_id = $1 ORDER BY s.saved_at DESC',
        [telegramId]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error('Error fetching saved items:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { productId } = req.body;

      await query(
        'INSERT INTO saved_for_later (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [telegramId, productId]
      );

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Error saving item:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { productId } = req.body;

      await query(
        'DELETE FROM saved_for_later WHERE user_id = $1 AND product_id = $2',
        [telegramId, productId]
      );

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error deleting saved item:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['customer', 'admin']);
