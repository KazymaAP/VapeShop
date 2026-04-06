import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

interface Category {
  id: string;
  name: string;
  sort_order?: number;
}

interface ErrorResponse {
  error?: string;
}

/**
 * GET - получить все категории
 * Используется для фильтрации в каталоге и админке
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ categories: Category[] } | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    const result = await query(
      'SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC'
    );

    res.status(200).json({ categories: result.rows });
  } catch (err) {
    console.error('Categories GET error:', err);
    res.status(500).json({ error: 'Ошибка при загрузке категорий' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
