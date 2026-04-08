import { logger } from '@/lib/logger';
/**
 * API для дашборда админа с графиками выручки
 * GET /api/admin/dashboard-stats?period=day|week|month
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ApiResponse, ApiError } from '@/types/api';

export default requireAuth(
  async (req: NextApiRequest, res: NextApiResponse<ApiResponse | ApiError>) => {
    if (req.method !== 'GET') {
      return res
        .status(405)
        .json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
    }

    try {
      const { period = 'month' } = req.query;

      // Валидируем период - используем белый список для безопасности!
      const validPeriods = ['day', 'week', 'month'];
      if (!validPeriods.includes(String(period))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid period',
          timestamp: Date.now(),
        });
      }

      // Безопасное определение интервалов
      let intervalValue: string = '30 days'; // default
      let truncateUnit: string = 'day'; // default

      if (String(period) === 'day') {
        intervalValue = '24 hours';
        truncateUnit = 'hour';
      } else if (String(period) === 'week') {
        intervalValue = '7 days';
        truncateUnit = 'day';
      } else if (String(period) === 'month') {
        intervalValue = '30 days';
        truncateUnit = 'day';
      }

      // Получаем данные выручки (безопасно - используем параметризованные запросы)
      const revenueData = await query(
        `SELECT 
         DATE_TRUNC($1::text, o.created_at)::${truncateUnit === 'hour' ? 'TIMESTAMP' : 'DATE'} as date,
         COUNT(*) as orders_count,
         SUM(total_amount) as revenue,
         AVG(total_amount) as avg_order_value,
         SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue
       FROM orders o
       WHERE o.created_at > NOW() - INTERVAL $2
       GROUP BY DATE_TRUNC($1::text, o.created_at)
       ORDER BY date ASC`,
        [truncateUnit, intervalValue]
      );

      // Получаем топ товаров
      const topProducts = await query(
        `SELECT 
         p.id,
         p.name,
         COUNT(oi.id) as sold_count,
         SUM(oi.quantity) as total_quantity,
         SUM(oi.quantity * oi.price) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at > NOW() - INTERVAL $1
       GROUP BY p.id, p.name
       ORDER BY revenue DESC
       LIMIT 10`,
        [intervalValue]
      );

      // Получаем статистику статусов
      const statusStats = await query(
        `SELECT 
         status,
         COUNT(*) as count,
         SUM(total_amount) as revenue
       FROM orders
       WHERE created_at > NOW() - INTERVAL $1
       GROUP BY status`,
        [intervalValue]
      );

      // Вычисляем метрики
      const totalRevenue = revenueData.rows.reduce((sum, row) => sum + (row.revenue || 0), 0);
      const totalOrders = revenueData.rows.reduce((sum, row) => sum + (row.orders_count || 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return res.status(200).json({
        success: true,
        data: {
          revenueChart: revenueData.rows,
          topProducts: topProducts.rows,
          statusStats: statusStats.rows,
          metrics: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOrders,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            period,
          },
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error('Dashboard stats error:', err);
      res
        .status(500)
        .json({ success: false, error: 'Failed to fetch dashboard stats', timestamp: Date.now() });
    }
  }
);
