import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { status, user_id } = req.query;

      let whereClause = '1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (user_id) {
        whereClause += ` AND user_id = $${paramCount}`;
        params.push(user_id);
        paramCount++;
      }

      const result = await query(
        `SELECT * FROM support_tickets WHERE ${whereClause} ORDER BY created_at DESC`,
        params
      );

      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error('Error fetching tickets:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { subject, message, related_order_id } = req.body;
      const telegramId = req.headers['x-telegram-id'] as string;

      const result = await query(
        'INSERT INTO support_tickets (user_id, subject, message, related_order_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [telegramId, subject, message, related_order_id]
      );

      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      console.error('Error creating ticket:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['support', 'customer', 'admin']);
