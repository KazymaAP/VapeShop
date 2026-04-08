import type { NextApiRequest, NextApiResponse } from 'next';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ⚠️ HMAC Validation required
  const telegramId = await getTelegramIdFromRequest(req);

  if (!telegramId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        'SELECT p.*, s.saved_at FROM saved_for_later s JOIN products p ON s.product_id = p.id WHERE s.user_id = $1 ORDER BY s.saved_at DESC',
        [telegramId]
      );
      res.status(200).json({ data: result.rows });
    } catch (_err) {
      logger.error('Error fetching saved items for user', { telegramId, error: _err });
      res.status(500).json({ error: 'Failed to retrieve saved items' });
    }
  } else if (req.method === 'POST') {
    try {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      await transaction(async (client) => {
        await client.query(
          'INSERT INTO saved_for_later (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [telegramId, productId]
        );
      });

      res.status(201).json({ success: true });
    } catch (_err) {
      logger.error('Error saving item to favorites', { telegramId, productId: req.body.productId, error: _err });
      res.status(500).json({ error: 'Failed to save item to favorites' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      await transaction(async (client) => {
        await client.query('DELETE FROM saved_for_later WHERE user_id = $1 AND product_id = $2', [
          telegramId,
          productId,
        ]);
      });

      res.status(200).json({ success: true });
    } catch (_err) {
      logger.error('Error deleting saved item', { telegramId, productId: req.body.productId, error: _err });
      res.status(500).json({ error: 'Failed to remove item from favorites' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
