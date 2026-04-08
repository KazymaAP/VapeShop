import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramIdFromRequest } from '@/lib/auth';
import { Bot } from 'grammy';
import { logger } from '@/lib/logger';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { message, telegram_ids, sender_id } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }

      // Получаем текущего пользователя
      const currentTelegramId = await getTelegramIdFromRequest(req);
      if (!currentTelegramId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // КРИТИЧЕСКАЯ ЗАЩИТА: Проверяем, что sender_id совпадает с текущим пользователем
      // Это предотвращает спуфирование рассылок от имени другого администратора
      if (sender_id && sender_id !== currentTelegramId) {
        logger.warn(
          `[SECURITY] Broadcast spoofing attempt: user ${currentTelegramId} tried to send from ${sender_id}`
        );
        return res.status(403).json({ error: 'Cannot broadcast on behalf of another admin' });
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
          // Add timeout to prevent hanging on broadcast
          await Promise.race([
            bot.api.sendMessage(telegramId, message),
            new Promise<void>((_, reject) =>
              setTimeout(() => reject(new Error('Message send timeout')), 10000)
            ),
          ]);
          sent++;
        } catch (err) {
          logger.error(`Failed to send message to ${telegramId}:`, err);
          failed++;
        }
      }

      // Логируем с текущим пользователем, а не переданным (важно для безопасности)
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, details) VALUES ($1, $2, $3, $4)`,
        [
          currentTelegramId,
          'broadcast',
          'broadcast',
          JSON.stringify({ sent, failed, total: recipients.length, sender_id: currentTelegramId }),
        ]
      );

      res.status(200).json({
        message: `Рассылка завершена: ${sent} отправлено, ${failed} ошибок`,
        sent,
        failed,
      });
    } catch (err) {
      logger.error('Broadcast error:', err);
      res.status(500).json({ error: 'Ошибка рассылки' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
