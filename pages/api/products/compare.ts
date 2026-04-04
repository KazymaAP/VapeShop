import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { query } from '@/lib/db';

export default requireAuth(async (req, res) => {
  const telegramId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      const result = await query(
        'SELECT * FROM compare_items WHERE user_id = $1',
        [telegramId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({ data: { product_ids: [] } });
      }

      const productIds = result.rows[0].product_ids;
      const productsResult = await query(
        `SELECT * FROM products WHERE id = ANY($1)`,
        [productIds]
      );

      res.status(200).json({ data: { product_ids: productIds, products: productsResult.rows } });
    } catch (err) {
      console.error('Error fetching compare items:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { productIds } = req.body;

      const existing = await query(
        'SELECT * FROM compare_items WHERE user_id = $1',
        [telegramId]
      );

      if (existing.rows.length > 0) {
        await query(
          'UPDATE compare_items SET product_ids = $1, updated_at = NOW() WHERE user_id = $2',
          [productIds, telegramId]
        );
      } else {
        await query(
          'INSERT INTO compare_items (user_id, product_ids) VALUES ($1, $2)',
          [telegramId, productIds]
        );
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error saving compare items:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { productId } = req.body;

      const result = await query(
        'SELECT product_ids FROM compare_items WHERE user_id = $1',
        [telegramId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Compare list not found' });
      }

      const updated = result.rows[0].product_ids.filter((id: number) => id !== productId);

      if (updated.length === 0) {
        await query('DELETE FROM compare_items WHERE user_id = $1', [telegramId]);
      } else {
        await query(
          'UPDATE compare_items SET product_ids = $1 WHERE user_id = $2',
          [updated, telegramId]
        );
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error deleting from compare:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['customer', 'admin']);

