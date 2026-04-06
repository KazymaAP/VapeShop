import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import { requireAuth, getTelegramId } from '../../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Получить все настройки уведомлений
      const result = await query(
        `SELECT id, event_type, is_enabled, target_role
         FROM notification_settings
         ORDER BY event_type ASC`
      );

      const settings = result.rows.map((row) => ({
        id: row.id,
        event_type: row.event_type,
        is_enabled: row.is_enabled,
        target_role: row.target_role,
      }));

      // Получить статистику
      const statsResult = await query(
        `SELECT 
           COUNT(*) as total_sent,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed
         FROM notification_history
         WHERE sent_at >= NOW() - INTERVAL '7 days'`
      );

      const stats = {
        total_sent: parseInt(statsResult.rows[0]?.total_sent || 0),
        total_failed: parseInt(statsResult.rows[0]?.total_failed || 0),
        success_rate:
          statsResult.rows[0]?.total_sent > 0
            ? (
                ((statsResult.rows[0]?.total_sent - statsResult.rows[0]?.total_failed) /
                  statsResult.rows[0]?.total_sent) *
                100
              ).toFixed(1)
            : 0,
      };

      res.status(200).json({ settings, stats });
    } catch (err) {
      console.error('GET notification settings error:', err);
      res.status(500).json({ error: 'Ошибка загрузки настроек' });
    }
  } else if (req.method === 'POST') {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }

      let updated = 0;

      // Обновляем каждую настройку
      for (const update of updates) {
        const { id, is_enabled, target_role } = update;

        if (!id) continue;

        const result = await query(
          `UPDATE notification_settings
           SET is_enabled = $1, target_role = $2, updated_at = NOW()
           WHERE id = $3`,
          [is_enabled, target_role, id]
        );

        if (result.rowCount !== null && result.rowCount > 0) {
          updated++;
        }
      }

      // Логируем действие админа (HIGH-023: unified audit_log)
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO audit_log (user_id, action, target_type, details, status) VALUES ($1, $2, $3, $4, $5)`,
        [
          telegramId,
          'update_notification_settings',
          'notification',
          JSON.stringify({ updated_count: updated }),
          'success',
        ]
      ).catch((err) => console.error('Logging error:', err));

      res.status(200).json({
        success: true,
        message: `Обновлено ${updated} настроек`,
        updated,
      });
    } catch (err) {
      console.error('POST notification settings error:', err);
      res.status(500).json({ error: 'Ошибка сохранения настроек' });
    }
  } else if (req.method === 'PUT') {
    // Альтернативный эндпоинт для обновления одной настройки
    try {
      const { event_type, is_enabled, target_role } = req.body;

      if (!event_type) {
        return res.status(400).json({ error: 'event_type is required' });
      }

      const result = await query(
        `UPDATE notification_settings
         SET is_enabled = COALESCE($1, is_enabled),
             target_role = COALESCE($2, target_role),
             updated_at = NOW()
         WHERE event_type = $3
         RETURNING *`,
        [is_enabled !== undefined ? is_enabled : null, target_role || null, event_type]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      // Логируем
      const telegramId = getTelegramId(req);
      await query(`INSERT INTO audit_log (user_telegram_id, action, details) VALUES ($1, $2, $3)`, [
        telegramId,
        'update_notification_setting',
        JSON.stringify({
          event_type,
          old_enabled: result.rows[0].is_enabled,
          new_enabled: is_enabled,
          target_role,
        }),
      ]).catch((err) => console.error('Logging error:', err));

      res.status(200).json({
        success: true,
        setting: result.rows[0],
      });
    } catch (err) {
      console.error('PUT notification settings error:', err);
      res.status(500).json({ error: 'Ошибка обновления' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Защита: только админы
export default requireAuth(handler, ['admin']);
