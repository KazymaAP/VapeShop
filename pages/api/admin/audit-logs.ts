import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, getTelegramId } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      action,
      target_type,
      date_from,
      date_to,
      page = '1',
      limit = '50',
      sort = '-created_at'
    } = req.query;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (user_id) {
      whereClause += ` AND user_id = $${paramCount}`;
      params.push(parseInt(user_id as string));
      paramCount++;
    }

    if (action) {
      whereClause += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (target_type) {
      whereClause += ` AND target_type = $${paramCount}`;
      params.push(target_type);
      paramCount++;
    }

    if (date_from) {
      whereClause += ` AND created_at >= $${paramCount}`;
      params.push(new Date(date_from as string));
      paramCount++;
    }

    if (date_to) {
      whereClause += ` AND created_at <= $${paramCount}`;
      params.push(new Date(date_to as string));
      paramCount++;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const orderBy = sort === '-created_at' 
      ? 'ORDER BY created_at DESC' 
      : 'ORDER BY created_at ASC';
    
    const logsResult = await query(
      `SELECT * FROM audit_log WHERE ${whereClause} ${orderBy} LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limitNum, offset]
    );

    res.status(200).json({
      data: logsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('audit-logs error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}, ['super_admin', 'admin']);
