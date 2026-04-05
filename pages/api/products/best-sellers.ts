/**
 * API endpoint для получения лучших/рекомендуемых товаров
 * Параметры: limit, sortBy (rating, sales, new), category
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  average_rating?: number;
  review_count?: number;
  discount_percent?: number;
  is_active: boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 8, sortBy = 'rating', category } = req.query;

    // Валидация
    const validatedLimit = Math.min(parseInt(String(limit), 10) || 8, 100);
    const validatedSortBy = ['rating', 'sales', 'new'].includes(String(sortBy))
      ? String(sortBy)
      : 'rating';

    // Построение WHERE clause
    let whereClause = 'p.is_active = true';
    const params: string[] = [];

    if (category) {
      whereClause += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }

    // Построение ORDER BY в зависимости от sortBy
    let orderBy = 'p.average_rating DESC, p.review_count DESC, p.popularity DESC';

    if (validatedSortBy === 'sales') {
      orderBy = `(
        SELECT COUNT(*) FROM order_items oi 
        WHERE oi.product_id = p.id
      ) DESC, p.popularity DESC`;
    } else if (validatedSortBy === 'new') {
      orderBy = 'p.created_at DESC';
    }

    // Получение товаров
    const result = await query(
      `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        COALESCE(p.average_rating, 0) as average_rating,
        COALESCE(p.review_count, 0) as review_count,
        COALESCE(p.discount_percent, 0) as discount_percent,
        p.is_active
      FROM products p
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      `,
      [...params, validatedLimit]
    );

    return res.status(200).json({
      success: true,
      data: result.rows as Product[],
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Best sellers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default handler;
