import { logger } from '@/lib/logger';
/**
 * API endpoint для получения доступных фильтров товаров
 * Возвращает: категории, бренды, диапазон цен
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    // Получение категорий с кол-вом товаров
    const categoriesResult = await query(
      `
      SELECT 
        c.id,
        c.name,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id, c.name
      ORDER BY product_count DESC, c.name ASC
      `
    );

    // Получение брендов с кол-вом товаров
    const brandsResult = await query(
      `
      SELECT 
        b.id,
        b.name,
        COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id AND p.is_active = true
      GROUP BY b.id, b.name
      ORDER BY product_count DESC, b.name ASC
      `
    );

    // Получение диапазона цен
    const priceResult = await query(
      `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM products
      WHERE is_active = true AND price > 0
      `
    );

    const minPrice = Math.floor(priceResult.rows[0]?.min_price || 0);
    const maxPrice = Math.ceil(priceResult.rows[0]?.max_price || 10000);

    return apiSuccess(
      res,
      {
        categories: categoriesResult.rows.map((cat: Record<string, unknown>) => ({
          id: Number(cat.id),
          name: String(cat.name),
          product_count: parseInt(String(cat.product_count), 10),
        })),
        brands: brandsResult.rows.map((brand: Record<string, unknown>) => ({
          id: Number(brand.id),
          name: String(brand.name),
          product_count: parseInt(String(brand.product_count), 10),
        })),
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
      },
      200,
      { total: categoriesResult.rows.length + brandsResult.rows.length }
    );
  } catch (err) {
    logger.error('Get filters error:', err);
    return apiError(res, 'Internal server error', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.search);
