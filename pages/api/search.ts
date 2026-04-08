import { logger } from '@/lib/logger';
/**
 * API endpoint для поиска товаров с автодополнением
 * Параметры: q (query), limit (максимум результатов)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, limit = 8 } = req.query;

    // Валидация
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const maxLimit = Math.min(parseInt(String(limit), 10) || 8, 20);
    const searchQuery = `%${q}%`.toLowerCase();

    // Поиск товаров по названию и описанию
    const result = await query(
      `
      SELECT 
        id,
        name,
        price,
        image_url
      FROM products
      WHERE 
        is_active = true
        AND (
          LOWER(name) LIKE $1
          OR LOWER(description) LIKE $1
        )
      ORDER BY 
        CASE 
          WHEN LOWER(name) LIKE $1 THEN 1
          ELSE 2
        END,
        popularity DESC,
        name ASC
      LIMIT $2
      `,
      [searchQuery, maxLimit]
    );

    return res.status(200).json({
      success: true,
      data: result.rows as Product[],
      timestamp: Date.now(),
    });
  } catch (err) {
    logger.error('Search error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.search);
