/**
 * API endpoint для получения доступных фильтров товаров
 * Возвращает: категории, бренды, диапазон цен
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

interface FiltersResponse {
  success: boolean;
  data: {
    categories: Array<{
      id: number;
      name: string;
      product_count: number;
    }>;
    brands: Array<{
      id: number;
      name: string;
      product_count: number;
    }>;
    priceRange: {
      min: number;
      max: number;
    };
  };
  timestamp: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse<FiltersResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    return res.status(200).json({
      success: true,
      data: {
        categories: categoriesResult.rows.map((cat: Record<string, unknown>) => ({
          id: cat.id,
          name: cat.name,
          product_count: parseInt(String(cat.product_count), 10),
        })),
        brands: brandsResult.rows.map((brand: Record<string, unknown>) => ({
          id: brand.id,
          name: brand.name,
          product_count: parseInt(String(brand.product_count), 10),
        })),
        priceRange: {
          min: minPrice,
          max: maxPrice,
        },
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('Get filters error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.search);
