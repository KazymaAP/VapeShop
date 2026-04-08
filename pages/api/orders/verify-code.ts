import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * API для проверки 6-значного кода доставки
 * Используется курьером при завершении доставки
 *
 * POST /api/orders/verify-code
 * Body: { order_id: string, code_6digit: number }
 * Response: { success: boolean, message: string, order?: Order }
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    const { order_id, code_6digit } = req.body;

    // Валидация входных данных
    if (!order_id || !code_6digit) {
      return apiError(res, 'Отсутствуют обязательные поля: order_id, code_6digit', 400);
    }

    if (typeof code_6digit !== 'number' || code_6digit < 100000 || code_6digit > 999999) {
      return apiError(res, 'Код должен быть 6-значным числом', 400);
    }

    // Получаем заказ
    const orderRes = await query(
      `SELECT * FROM orders 
       WHERE id = $1 AND status = $2`,
      [order_id, 'new']
    );

    if (orderRes.rows.length === 0) {
      return apiError(res, 'Заказ не найден или уже завершён', 404);
    }

    const order = orderRes.rows[0];

    // Проверяем, что код совпадает (используем timing-safe сравнение для защиты от timing attacks)
    // Преобразуем оба значения в буферы для сравнения
    const providedCodeStr = String(code_6digit);
    const storedCodeStr = String(order.code_6digit);

    const providedCodeBuffer = Buffer.from(providedCodeStr);
    const storedCodeBuffer = Buffer.from(storedCodeStr);

    // Проверяем длину перед timingSafeEqual
    let codesMatch = false;
    if (providedCodeBuffer.length === storedCodeBuffer.length) {
      try {
        codesMatch = crypto.timingSafeEqual(providedCodeBuffer, storedCodeBuffer);
      } catch {
        codesMatch = false;
      }
    }

    if (!codesMatch) {
      return apiError(res, 'Неверный код доставки', 400);
    }

    // Проверяем срок действия кода (24 часа)
    const codeExpiresAt = new Date(order.code_expires_at);
    if (codeExpiresAt < new Date()) {
      return apiError(res, 'Код доставки истёк. Срок действия: 24 часа после оплаты', 400);
    }

    // Обновляем статус заказа на 'done' (выполнен)
    // Очищаем 6-значный код
    await query(
      `UPDATE orders 
       SET status = $1, 
           code_6digit = NULL, 
           code_expires_at = NULL, 
           updated_at = NOW()
       WHERE id = $2`,
      ['done', order_id]
    );

    // Получаем обновленный заказ
    const updatedOrderRes = await query('SELECT * FROM orders WHERE id = $1', [order_id]);

    const updatedOrder = updatedOrderRes.rows[0];

    return apiSuccess(
      res,
      {
        message: `✅ Заказ #${order_id.slice(0, 8).toUpperCase()} успешно завершён!`,
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          total: updatedOrder.total,
          created_at: updatedOrder.created_at,
          updated_at: updatedOrder.updated_at,
        },
      },
      200
    );
  } catch (error) {
    logger.error('Verify code error:', error);
    return apiError(res, 'Технаическая ошибка при проверке кода', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.strict);
