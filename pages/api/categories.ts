import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

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
export default async function handler(
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
