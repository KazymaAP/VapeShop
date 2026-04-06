import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

interface Brand {
  id: string;
  name: string;
}

interface ErrorResponse {
  error?: string;
}

/**
 * GET - получить все бренды
 * Используется для фильтрации в каталоге и админке
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ brands: Brand[] } | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    const result = await query('SELECT id, name FROM brands ORDER BY name ASC');

    res.status(200).json({ brands: result.rows });
  } catch (err) {
    console.error('Brands GET error:', err);
    res.status(500).json({ error: 'Ошибка при загрузке брендов' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
