import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем текущего пользователя для проверки принадлежности
  const currentTelegramId = await getTelegramIdFromRequest(req);

  if (req.method === 'GET') {
    try {
      // ⚠️ КРИТИЧНО: требуем аутентификацию и игнорируем telegram_id из query
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // ⚠️ ИСПРАВЛЕНО: Добавлен LIMIT 200 для безопасности
      // Один SQL joinов вместо N+1 запросов (раньше может было LEFT JOIN для каждого товара)
      const result = await query(
        `SELECT p.id, p.name, p.price, p.specification, p.stock, p.images,
                p.is_active, p.is_promotion, p.is_hit, p.is_new, p.rating,
                b.name as brand_name, c.name as category_name,
                w.added_at
         FROM wishlist w
         JOIN products p ON w.product_id = p.id
         LEFT JOIN brands b ON p.brand_id = b.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE w.user_telegram_id = $1 AND p.is_active = true
         ORDER BY w.added_at DESC
         LIMIT 200`,
        [currentTelegramId]
      );

      res.status(200).json({ success: true, products: result.rows, count: result.rows.length });
    } catch (err) {
      logger.error('Get favorites error:', err);
      res.status(500).json({ error: 'Ошибка загрузки избранного' });
    }
  } else if (req.method === 'POST') {
    try {
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { product_id } = req.body;
      if (!product_id) return res.status(400).json({ error: 'Missing field: product_id' });

      // Проверяем, что товар существует и активен
      const productCheck = await query(
        'SELECT id FROM products WHERE id = $1 AND is_active = true',
        [product_id]
      );
      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      await query(
        `INSERT INTO wishlist (user_telegram_id, product_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [currentTelegramId, product_id]
      );

      res.status(200).json({ success: true });
    } catch (err) {
      logger.error('Add favorite error:', err);
      res.status(500).json({ error: 'Ошибка добавления в избранное' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { product_id } = req.query;
      if (!product_id) return res.status(400).json({ error: 'Missing field: product_id' });

      await transaction(async (client) => {
        await client.query('DELETE FROM wishlist WHERE user_telegram_id = $1 AND product_id = $2', [
          currentTelegramId,
          product_id,
        ]);
      });

      res.status(200).json({ success: true });
    } catch (err) {
      logger.error('Delete favorite error:', err);
      res.status(500).json({ error: 'Ошибка удаления из избранного' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
