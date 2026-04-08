import { requireAuth, getTelegramId } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    const telegramId = getTelegramId(req);

    if (req.method === 'GET') {
      try {
        const result = await query('SELECT * FROM compare_items WHERE user_telegram_id = $1', [
          telegramId,
        ]);

        if (result.rows.length === 0) {
          return apiSuccess(res, { product_ids: [] }, 200);
        }

        const productIds = result.rows[0].product_ids;
        const productsResult = await query(`SELECT * FROM products WHERE id = ANY($1)`, [
          productIds,
        ]);

        return apiSuccess(
          res,
          {
            product_ids: productIds,
            products: productsResult.rows,
          },
          200,
          { total: productsResult.rows.length }
        );
      } catch (err) {
        logger.error('Error fetching compare items:', err);
        return apiError(res, 'Internal Server Error', 500);
      }
    } else if (req.method === 'POST') {
      try {
        const { productIds } = req.body;

        await transaction(async (client) => {
          const existing = await client.query(
            'SELECT * FROM compare_items WHERE user_telegram_id = $1',
            [telegramId]
          );

          if (existing.rows.length > 0) {
            await client.query(
              'UPDATE compare_items SET product_ids = $1, updated_at = NOW() WHERE user_telegram_id = $2',
              [productIds, telegramId]
            );
          } else {
            await client.query(
              'INSERT INTO compare_items (user_telegram_id, product_ids) VALUES ($1, $2)',
              [telegramId, productIds]
            );
          }
        });

        return apiSuccess(res, { items_saved: true }, 200);
      } catch (err) {
        logger.error('Error saving compare items:', err);
        return apiError(res, 'Internal Server Error', 500);
      }
    } else if (req.method === 'DELETE') {
      try {
        const { productId } = req.body;

        await transaction(async (client) => {
          const result = await client.query(
            'SELECT product_ids FROM compare_items WHERE user_telegram_id = $1',
            [telegramId]
          );

          if (result.rows.length === 0) {
            throw new Error('Compare list not found');
          }

          const updated = result.rows[0].product_ids.filter((id: number) => id !== productId);

          if (updated.length === 0) {
            await client.query('DELETE FROM compare_items WHERE user_telegram_id = $1', [
              telegramId,
            ]);
          } else {
            await client.query(
              'UPDATE compare_items SET product_ids = $1 WHERE user_telegram_id = $2',
              [updated, telegramId]
            );
          }
        });

        return apiSuccess(res, { item_removed: true }, 200);
      } catch (err) {
        logger.error('Error deleting from compare:', err);
        return apiError(res, 'Internal Server Error', 500);
      }
    } else {
      return apiError(res, 'Method not allowed', 405);
    }
  },
  ['customer', 'admin']
);
