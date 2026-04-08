import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, question, answer, sort_order
         FROM faq WHERE is_active = true
         ORDER BY sort_order ASC`,
        []
      );

      apiSuccess(res, result.rows);
    } catch (err) {
      logger.error('FAQ GET error:', err);
      apiError(res, 'Ошибка при получении FAQ', 500);
    }
  } else {
    apiError(res, 'Метод не разрешён', 405);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
