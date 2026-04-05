import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { message, telegram_ids } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }

      let recipients: number[] = [];

      if (telegram_ids && telegram_ids.length > 0) {
        recipients = telegram_ids;
      } else {
        const usersRes = await query('SELECT telegram_id FROM users WHERE is_blocked = false');
        recipients = usersRes.rows.map((r) => r.telegram_id);
      }

      let sent = 0;
      let failed = 0;

      for (const telegramId of recipients) {
        try {
          await bot.api.sendMessage(telegramId, message);
          sent++;
        } catch {
          failed++;
        }
      }

      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [
          req.body.sender_id || null,
          'broadcast',
          JSON.stringify({ sent, failed, total: recipients.length }),
        ]
      );

      res.status(200).json({
        message: `Рассылка завершена: ${sent} отправлено, ${failed} ошибок`,
        sent,
        failed,
      });
    } catch (err) {
      console.error('Broadcast error:', err);
      res.status(500).json({ error: 'Ошибка рассылки' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
