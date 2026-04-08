import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../../lib/auth';
import { logger } from '@/lib/logger';

interface Message {
  id: number;
  ticket_id: string;
  user_id: number;
  reply_text: string;
  created_at: string;
  user_name?: string;
  is_admin?: boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ticketId = req.query.ticketId as string;
  const userId = getTelegramId(req);

  if (!ticketId) {
    return res.status(400).json({ error: 'Ticket ID required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - получить ответы на тикет
  if (req.method === 'GET') {
    try {
      // Проверяем доступ к тикету
      const ticketResult = await query(`SELECT user_id FROM support_tickets WHERE id = $1`, [
        ticketId,
      ]);

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketResult.rows[0];
      const userResult = await query(`SELECT role FROM users WHERE telegram_id = $1`, [userId]);

      const isAdmin =
        userResult.rows.length > 0 &&
        ['admin', 'super_admin', 'support'].includes(userResult.rows[0].role);

      // Проверяем доступ
      if (Number(ticket.user_id) !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await query(
        `SELECT 
           str.id,
           str.ticket_id,
           str.user_id,
           str.reply_text,
           str.created_at,
           u.first_name,
           u.last_name,
           u.role
         FROM support_ticket_replies str
         LEFT JOIN users u ON str.user_id = u.telegram_id
         WHERE str.ticket_id = $1
         ORDER BY str.created_at ASC`,
        [ticketId]
      );

      const replies: Message[] = result.rows.map((row: Record<string, unknown>) => ({
        id: row.id as number,
        ticket_id: row.ticket_id as string,
        user_id: row.user_id as number,
        reply_text: row.reply_text as string,
        created_at: row.created_at as string,
        user_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
        is_admin: ['admin', 'super_admin', 'support'].includes(row.role as string),
      }));

      return res.status(200).json({
        success: true,
        data: replies,
        timestamp: Date.now(),
      });
    } catch (_) {
      logger.error('Error fetching replies:', _);
      res.status(500).json({ error: 'Failed to fetch replies' });
    }
  }
  // POST - отправить ответ
  else if (req.method === 'POST') {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Проверяем доступ к тикету
      const ticketResult = await query(`SELECT user_id FROM support_tickets WHERE id = $1`, [
        ticketId,
      ]);

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketResult.rows[0];
      const userResult = await query(`SELECT role FROM users WHERE telegram_id = $1`, [userId]);

      const isAdmin =
        userResult.rows.length > 0 &&
        ['admin', 'super_admin', 'support'].includes(userResult.rows[0].role);

      // Проверяем доступ
      if (Number(ticket.user_id) !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const replyResult = await query(
        `INSERT INTO support_ticket_replies (ticket_id, user_id, reply_text)
         VALUES ($1, $2, $3)
         RETURNING id, ticket_id, user_id, reply_text, created_at`,
        [ticketId, userId, text.trim()]
      );

      if (replyResult.rows.length === 0) {
        throw new Error('Failed to insert reply');
      }

      // Обновляем timestamp тикета
      await query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [ticketId]).catch(
        () => {}
      );

      // Логируем действие
      await query(
        `INSERT INTO audit_log (user_id, action, target_type, details, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          'SUPPORT_REPLY',
          JSON.stringify({
            ticket_id: ticketId,
            reply_id: replyResult.rows[0].id,
            is_admin: isAdmin,
          }),
        ]
      ).catch(() => {});

      return res.status(201).json({
        success: true,
        data: replyResult.rows[0],
        timestamp: Date.now(),
      });
    } catch (_) {
      logger.error('Error sending reply:', _);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['support', 'admin', 'super_admin', 'customer']);
