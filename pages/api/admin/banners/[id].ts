import type { NextApiRequest, NextApiResponse } from 'next';
import { transaction } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID баннера обязателен' });
  }

  if (req.method === 'PUT') {
    try {
      const { image_url, link, title, description, order_index, is_active } = req.body;

      await transaction(async (client) => {
        await client.query(
          `UPDATE banners SET 
           image_url = COALESCE($1, image_url),
           link = COALESCE($2, link),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           order_index = COALESCE($5, order_index),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
           WHERE id = $7`,
          [image_url, link, title, description, order_index, is_active, parseInt(id)]
        );
      });

      res.status(200).json({ success: true, message: 'Баннер обновлён' });
    } catch (err) {
      logger.error('Banner update error:', err);
      res.status(500).json({ error: 'Ошибка при обновлении баннера' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await transaction(async (client) => {
        // HIGH-009 FIX: Use soft delete instead of hard DELETE
        await client.query(
          `UPDATE banners SET is_active = false, deleted_at = NOW() WHERE id = $1`,
          [parseInt(id)]
        );
      });

      res.status(200).json({ success: true, message: 'Баннер удалён' });
    } catch (err) {
      logger.error('Banner delete error:', err);
      res.status(500).json({ error: 'Ошибка при удалении баннера' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешён' });
  }
}

export default requireAuth(handler, ['admin']);
