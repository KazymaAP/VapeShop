import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import * as cache from '@/lib/cache';

/**
 * GET - получить все категории
 * Используется для фильтрации в каталоге и админке
 * 
 * ⚠️ ОПТИМИЗИРОВАНО: Результаты кэшируются на 1 час (категории меняются редко)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Метод не разрешен', 405);
  }

  try {
    // 🔒 HIGH-002/006: Кэш + добавлен deleted_at фильтр + пагинация
    const page = parseInt((req.query.page as string) || '1');
    const limit = Math.min(parseInt((req.query.limit as string) || '500'), 1000);
    
    if (page < 1 || limit < 1) {
      return apiError(res, 'Invalid pagination', 400);
    }
    
    const offset = (page - 1) * limit;
    
    // ⚠️ ОПТИМИЗИРОВАНО: Используем кэш для категорий (меняются редко, но нужны часто)
    const categories = await cache.getOrSet(
      cache.CACHE_KEYS.CATEGORIES,
      async () => {
        const result = await query(
          'SELECT id, name, sort_order FROM categories WHERE is_active = true AND deleted_at IS NULL ORDER BY sort_order ASC, name ASC LIMIT $1 OFFSET $2',
          [limit, offset]
        );
        return result.rows;
      },
      3600 // TTL: 1 час (категории не меняются часто)
    );
    
    const countResult = await query(
      'SELECT COUNT(*) as total FROM categories WHERE is_active = true AND deleted_at IS NULL'
    );
    const total = parseInt(countResult.rows[0].total);

    apiSuccess(res, {
      data: categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error('Categories GET error', { error: err instanceof Error ? err.message : String(err) });
    apiError(res, 'Ошибка при загрузке категорий', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
