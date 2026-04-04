import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, name, type, discount_value, start_date, end_date,
                applicable_product_ids, applicable_categories, is_active
         FROM promotions
         WHERE is_active = TRUE
         AND start_date <= NOW()
         AND end_date >= NOW()
         ORDER BY discount_value DESC`,
        []
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch promotions' });
    }
  } else if (req.method === 'POST') {
    const { name, type, discount_value, start_date, end_date, applicable_products, applicable_categories } = req.body;
    const userId = req.headers['x-telegram-id'] as string;

    try {
      const result = await query(
        `INSERT INTO promotions (name, type, discount_value, start_date, end_date, 
         applicable_product_ids, applicable_categories, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, type, discount_value, start_date, end_date, applicable_products, applicable_categories, userId]
      );
      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create promotion' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin', 'super_admin']);

