import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { period = 'month', date_from, date_to } = req.query;

      let dateFilter = '';
      if (date_from && date_to) {
        dateFilter = ` WHERE created_at BETWEEN $1 AND $2`;
      }

      // KPI summary
      const summaryResult = await query(
        `SELECT 
        SUM(o.total) as total_revenue,
        COUNT(*) as total_orders,
        AVG(o.total) as average_check,
        COUNT(DISTINCT CASE WHEN o.user_telegram_id NOT IN 
          (SELECT user_telegram_id FROM orders GROUP BY user_telegram_id HAVING COUNT(*) > 1)
          THEN o.user_telegram_id END) as new_customers
       FROM orders o
       ${dateFilter}`,
        date_from && date_to ? [date_from as string, date_to as string] : []
      );

      const summary = summaryResult.rows[0];

      // Revenue chart by day/week/month - use safe period mapping
      let truncateUnit = 'day';
      if (period === 'week') {
        truncateUnit = 'week';
      } else if (period === 'month') {
        truncateUnit = 'month';
      }

      // Construct SQL safely without string interpolation
      const revenueResult = await query(
        `SELECT 
        DATE_TRUNC($1, o.created_at) as date,
        SUM(o.total) as revenue,
        COUNT(*) as orders
       FROM orders o
       ${dateFilter}
       GROUP BY DATE_TRUNC($1, o.created_at)
       ORDER BY date DESC
       LIMIT 30`,
        date_from && date_to
          ? [truncateUnit, date_from as string, date_to as string]
          : [truncateUnit]
      );

      // Top products
      const productsResult = await query(
        `SELECT p.id, p.name, COUNT(*) as sales, SUM(oi.quantity * oi.price) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       GROUP BY p.id, p.name
       ORDER BY sales DESC
       LIMIT 10`
      );

      // Top categories
      const categoriesResult = await query(
        `SELECT c.id, c.name, COUNT(*) as sales, SUM(oi.quantity * oi.price) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       GROUP BY c.id, c.name
       ORDER BY sales DESC
       LIMIT 5`
      );

      // Top brands
      const brandsResult = await query(
        `SELECT b.id, b.name, COUNT(*) as sales
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN brands b ON p.brand_id = b.id
       GROUP BY b.id, b.name
       ORDER BY sales DESC
       LIMIT 5`
      );

      res.status(200).json({
        summary: {
          total_revenue: summary.total_revenue || 0,
          total_orders: summary.total_orders || 0,
          average_check: summary.average_check || 0,
          new_customers: summary.new_customers || 0,
        },
        revenue_chart: revenueResult.rows.map((row) => ({
          date: row.date,
          revenue: row.revenue || 0,
          orders: row.orders || 0,
        })),
        top_products: productsResult.rows,
        top_categories: categoriesResult.rows,
        top_brands: brandsResult.rows,
      });
    } catch (err) {
      logger.error('dashboard-advanced error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['admin', 'super_admin']
);
