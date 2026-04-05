/**
 * API для дашборда админа с графиками выручки
 * GET /api/admin/dashboard-stats?period=day|week|month
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ApiResponse, ApiError } from '@/types/api';

export default requireAuth(async (req: NextApiRequest, res: NextApiResponse<ApiResponse | ApiError>) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
  }

  try {
    const { period = 'month' } = req.query;

    let dateRange = '';
    let groupBy = '';

    switch (period) {
      case 'day':
        dateRange = "NOW() - INTERVAL '24 hours'";
        groupBy = "DATE_TRUNC('hour', o.created_at)::TIMESTAMP";
        break;
      case 'week':
        dateRange = "NOW() - INTERVAL '7 days'";
        groupBy = "DATE_TRUNC('day', o.created_at)::DATE";
        break;
      case 'month':
        dateRange = "NOW() - INTERVAL '30 days'";
        groupBy = "DATE_TRUNC('day', o.created_at)::DATE";
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    // Получаем данные выручки
    const revenueData = await query(
      `SELECT 
         ${groupBy} as date,
         COUNT(*) as orders_count,
         SUM(total_amount) as revenue,
         AVG(total_amount) as avg_order_value,
         SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue
       FROM orders
       WHERE created_at > ${dateRange}
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      []
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
       WHERE o.created_at > ${dateRange}
       GROUP BY p.id, p.name
       ORDER BY revenue DESC
       LIMIT 10`,
      []
    );

    // Получаем статистику статусов
    const statusStats = await query(
      `SELECT 
         status,
         COUNT(*) as count,
         SUM(total_amount) as revenue
       FROM orders
       WHERE created_at > ${dateRange}
       GROUP BY status`,
      []
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
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats', timestamp: Date.now() });
  }
});
