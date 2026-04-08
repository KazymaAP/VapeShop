import { logger } from '@/lib/logger';
/**
 * API для получения заказов, сгруппированных по датам
 * GET /api/admin/orders-grouped - заказы сгруппированные по датам
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ApiResponse, ApiError } from '@/types/api';

interface GroupedOrder {
  date: string;
  dayLabel: string;
  orders: Array<{
    id: string;
    user_telegram_id: number;
    status: string;
    total_amount: number;
    items_count: number;
    created_at: string;
    user_name?: string;
  }>;
}

export default requireAuth(
  async (req: NextApiRequest, res: NextApiResponse<ApiResponse | ApiError>) => {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp: Date.now(),
      });
    }

    try {
      const { days = 7, status } = req.query;

      let where = `WHERE o.created_at > NOW() - INTERVAL '${days} days'`;
      if (status && status !== 'all') {
        where += ` AND o.status = '${status}'`;
      }

      const result = await query(
        `SELECT 
         DATE_TRUNC('day', o.created_at)::DATE as date,
         o.id,
         o.user_telegram_id,
         o.status,
         o.total_amount,
         COUNT(oi.id)::INTEGER as items_count,
         o.created_at,
         u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
       ${where}
       GROUP BY o.id, u.first_name, u.last_name
       ORDER BY o.created_at DESC`,
        []
      );

      // Сгруппируем по датам
      const grouped = new Map<string, Array<Record<string, unknown>>>();

      result.rows.forEach((order: Record<string, unknown>) => {
        const dateKey = order.date as string;
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(order);
      });

      // Преобразуем в нужный формат
      const groupedOrders: GroupedOrder[] = Array.from(grouped.entries())
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([date, orders]) => ({
          date,
          dayLabel: formatDate(new Date(date)),
          orders: orders.sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) =>
              new Date(b.created_at as string).getTime() -
              new Date(a.created_at as string).getTime()
          ) as Array<{
            id: string;
            user_telegram_id: number;
            status: string;
            total_amount: number;
            items_count: number;
            created_at: string;
            user_name?: string;
          }>,
        }));

      return res.status(200).json({
        success: true,
        data: {
          orders: groupedOrders,
          count: result.rows.length,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error('Orders grouping error:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch grouped orders',
        timestamp: Date.now(),
      });
    }
  }
);

// Форматируем дату в русский формат
function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Сегодня';
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Вчера';
  }

  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];

  return `${date.getDate()} ${months[date.getMonth()]}`;
}
