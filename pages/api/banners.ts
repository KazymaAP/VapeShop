import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, image_url, link, title, description, order_index
         FROM banners WHERE is_active = true
         ORDER BY order_index ASC`,
        []
      );

      apiSuccess(res, result.rows);
    } catch (err) {
      logger.error('Banners GET error:', err);
      apiError(res, 'Ошибка при получении баннеров', 500);
    }
  } else {
    apiError(res, 'Метод не разрешён', 405);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
