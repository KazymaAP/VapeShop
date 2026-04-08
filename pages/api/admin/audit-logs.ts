import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validatePagination } from '@/lib/validate';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse } from '../../../types/api';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      action,
      table_name,
      date_from,
      date_to,
      page = '1',
      limit = '50',
      sort = '-created_at',
    } = req.query;

    // Валидация пагинации
    const pageNum = parseInt(String(page));
    const limitNum = Math.min(parseInt(String(limit)), 100);

    const validationErrors = validatePagination(pageNum, limitNum);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Invalid pagination', details: validationErrors });
    }

    let whereClause = '1=1';
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (user_id) {
      whereClause += ` AND user_telegram_id = $${paramCount}`;
      params.push(parseInt(String(user_id)));
      paramCount++;
    }

    if (action) {
      whereClause += ` AND action = $${paramCount}`;
      params.push(String(action));
      paramCount++;
    }

    if (table_name) {
      whereClause += ` AND table_name = $${paramCount}`;
      params.push(String(table_name));
      paramCount++;
    }

    if (date_from) {
      // ⚠️ ИСПРАВЛЕНО: Добавляем валидацию date parsing
      const dateFromObj = new Date(String(date_from));
      if (isNaN(dateFromObj.getTime())) {
        return res.status(400).json({
          error:
            'Invalid date format for date_from. Use ISO 8601 format (YYYY-MM-DD or ISO string)',
        });
      }
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(dateFromObj.toISOString());
      paramCount++;
    }

    if (date_to) {
      // ⚠️ ИСПРАВЛЕНО: Добавляем валидацию date parsing
      const dateToObj = new Date(String(date_to));
      if (isNaN(dateToObj.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format for date_to. Use ISO 8601 format (YYYY-MM-DD or ISO string)',
        });
      }
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(dateToObj.toISOString());
      paramCount++;
    }

    const offset = (pageNum - 1) * limitNum;

    const orderBy = sort === '-created_at' ? 'ORDER BY created_at DESC' : 'ORDER BY created_at ASC';

    // ⚠️ ИСПРАВЛЕНО: Используем window function COUNT(*) OVER() вместо отдельного COUNT запроса
    // Это даёт нам total и лимитированные данные в одном запросе вместо двух
    const logsResult = await query(
      `SELECT id, user_telegram_id, action, details, created_at,
              COUNT(*) OVER() as total
       FROM audit_log 
       WHERE ${whereClause} 
       ${orderBy} 
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    // Получаем total из первой строки (все строки имеют одно значение total)
    const _total = logsResult.rows.length > 0 ? parseInt(logsResult.rows[0].total) : 0;
    const totalPages = Math.ceil(_total / limitNum);

    const response: ApiResponse = {
      success: true,
      data: {
        logs: logsResult.rows.map((row: Record<string, unknown>) => {
          // Удаляем поле total из каждой строки (не нужно в ответе)
          const { total: _total, ...logData } = row;
          return logData;
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: _total,
          totalPages,
        },
      },
      timestamp: Date.now(),
    };

    res.status(200).json(response);
  } catch (err) {
    logger.error('audit-logs error:', err);
    res.status(500).json({ error: 'Internal Server Error', success: false, timestamp: Date.now() });
  }
}

export default requireAuth(rateLimit(handler, RATE_LIMIT_PRESETS.normal), [
  'super_admin',
  'admin',
  'manager',
]);
