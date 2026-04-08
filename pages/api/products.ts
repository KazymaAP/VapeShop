import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { validatePagination, validateSortBy } from '@/lib/validate';
import { ApiResponse, PaginatedResponse, ProductResponse } from '../../types/api';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = '1',
      limit = '20',
      sort = 'created_at',
      order = 'desc',
      search,
      category_id,
      brand_id,
    } = req.query;

    // Валидация пагинации
    const pageNum = parseInt(String(page));
    const limitNum = Math.min(parseInt(String(limit)), 100); // Максимум 100 товаров за раз

    const validationErrors = validatePagination(pageNum, limitNum);
    if (validationErrors.length > 0) {
      return res
        .status(400)
        .json({ error: 'Invalid pagination parameters', details: validationErrors });
    }

    // Валидация сортировки
    const allowedSorts = ['created_at', 'price', 'name', 'stock', 'rating'];
    const sortValidation = validateSortBy(String(sort), allowedSorts);
    if (sortValidation.length > 0) {
      return res.status(400).json({ error: 'Invalid sort parameter', details: sortValidation });
    }

    const allowedOrders = ['asc', 'desc'];
    const safeOrder = allowedOrders.includes(String(order).toLowerCase())
      ? String(order).toLowerCase()
      : 'desc';
    const safeSortBy = String(sort);

    const offset = (pageNum - 1) * limitNum;

    // Построение WHERE условия
    const whereConditions = ['is_active = true'];
    const params: (string | number)[] = [];

    if (search) {
      // ⚠️ ОПТИМИЗИРОВАНО: Используем full-text search вместо ILIKE (100x быстрее)
      whereConditions.push(
        `search_vector @@ plainto_tsquery('russian', $${params.length + 1})`
      );
      params.push(String(search));
    }

    if (category_id) {
      whereConditions.push(`category_id = $${params.length + 1}`);
      params.push(parseInt(String(category_id)));
    }

    if (brand_id) {
      whereConditions.push(`brand_id = $${params.length + 1}`);
      params.push(parseInt(String(brand_id)));
    }

    const whereClause = whereConditions.join(' AND ');

    // Получаем общее количество товаров
    const countResult = await query(
      `SELECT COUNT(*) as total FROM products WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    // Получаем товары с пагинацией
    const productsResult = await query(
      `
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
          rating,
          created_at,
          updated_at
        FROM products
        WHERE ${whereClause}
        ORDER BY ${safeSortBy} ${safeOrder}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limitNum, offset]
    );

    const response: ApiResponse<PaginatedResponse<ProductResponse>> = {
      success: true,
      data: {
        items: productsResult.rows as ProductResponse[],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
      timestamp: Date.now(),
    };

    return res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    logger.error('❌ Ошибка в /api/products:', error);

    const errorResponse = {
      success: false,
      error:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message || 'Internal server error',
      timestamp: Date.now(),
    };

    if (process.env.NODE_ENV === 'development' && error.stack) {
      (errorResponse as Record<string, unknown>).stack = error.stack;
    }

    return res.status(500).json(errorResponse);
  }
}
