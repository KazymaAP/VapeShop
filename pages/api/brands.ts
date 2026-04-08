import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

/**
 * GET - получить все бренды
 * Используется для фильтрации в каталоге и админке
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Метод не разрешен', 405);
  }

  try {
    // 🔒 HIGH-002/006: Добавлена пагинация + фильтр deleted_at
    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(parseInt((req.query.limit as string) || '100'), 500);
    
    if (page < 1 || limit < 1) {
      return apiError(res, 'Invalid pagination', 400);
    }
    
    const offset = (page - 1) * limit;
    
    const result = await query(
      'SELECT id, name FROM brands WHERE deleted_at IS NULL ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await query('SELECT COUNT(*) as total FROM brands WHERE deleted_at IS NULL');
    const total = parseInt(countResult.rows[0].total);

    apiSuccess(res, {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error('Brands GET error', { error: err instanceof Error ? err.message : String(err) });
    apiError(res, 'Ошибка при загрузке брендов', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
