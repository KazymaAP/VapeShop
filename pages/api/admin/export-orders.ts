/**
 * API для экспорта заказов в Excel
 * POST /api/admin/export-orders - Export orders to Excel file
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import ExcelJS from 'exceljs';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем ID из метаданных (установлено requireAuth middleware)
    const telegram_id = (req as { telegram_id?: string }).telegram_id;
    if (!telegram_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate, status } = req.body;

    // Строим query с фильтрами
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND o.created_at >= $${paramIndex}`;
      params.push(new Date(startDate).toISOString());
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND o.created_at <= $${paramIndex}`;
      params.push(new Date(endDate).toISOString());
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Получаем данные
    const result = await query(
      `SELECT 
        o.id,
        o.order_number,
        o.user_telegram_id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as customer_name,
        u.username,
        o.total_amount,
        o.status,
        o.delivery_code,
        o.created_at,
        o.updated_at,
        json_agg(json_build_object(
          'product_name', p.name,
          'quantity', oi.quantity,
          'price', oi.price,
          'subtotal', oi.quantity * oi.price
        )) as items
       FROM orders o
       LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY o.id, u.first_name, u.last_name, u.username
       ORDER BY o.created_at DESC`,
      params
    );

    // Создаём Excel книгу
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заказы');

    // Определяем колонки
    worksheet.columns = [
      { header: 'Номер заказа', key: 'order_number', width: 15 },
      { header: 'ID пользователя', key: 'user_telegram_id', width: 18 },
      { header: 'Имя клиента', key: 'customer_name', width: 20 },
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Сумма (₽)', key: 'total_amount', width: 15 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Код доставки', key: 'delivery_code', width: 15 },
      { header: 'Дата создания', key: 'created_at', width: 20 },
      { header: 'Товары', key: 'items', width: 50 },
    ];

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4B0082' }, // Purple
    };

    // Добавляем данные
    result.rows.forEach((order: Record<string, unknown>) => {
      const itemsText = (
        order.items as Array<{ product_name: string; quantity: number; subtotal: number }>
      )
        .map((item) => `${item.product_name} x${item.quantity} (${item.subtotal}₽)`)
        .join('\n');

      worksheet.addRow({
        order_number: order.order_number,
        user_telegram_id: order.user_telegram_id,
        customer_name: order.customer_name || 'N/A',
        username: order.username || 'N/A',
        total_amount: order.total_amount,
        status: getStatusLabel(order.status as string),
        delivery_code: order.delivery_code || '-',
        created_at: new Date(order.created_at as string).toLocaleString('ru-RU'),
        items: itemsText,
      });
    });

    // Автоширина для некоторых колонок
    worksheet.columns.forEach((col) => {
      if (col.key !== 'items') {
        col.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // Добавляем фильтры в отчёт
    const filterRow = worksheet.insertRow(1, []);
    const filterText = `Фильтры: ${[
      startDate ? `с ${startDate}` : '',
      endDate ? `до ${endDate}` : '',
      status ? `Статус: ${getStatusLabel(status as string)}` : '',
    ]
      .filter(Boolean)
      .join(' | ')}`;

    filterRow.getCell('A').value = filterText;
    filterRow.getCell('A').font = { italic: true, color: { argb: 'FF666666' } };

    // Отправляем файл
    const filename = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

    // Логируем экспорт
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, details)
       VALUES ($1, 'export_orders', $2)`,
      [
        telegram_id,
        JSON.stringify({ count: result.rows.length, filters: { startDate, endDate, status } }),
      ]
    );
  } catch (err) {
    console.error('Export orders error:', err);
    res.status(500).json({ error: 'Failed to export orders' });
  }
};

export default requireAuth(handler, ['admin', 'manager']);

// Вспомогательная функция для формата статуса
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Ожидание',
    processing: 'В обработке',
    shipped: 'Отправлено',
    delivered: 'Доставлено',
    cancelled: 'Отменено',
  };
  return labels[status] || status;
}
