import { logger } from '@/lib/logger';
/**
 * API для получения трекинга заказа
 * GET /api/orders/tracking?orderId=XXX
 *
 * Возвращает полную историю статусов и информацию о доставке
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';

interface TrackingEvent {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 'Method not allowed', 405);
  }

  try {
    const { orderId } = req.query;
    const telegramId = await getTelegramIdFromRequest(req);

    if (!orderId || typeof orderId !== 'string') {
      return apiError(res, 'Order ID required', 400);
    }

    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    // Получаем заказ
    const orderResult = await query(
      `SELECT o.id, o.status, o.user_telegram_id, o.delivery_method, o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return apiError(res, 'Order not found', 404);
    }

    const order = orderResult.rows[0];

    // Проверяем что пользователь может просматривать этот заказ
    if (Number(order.user_telegram_id) !== telegramId) {
      return apiError(res, 'Forbidden: cannot view this order', 403);
    }

    // Получаем историю статусов
    const timelineResult = await query(
      `SELECT status, timestamp, description, location
       FROM order_timeline
       WHERE order_id = $1
       ORDER BY timestamp ASC`,
      [orderId]
    );

    // Получаем информацию о доставке если есть
    let deliveryInfo = undefined;
    if (order.delivery_method === 'courier') {
      const deliveryResult = await query(
        `SELECT cd.id, cd.courier_id, c.first_name || ' ' || COALESCE(c.last_name, '') as courier_name, c.phone, cd.estimated_delivery, cd.tracking_number
         FROM courier_deliveries cd
         LEFT JOIN users c ON cd.courier_id = c.telegram_id
         WHERE cd.order_id = $1
         LIMIT 1`,
        [orderId]
      );

      if (deliveryResult.rows.length > 0) {
        const delivery = deliveryResult.rows[0];
        deliveryInfo = {
          courier_id: delivery.courier_id,
          courier_name: delivery.full_name,
          courier_phone: delivery.phone,
          estimated_delivery: delivery.estimated_delivery,
          tracking_number: delivery.tracking_number,
        };
      }
    }

    // Преобразуем события
    const events: TrackingEvent[] = timelineResult.rows.map((row: unknown) => {
      const event = row as Record<string, unknown>;
      return {
        status: event.status as string,
        timestamp: (event.timestamp as string) || new Date().toISOString(),
        description: (event.description as string) || '',
        location: (event.location as string) || undefined,
      };
    });

    // Если нет записей в timeline, создаем базовое событие
    if (events.length === 0) {
      events.push({
        status: order.status,
        timestamp: order.created_at,
        description: `Заказ ${order.status === 'pending_payment' ? 'создан' : order.status}`,
      });
    }

    const response = {
      order_id: order.id,
      current_status: order.status,
      events,
      delivery: deliveryInfo,
    };

    return apiSuccess(res, response, 200);
  } catch (err) {
    logger.error('Tracking error:', err);
    return apiError(res, 'Failed to get tracking information', 500);
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
