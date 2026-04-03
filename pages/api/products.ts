import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const sql = `
      SELECT 
        id, 
        name, 
        specification, 
        price, 
        stock, 
        images, 
        is_active,
        is_promotion,
        is_hit,
        is_new,
        created_at
      FROM products
      WHERE is_active = true
      ORDER BY ${sort} ${order}
      LIMIT $1 OFFSET $2
    `;

    const result = await query(sql, [Number(limit), offset]);
    return res.status(200).json({ products: result.rows });
  } catch (err) {
    // Приводим err к типу Error
    const error = err as Error;
    console.error('❌ Ошибка в /api/products:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      stack: error.stack,
      // sql: (error as any).query, // если нужно, но обычно его нет
    });
  }
}