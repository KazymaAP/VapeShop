import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';

interface ErrorResponse {
  error?: string;
  message?: string;
}

/**
 * DELETE - удалить товар из price_import (только неактивированные товары)
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<{ message?: string } | ErrorResponse>
): Promise<void> {
  const { id } = req.query;
  const telegramId = getTelegramId(req);

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Неверный ID товара' });
  }

  try {
    // Проверяем, существует ли товар и не активирован ли он
    const checkRes = await query('SELECT id, is_activated FROM price_import WHERE id = $1', [id]);

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    if (checkRes.rows[0].is_activated) {
      return res.status(400).json({ error: 'Нельзя удалить активированный товар' });
    }

    // Удаляем товар
    await query('DELETE FROM price_import WHERE id = $1', [id]);

    // Логируем действие
    await query(
      `INSERT INTO audit_log (user_id, action, target_type, target_id, details, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [telegramId, 'delete_price_import', JSON.stringify({ price_import_id: id })]
    ).catch((err) => {
      console.error('Logging error:', err);
    });

    res.status(200).json({ message: 'Товар удалён' });
  } catch (err) {
    console.error('Delete price import error:', err);
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
}

/**
 * Main handler
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message?: string } | ErrorResponse>
): Promise<void> {
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }

  res.status(405).json({ error: 'Метод не разрешен' });
}

export default requireAuth(handler, ['admin']);
