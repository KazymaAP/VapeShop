/**
 * API для получения трекинга заказа
 * GET /api/orders/tracking?orderId=XXX
 *
 * Возвращает полную историю статусов и информацию о доставке
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';

interface TrackingEvent {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
}

interface TrackingResponse {
  order_id: string;
  current_status: string;
  events: TrackingEvent[];
  delivery?: {
    courier_id?: number;
    courier_name?: string;
    courier_phone?: string;
    estimated_delivery?: string;
    tracking_number?: string;
  };
  timestamp: number;
  success: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrackingResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.query;
    const telegramId = await getTelegramIdFromRequest(req);

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).json({ error: 'Order ID required' });
    }

    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Получаем заказ
    const orderResult = await query(
      `SELECT o.id, o.status, o.user_telegram_id, o.delivery_method, o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Проверяем что пользователь может просматривать этот заказ
    if (Number(order.user_telegram_id) !== telegramId) {
      return res.status(403).json({ error: 'Forbidden: cannot view this order' });
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
        `SELECT cd.id, cd.courier_id, c.full_name, c.phone, cd.estimated_delivery, cd.tracking_number
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

    const response: TrackingResponse = {
      order_id: order.id,
      current_status: order.status,
      events,
      delivery: deliveryInfo,
      timestamp: Date.now(),
      success: true,
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
}
