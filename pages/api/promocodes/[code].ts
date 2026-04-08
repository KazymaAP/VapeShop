import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * PUT/DELETE - обновление/удаление одного промокода
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const telegramId = getTelegramId(req);

  if (!code || Array.isArray(code)) {
    return res.status(400).json({ error: 'Неверный код промокода' });
  }

  try {
    if (req.method === 'PUT') {
      // Обновление промокода
      const { discount_type, discount_value, valid_from, valid_until, min_order_amount, max_uses } =
        req.body;

      const fields: string[] = ['updated_at = NOW()'];
      const values: (string | number | boolean | string[] | number[] | null)[] = [];
      let idx = 1;

      if (discount_type !== undefined) {
        if (!['percent', 'fixed'].includes(discount_type)) {
          return res.status(400).json({ error: 'Неверный тип скидки' });
        }
        fields.push(`discount_type = $${idx++}`);
        values.push(discount_type);
      }

      if (discount_value !== undefined) {
        if (typeof discount_value !== 'number' || discount_value <= 0) {
          return res.status(400).json({ error: 'Значение скидки должно быть > 0' });
        }
        fields.push(`discount_value = $${idx++}`);
        values.push(discount_value);
      }

      if (valid_from !== undefined) {
        fields.push(`valid_from = $${idx++}`);
        values.push(valid_from || null);
      }

      if (valid_until !== undefined) {
        fields.push(`valid_until = $${idx++}`);
        values.push(valid_until || null);
      }

      if (min_order_amount !== undefined) {
        fields.push(`min_order_amount = $${idx++}`);
        values.push(min_order_amount || 0);
      }

      if (max_uses !== undefined) {
        fields.push(`max_uses = $${idx++}`);
        values.push(max_uses || null);
      }

      values.push(code.toUpperCase());

      const result = await query(
        `UPDATE promocodes SET ${fields.join(', ')} WHERE code = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Промокод не найден' });
      }

      // Логируем действие
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, details)
         VALUES ($1, $2, $3)`,
        [telegramId, 'update_promocode', JSON.stringify({ code: code.toUpperCase() })]
      ).catch((err) => {
        logger.error('Logging error:', err);
      });

      res.status(200).json({ promocode: result.rows[0] });
    } else if (req.method === 'DELETE') {
      // Удаление промокода
      const result = await query('DELETE FROM promocodes WHERE code = $1 RETURNING code', [
        code.toUpperCase(),
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Промокод не найден' });
      }

      // Логируем действие
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, details)
         VALUES ($1, $2, $3)`,
        [telegramId, 'delete_promocode', JSON.stringify({ code: code.toUpperCase() })]
      ).catch((err) => {
        logger.error('Logging error:', err);
      });

      res.status(200).json({ message: 'Промокод удалён' });
    } else {
      res.status(405).json({ error: 'Метод не разрешен' });
    }
  } catch (err) {
    logger.error('Promocode handler error:', err);
    res.status(500).json({ error: 'Ошибка обработки промокода' });
  }
}

export default requireAuth(handler, ['admin']);
