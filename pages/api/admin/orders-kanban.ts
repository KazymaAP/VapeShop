import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface KanbanOrder {
  id: string;
  code_6digit: string;
  customer_name: string;
  total_price: number;
  status: string;
  created_at: string;
  user_telegram_id: number;
}

interface KanbanResponse {
  [key: string]: KanbanOrder[];
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешён' });
  }

  try {
    // Получаем параметры фильтрации
    const { dateFrom, dateTo, searchCustomer } = req.query;

    // Строим SQL запрос с фильтрами
    let sqlWhere = '1=1';
    const params: (string | number)[] = [];

    if (dateFrom && typeof dateFrom === 'string') {
      sqlWhere += ` AND o.created_at >= $${params.length + 1}::timestamp`;
      params.push(dateFrom);
    }

    if (dateTo && typeof dateTo === 'string') {
      sqlWhere += ` AND o.created_at <= $${params.length + 1}::timestamp + interval '1 day'`;
      params.push(dateTo);
    }

    if (searchCustomer && typeof searchCustomer === 'string') {
      sqlWhere += ` AND (u.first_name ILIKE $${params.length + 1} OR u.last_name ILIKE $${params.length + 1} OR o.user_telegram_id::text ILIKE $${params.length + 1})`;
      params.push(`%${searchCustomer}%`);
      params.push(`%${searchCustomer}%`);
    }

    // Получаем все заказы, отсортированные по статусам
    const result = await query(
      `SELECT 
        o.id, 
        o.code_6digit, 
        u.first_name || ' ' || COALESCE(u.last_name, '') as customer_name, 
        o.total as total_price, 
        o.status, 
        o.created_at,
        o.user_telegram_id
       FROM orders o
       LEFT JOIN users u ON o.user_telegram_id = u.telegram_id
       WHERE ${sqlWhere}
       ORDER BY o.status ASC, o.created_at DESC`,
      params
    );

    // Группируем заказы по статусам
    const kanbanData: KanbanResponse = {
      new: [],
      confirmed: [],
      readyship: [],
      shipped: [],
      done: [],
      cancelled: [],
    };

    result.rows.forEach((order: KanbanOrder) => {
      const status = order.status || 'new';
      if (kanbanData[status]) {
        kanbanData[status].push(order);
      }
    });

    res.status(200).json(kanbanData);
  } catch (_err) {
    logger.error('Kanban API error:', _err);
    res.status(500).json({ error: 'Ошибка при получении данных канбана' });
  }
}

export default requireAuth(handler, ['admin', 'manager']);
