import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Whitelist для SQL injection protection
    const allowedSorts = ['created_at', 'price', 'name', 'stock'];
    const allowedOrders = ['asc', 'desc'];
    const safeSortBy = allowedSorts.includes(String(sort)) ? sort : 'created_at';
    const safeOrder = allowedOrders.includes(String(order).toLowerCase()) ? String(order).toLowerCase() : 'desc';

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
      ORDER BY ${safeSortBy} ${safeOrder}
      LIMIT $1 OFFSET $2
    `;

    const result = await query(sql, [Number(limit), offset]);
    return res.status(200).json({ products: result.rows });
  } catch (err) {
    const error = err as Error;
    console.error('❌ Ошибка в /api/products:', error);
    
    // Не выставляем stack в production
    const errorResponse = {
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Internal server error'
    };
    
    if (process.env.NODE_ENV === 'development' && error.stack) {
      (errorResponse as any).stack = error.stack;
    }
    
    return res.status(500).json(errorResponse);
  }
}