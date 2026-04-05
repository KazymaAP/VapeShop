import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { validatePagination } from '@/lib/validate';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse } from '../../../types/api';

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
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(new Date(String(date_from)).toISOString());
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(new Date(String(date_to)).toISOString());
      paramCount++;
    }

    const offset = (pageNum - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const orderBy = sort === '-created_at' ? 'ORDER BY created_at DESC' : 'ORDER BY created_at ASC';

    const logsResult = await query(
      `SELECT * FROM audit_log WHERE ${whereClause} ${orderBy} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    const response: ApiResponse = {
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      timestamp: Date.now(),
    };

    res.status(200).json(response);
  } catch (err) {
    console.error('audit-logs error:', err);
    res.status(500).json({ error: 'Internal Server Error', success: false, timestamp: Date.now() });
  }
}

export default requireAuth(rateLimit(handler, RATE_LIMIT_PRESETS.normal), [
  'super_admin',
  'admin',
  'manager',
]);
