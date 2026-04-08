/**
 * API для поиска товаров с автодополнением
 * GET /api/products/search?q=query - быстрый поиск
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/apiResponse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    const { q, limit = 10, type = 'autocomplete' } = req.query;

    // Валидация
    if (!q || typeof q !== 'string') {
      return apiError(res, 'Search query required', 400);
    }

    if (q.length < 2) {
      return apiSuccess(res, [], 200);
    }

    const searchTerm = q.toLowerCase().trim();
    const limitNum = Math.min(Number(limit) || 10, 50);

    let result;

    if (type === 'autocomplete') {
      // Быстрый поиск для autocomplete (только названия)
      result = await query(
        `SELECT 
          p.id,
          p.name,
          COALESCE(cat.name, 'Unknown') as category,
          p.price,
          p.images[1] as image_url,
          p.rating
         FROM products p
         LEFT JOIN categories cat ON p.category_id = cat.id
         WHERE p.is_active = true
         AND (
           LOWER(p.name) LIKE $1
           OR LOWER(cat.name) LIKE $1
         )
         ORDER BY 
           CASE 
             WHEN LOWER(p.name) LIKE $2 THEN 0
             ELSE 1
           END,
           p.rating DESC,
           p.name ASC
         LIMIT $3`,
        [
          `%${searchTerm}%`,
          `${searchTerm}%`, // Точное совпадение в начале приоритет
          limitNum,
        ]
      );
    } else {
      // Полный поиск (названия, описания, категории)
      result = await query(
        `SELECT 
          id,
          name,
          category,
          price,
          image_url,
          rating
         FROM products
         WHERE is_active = true
         AND (
           LOWER(name) LIKE $1
           OR LOWER(description) LIKE $1
           OR LOWER(category) LIKE $1
           OR LOWER(brand) LIKE $1
         )
         ORDER BY 
           CASE 
             WHEN LOWER(name) LIKE $2 THEN 0
             WHEN LOWER(category) LIKE $2 THEN 1
             ELSE 2
           END,
           rating DESC,
           name ASC
         LIMIT $3`,
        [`%${searchTerm}%`, `${searchTerm}%`, limitNum]
      );
    }

    // Добавляем рекомендации если результатов мало
    if (result.rows.length < 5) {
      // Ищем по отдельным словам (если query состоит из нескольких слов)
      const words = searchTerm.split(/\s+/);
      if (words.length > 1) {
        const additionalResult = await query(
          `SELECT 
            id,
            name,
            category,
            price,
            image_url,
            rating
           FROM products
           WHERE is_active = true
           AND id NOT IN (${result.rows.map((_, i) => `$${i + 1}`).join(',')})
           AND (${words.map((_, i) => `LOWER(name) LIKE $${result.rows.length + i + 1}`).join(' OR ')})
           ORDER BY rating DESC, name ASC
           LIMIT $${result.rows.length + words.length + 1}`,
          [...result.rows.map((r) => r.id), ...words.map((w) => `%${w}%`), 5 - result.rows.length]
        );

        result.rows = [...result.rows, ...additionalResult.rows];
      }
    }

    return apiSuccess(res, result.rows, 200);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Search failed';
    return apiError(res, error, 500);
  }
}
