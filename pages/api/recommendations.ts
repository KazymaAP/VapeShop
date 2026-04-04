/**
 * API для рекомендаций товаров на основе истории покупок
 * GET /api/recommendations - получить рекомендации для пользователя
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, limit = 10, exclude_purchased = true } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Получаем категории, которые покупал пользователь
    const userCategories = await query(
      `SELECT DISTINCT p.category
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.user_telegram_id = $1
       AND o.status = 'completed'
       LIMIT 5`,
      [userId]
    );

    if (userCategories.rows.length === 0) {
      // Если нет истории, вернём популярные товары
      const popular = await query(
        `SELECT id, name, price, image_url, category, rating
         FROM products
         WHERE is_active = true
         ORDER BY rating DESC, created_at DESC
         LIMIT $1`,
        [limit]
      );

      return res.status(200).json({
        data: popular.rows,
        type: 'popular',
      });
    }

    const categories = userCategories.rows.map(r => r.category);

    // Рекомендуем товары из похожих категорий
    let query_str = `
      SELECT id, name, price, image_url, category, rating, rating_count
      FROM products
      WHERE is_active = true
      AND category = ANY($1::text[])
    `;

    if (exclude_purchased) {
      query_str += `
        AND id NOT IN (
          SELECT DISTINCT oi.product_id
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE o.user_telegram_id = $2
        )
      `;
    }

    query_str += `
      ORDER BY rating DESC, rating_count DESC, created_at DESC
      LIMIT $${exclude_purchased ? 3 : 2}
    `;

    const params = exclude_purchased
      ? [categories, userId, limit]
      : [categories, limit];

    const result = await query(query_str, params);

    return res.status(200).json({
      data: result.rows,
      type: 'category_based',
      relatedCategories: categories,
    });

  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}
