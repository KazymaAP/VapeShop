import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import ExcelJS from 'exceljs';

export default requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'xlsx', date_from, date_to, status, min_amount, max_amount } = req.query;

    let whereClause = '1=1';
    const params: (string | Date | number)[] = [];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND o.created_at >= $${paramCount}`;
      params.push(new Date(date_from as string));
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND o.created_at <= $${paramCount}`;
      params.push(new Date(date_to as string));
      paramCount++;
    }

    if (status) {
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (min_amount) {
      whereClause += ` AND o.total_amount >= $${paramCount}`;
      params.push(parseFloat(min_amount as string));
      paramCount++;
    }

    if (max_amount) {
      whereClause += ` AND o.total_amount <= $${paramCount}`;
      params.push(parseFloat(max_amount as string));
      paramCount++;
    }

    // Получить заказы
    const ordersResult = await query(
      `SELECT o.*, u.first_name, u.last_name, u.username 
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.telegram_id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC`,
      params
    );

    if (format === 'csv') {
      // Экспортировать в CSV
      let csv = 'Order ID,User,Total Amount,Status,Delivery Type,Created At\n';
      
      for (const order of ordersResult.rows) {
        csv += `"${order.id}","${order.first_name} ${order.last_name}","${order.total_amount}","${order.status}","${order.delivery_type}","${order.created_at}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
      return res.send(csv);
    } else {
      // Excel по умолчанию
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders');

      worksheet.columns = [
        { header: 'Order ID', key: 'id', width: 15 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Amount', key: 'total_amount', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Delivery', key: 'delivery_type', width: 12 },
        { header: 'Created', key: 'created_at', width: 20 }
      ];

      for (const order of ordersResult.rows) {
        worksheet.addRow({
          id: order.id,
          customer: `${order.first_name} ${order.last_name}`,
          total_amount: order.total_amount,
          status: order.status,
          delivery_type: order.delivery_type,
          created_at: order.created_at
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
      return res.send(buffer);
    }
  } catch (err) {
    console.error('export error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}, ['admin', 'super_admin']);
