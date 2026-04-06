/**
 * API для экспорта заказов в CSV/Excel
 * GET /api/admin/export-orders?format=csv|xlsx&dateFrom=&dateTo=&status=
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export default requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'csv', dateFrom, dateTo, status } = req.query;

    if (!['csv', 'xlsx'].includes(format as string)) {
      return res.status(400).json({ error: 'Format must be csv or xlsx' });
    }

    // Строим WHERE условие
    let where = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (dateFrom) {
      where += ` AND o.created_at >= $${paramIndex}`;
      params.push(Array.isArray(dateFrom) ? dateFrom[0] : dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      where += ` AND o.created_at <= $${paramIndex}`;
      params.push(Array.isArray(dateTo) ? dateTo[0] : dateTo);
      paramIndex++;
    }

    if (status && status !== 'all') {
      where += ` AND o.status = $${paramIndex}`;
      params.push(Array.isArray(status) ? status[0] : status);
      paramIndex++;
    }

    // Получаем заказы с деталями
    const result = await query(
      `SELECT 
         o.id,
         o.user_telegram_id,
         u.first_name || ' ' || COALESCE(u.last_name, '') as user_name,
         u.phone,
         o.total_amount,
         o.status,
         o.created_at,
         o.delivery_type,
         COALESCE(COUNT(oi.id), 0) as items_count,
         STRING_AGG(p.name, ', ') as product_names
       FROM orders o
       LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       ${where}
       GROUP BY o.id, u.first_name, u.last_name, u.phone
       ORDER BY o.created_at DESC`,
      params
    );

    if (format === 'csv') {
      // CSV формат
      const headers = [
        'ID',
        'Пользователь',
        'Телефон',
        'Товары',
        'Сумма₽',
        'Статус',
        'Доставка',
        'Дата',
      ];
      const rows = result.rows.map((row) => [
        row.id,
        row.user_name,
        row.phone || '',
        row.product_names || '',
        row.total_amount,
        row.status,
        row.delivery_type,
        new Date(row.created_at).toLocaleDateString('ru-RU'),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="orders-export-${Date.now()}.csv"`
      );
      res.write(csv);
      res.end();
    } else {
      // XLSX формат (требует библиотеки)
      res.json({
        data: result.rows,
        message: 'Use third-party service or library for XLSX generation (exceljs, xlsx, etc)',
      });
    }
  } catch (err) {
    console.error('Export orders error:', err);
    res.status(500).json({ error: 'Failed to export orders' });
  }
});
