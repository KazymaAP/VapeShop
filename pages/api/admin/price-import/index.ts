import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';
import { logger } from '@/lib/logger';

interface PriceImportItem {
  id: string;
  name: string;
  specification: string | null;
  quantity: number;
  tier1_price: number;
  tier2_price: number;
  tier3_price: number;
  distributor_price: number;
  is_activated: boolean;
  created_at: string;
}

interface PaginationResponse {
  items: PriceImportItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ErrorResponse {
  error?: string;
  message?: string;
}

/**
 * GET - получить список импортированных товаров с фильтрацией и пагинацией
 * Query params:
 *   - page: номер страницы (по умолчанию 1)
 *   - limit: товаров на странице (по умолчанию 20)
 *   - is_activated: true/false - фильтр по статусу активации
 *   - search: поиск по названию или характеристике
 *   - sort: поле для сортировки (по умолчанию created_at)
 *   - order: asc/desc (по умолчанию desc)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<PaginationResponse | ErrorResponse>
): Promise<void> {
  try {
    const {
      page = '1',
      limit = '20',
      is_activated,
      search,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const params: (string | number | boolean | null)[] = [];

    if (is_activated !== undefined) {
      const isActiv = is_activated === 'true';
      whereClause += `is_activated = $${params.length + 1}`;
      params.push(isActiv);
    }

    if (search) {
      if (whereClause) whereClause += ' AND ';
      whereClause += `(name ILIKE $${params.length + 1} OR specification ILIKE $${params.length + 2})`;
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    // Валидация полей сортировки
    const allowedSortFields = ['created_at', 'name', 'is_activated'];
    const sortField =
      String(sort).includes(',') || !allowedSortFields.includes(String(sort))
        ? 'created_at'
        : String(sort);
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Получаем общее количество
    const countQuery = `SELECT COUNT(*) as total FROM price_import ${whereClause ? `WHERE ${whereClause}` : ''}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Получаем товары с пагинацией
    const itemsQuery = `
      SELECT 
        id, name, specification, stock as quantity,
        price_tier_1 as tier1_price, price_tier_2 as tier2_price, price_tier_3 as tier3_price,
        distributor_price, is_activated, created_at
      FROM price_import
      ${whereClause ? `WHERE ${whereClause}` : ''}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const itemsResult = await query(itemsQuery, [...params, limitNum, offset]);
    const items = itemsResult.rows as PriceImportItem[];

    const pages = Math.ceil(total / limitNum);

    res.status(200).json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      pages,
    });
  } catch (_err) {
    logger.error('Price import GET error:', _err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
}

/**
 * Main handler
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginationResponse | ErrorResponse>
): Promise<void> {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  res.status(405).json({ error: 'Метод не разрешен' });
}

export default requireAuth(handler, ['admin']);
