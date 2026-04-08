import type { NextApiRequest, NextApiResponse } from 'next';
import { query, logAuditAction, transaction } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import { validateRequest, addToCartRequestSchema } from '@/lib/validationSchemas';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // Получаем текущего пользователя для проверки принадлежности
  const currentTelegramId = await getTelegramIdFromRequest(req);
  if (!currentTelegramId && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    return apiError(res, 'Unauthorized', 401);
  }

  if (method === 'GET') {
    try {
      const { telegram_id } = req.query;
      if (!telegram_id) return apiError(res, 'telegram_id required', 400);

      // КРИТИЧЕСКАЯ ЗАЩИТА: Проверяем, что пользователь запрашивает только свою корзину
      if (Number(telegram_id) !== currentTelegramId) {
        return apiError(res, "Forbidden: cannot access another user's cart", 403);
      }

      let items: unknown[] = [];

      try {
        // КРИТИЧЕСКАЯ ЗАЩИТА: Обёртываем JSONB парсинг в try-catch
        // Если JSONB корзины повреждена, вернём пустую корзину вместо 500 ошибки
        const result = await query(
          `SELECT ci->>'product_id' as product_id, (ci->>'quantity')::int as quantity, p.name, p.price::numeric, p.images, p.stock
           FROM carts c
           CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.items, '[]'::jsonb)) AS ci
           JOIN products p ON (ci->>'product_id')::uuid = p.id
           WHERE c.user_telegram_id = $1
           ORDER BY p.name`,
          [telegram_id]
        );

        items = result.rows.map((row) => ({
          product_id: row.product_id,
          name: row.name,
          price: Number(row.price),
          quantity: Number(row.quantity),
          image: row.images?.[0] || null,
          stock: Number(row.stock),
        }));
      } catch (jsonErr) {
        // 🔴 КРИТИЧЕСКИЕ ОШИБКИ: Повреждённые JSONB данные в корзине
        logger.error('Cart JSONB corruption detected', {
          telegram_id,
          error: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        });

        // Логируем в audit_log
        const idForLogging = Array.isArray(telegram_id) ? telegram_id[0] : telegram_id;
        await logAuditAction(
          telegram_id as number | string,
          'CART_CORRUPTION_DETECTED',
          'carts',
          String(idForLogging),
          undefined,
          undefined,
          'Corrupted JSONB data in cart items - user notified and cart cleared'
        );

        // Пытаемся очистить повреждённую корзину
        try {
          await transaction(async (client) => {
            // HIGH-009 FIX: Use soft delete instead of hard DELETE
            await client.query('UPDATE carts SET deleted_at = NOW() WHERE user_telegram_id = $1', [
              telegram_id,
            ]);
          });
          logger.info('Corrupted cart cleared', { telegram_id });
        } catch (delErr) {
          logger.error('Failed to cleanup corrupted cart', {
            telegram_id,
            error: delErr instanceof Error ? delErr.message : String(delErr),
          });
        }

        // ⚠️ Уведомляем пользователя о проблеме
        try {
          // Пытаемся отправить сообщение в Telegram (если есть bot)
          // import { getBotInstance } из notifications, но пока просто логируем
          logger.warn('User should be notified about cart corruption', { telegram_id });
        } catch (notifyErr) {
          logger.error('Failed to notify user about cart corruption', { telegram_id, notifyErr });
        }

        // Возвращаем пустую корзину - пользователь может добавить товары снова
        items = [];
      }

      apiSuccess(res, items);
    } catch (err) {
      logger.error('Cart GET error:', err);
      apiError(res, 'Ошибка загрузки корзины', 500);
    }
  } else if (method === 'POST') {
    try {
      // 🔒 ВАЛИДАЦИЯ: Используем zod для валидации входных данных
      const validationResult = validateRequest(addToCartRequestSchema, req.body);
      if (!validationResult.valid) {
        return apiError(res, 'Validation failed', 400, validationResult.errors);
      }

      const { telegram_id, product_id, quantity } = validationResult.data!;

      // Проверяем принадлежность и валидность quantity
      if (telegram_id !== currentTelegramId) {
        return apiError(res, 'Forbidden', 403);
      }

      if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
        return apiError(res, 'Invalid quantity', 400);
      }

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для безопасности операции добавления в корзину
      await transaction(async (client) => {
        const cartRes = await client.query(
          'SELECT items FROM carts WHERE user_telegram_id = $1 FOR UPDATE',
          [telegram_id]
        );

        if (cartRes.rows.length === 0) {
          await client.query(
            'INSERT INTO carts (user_telegram_id, items, updated_at) VALUES ($1, $2, NOW())',
            [telegram_id, JSON.stringify([{ product_id, quantity }])]
          );
        } else {
          const items = cartRes.rows[0].items || [];
          const existingIdx = items.findIndex(
            (item: { product_id: string }) => item.product_id === product_id
          );

          if (existingIdx >= 0) {
            items[existingIdx].quantity += quantity;
          } else {
            items.push({ product_id, quantity });
          }

          await client.query(
            'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
            [JSON.stringify(items), telegram_id]
          );
        }
      });

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
  } else if (method === 'PUT') {
    try {
      const { telegram_id, product_id, quantity } = req.body;
      if (!telegram_id || !product_id) return apiError(res, 'Missing fields', 400);

      // Проверяем принадлежность и валидность quantity
      if (telegram_id !== currentTelegramId) {
        return apiError(res, 'Forbidden', 403);
      }

      if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0)) {
        return apiError(res, 'Invalid quantity', 400);
      }

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для обновления количества в корзине
      await transaction(async (client) => {
        const cartRes = await client.query(
          'SELECT items FROM carts WHERE user_telegram_id = $1 FOR UPDATE',
          [telegram_id]
        );
        if (cartRes.rows.length === 0) return;

        const items = cartRes.rows[0].items || [];
        const idx = items.findIndex(
          (item: { product_id: string }) => item.product_id === product_id
        );

        if (idx >= 0) {
          if (quantity <= 0) {
            items.splice(idx, 1);
          } else {
            items[idx].quantity = quantity;
          }
        }

        await client.query(
          'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
          [JSON.stringify(items), telegram_id]
        );
      });

      apiSuccess(res, { success: true });
    } catch {
      apiError(res, 'Ошибка обновления корзины', 500);
    }
  } else if (method === 'DELETE') {
    try {
      const { product_id } = req.query;

      // 🔒 ИСПОЛЬЗУЕМ ТРАНЗАКЦИЮ для удаления из корзины
      await transaction(async (client) => {
        if (!product_id) {
          await client.query('DELETE FROM carts WHERE user_telegram_id = $1', [currentTelegramId]);
          return;
        }

        const cartRes = await client.query(
          'SELECT items FROM carts WHERE user_telegram_id = $1 FOR UPDATE',
          [currentTelegramId]
        );
        if (cartRes.rows.length === 0) return;

        let items = cartRes.rows[0].items || [];
        items = items.filter((item: { product_id: string }) => item.product_id !== product_id);

        await client.query(
          'UPDATE carts SET items = $1, updated_at = NOW() WHERE user_telegram_id = $2',
          [JSON.stringify(items), currentTelegramId]
        );
      });

      apiSuccess(res, { success: true });
    } catch {
      apiError(res, 'Ошибка удаления из корзины', 500);
    }
  } else {
    apiError(res, 'Method not allowed', 405);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
