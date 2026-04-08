import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { product_ids, updates } = req.body;

      if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
        return res.status(400).json({ error: 'product_ids array required' });
      }

      const errors = [];

      for (const product_id of product_ids) {
        try {
          const current = await query(`SELECT * FROM products WHERE id = $1`, [product_id]);

          if (current.rows.length === 0) {
            errors.push(`Product ${product_id} not found`);
            continue;
          }

          let newPrice = current.rows[0].price;

          if (updates.price_action && updates.price_value) {
            if (updates.price_action === 'multiply') {
              newPrice = current.rows[0].price * updates.price_value;
            } else if (updates.price_action === 'percent_increase') {
              newPrice = current.rows[0].price * (1 + updates.price_value / 100);
            } else if (updates.price_action === 'percent_decrease') {
              newPrice = current.rows[0].price * (1 - updates.price_value / 100);
            } else if (updates.price_action === 'set') {
              newPrice = updates.price_value;
            }
          }

          await query(
            `UPDATE products SET 
            price = $1,
            old_price = CASE WHEN $2::boolean THEN $3 ELSE old_price END,
            discount_percent = CASE WHEN $2::boolean THEN $4 ELSE discount_percent END,
            category_id = CASE WHEN $5 IS NOT NULL THEN $5::bigint ELSE category_id END,
            brand_id = CASE WHEN $6 IS NOT NULL THEN $6::bigint ELSE brand_id END,
            is_hit = CASE WHEN $7 IS NOT NULL THEN $7::boolean ELSE is_hit END,
            is_new = CASE WHEN $8 IS NOT NULL THEN $8::boolean ELSE is_new END,
            updated_at = NOW()
           WHERE id = $9`,
            [
              newPrice,
              updates.discount_percent !== undefined,
              current.rows[0].price,
              updates.discount_percent || 0,
              updates.category_id || null,
              updates.brand_id || null,
              updates.is_hit !== undefined ? updates.is_hit : null,
              updates.is_new !== undefined ? updates.is_new : null,
              product_id,
            ]
          );
        } catch (e) {
          errors.push(`Error updating ${product_id}: ${(e as Error).message}`);
        }
      }

      res.status(200).json({
        success: true,
        updated_count: product_ids.length - errors.length,
        errors,
      });
    } catch (_err) {
      logger.error('bulk-update error:', _err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['admin', 'super_admin']
);
