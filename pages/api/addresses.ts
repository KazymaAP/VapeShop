import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем текущего пользователя
  const currentTelegramId = await getTelegramIdFromRequest(req);

  // Для всех операций нужна авторизация
  if (!currentTelegramId) {
    return apiError(res, 'Unauthorized', 401);
  }

  if (req.method === 'GET') {
    try {
      // ⚠️ КРИТИЧНО: проверяем, что пользователь запрашивает СВОИ адреса
      // Игнорируем telegram_id из query, используем только текущего пользователя
      // Добавлен LIMIT для безопасности (максимум 100 адресов на пользователя)
      const result = await query(
        'SELECT id, user_telegram_id, address, street, city, postal_code, phone, is_default, created_at, updated_at FROM addresses WHERE user_telegram_id = $1 ORDER BY is_default DESC, id LIMIT 100',
        [currentTelegramId]
      );

      apiSuccess(res, result.rows);
    } catch (err) {
      logger.error('Get addresses error:', err);
      apiError(res, 'Ошибка загрузки адресов', 500);
    }
  } else if (req.method === 'POST') {
    try {
      const { address, is_default } = req.body;

      if (!address || address.trim().length === 0) {
        return apiError(res, 'Address is required', 400);
      }

      if (address.length > 500) {
        return apiError(res, 'Address is too long', 400);
      }

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для обеспечения целостности адресов
      // Если устанавливаем как основной, сначала отменяем основной статус других адресов
      const result = await transaction(async (client) => {
        if (is_default) {
          await client.query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [
            currentTelegramId,
          ]);
        }

        const insertRes = await client.query(
          'INSERT INTO addresses (user_telegram_id, address, is_default) VALUES ($1, $2, $3) RETURNING *',
          [currentTelegramId, address, is_default || false]
        );
        
        return insertRes.rows[0];
      });

      apiSuccess(res, result, 201);
    } catch (err) {
      logger.error('Post address error:', err);
      apiError(res, 'Ошибка добавления адреса', 500);
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id || Array.isArray(id)) return apiError(res, 'id required', 400);

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для проверки принадлежности и удаления
      await transaction(async (client) => {
        const addrRes = await client.query('SELECT user_telegram_id FROM addresses WHERE id = $1 FOR UPDATE', [id]);
        if (!addrRes.rows[0]) {
          throw new Error('Address not found');
        }

        if (Number(addrRes.rows[0].user_telegram_id) !== currentTelegramId) {
          throw new Error('Forbidden');
        }

        // HIGH-009 FIX: Use soft delete instead of hard DELETE
        await client.query(
          'UPDATE addresses SET is_active = false, deleted_at = NOW() WHERE id = $1',
          [id]
        );
      });

      apiSuccess(res, { success: true, id });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'Address not found') {
        return apiError(res, 'Address not found', 404);
      }
      if (errMsg === 'Forbidden') {
        return apiError(res, "Forbidden: cannot delete another user's address", 403);
      }
      logger.error('Delete address error:', err);
      apiError(res, 'Ошибка удаления адреса', 500);
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, is_default } = req.body;
      if (!id) return apiError(res, 'id required', 400);

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для проверки принадлежности и обновления
      await transaction(async (client) => {
        const addrRes = await client.query('SELECT user_telegram_id FROM addresses WHERE id = $1 FOR UPDATE', [id]);
        if (!addrRes.rows[0]) {
          throw new Error('Address not found');
        }

        if (Number(addrRes.rows[0].user_telegram_id) !== currentTelegramId) {
          throw new Error('Forbidden');
        }

        if (is_default) {
          await client.query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [
            currentTelegramId,
          ]);
        }

        await client.query('UPDATE addresses SET is_default = $1 WHERE id = $2', [is_default || false, id]);
      });

      apiSuccess(res, { success: true, id });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'Address not found') {
        return apiError(res, 'Address not found', 404);
      }
      if (errMsg === 'Forbidden') {
        return apiError(res, "Forbidden: cannot modify another user's address", 403);
      }
      logger.error('Put address error:', err);
      apiError(res, 'Ошибка обновления адреса', 500);
    }
  } else {
    apiError(res, 'Method not allowed', 405);
  }
}
export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
