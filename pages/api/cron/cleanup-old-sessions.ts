/**
 * Cron job для очистки старых сессий и данных
 * GET /api/cron/cleanup-old-sessions
 * Запускается ежедневно в 2:00 AM
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверяем CRON_SECRET
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let cleanedRows = 0;

    // 1. Удаляем истёкшие рефереальные ссылки (старше 365 дней)
    const referralResult = await query(
      `DELETE FROM referrals 
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '365 days'`,
      []
    );
    cleanedRows += referralResult.rowCount || 0;

    // 2. Удаляем старые CSV импорты (старше 30 дней)
    const csvResult = await query(
      `DELETE FROM csv_import_progress 
       WHERE created_at < NOW() - INTERVAL '30 days'`,
      []
    );
    cleanedRows += csvResult.rowCount || 0;

    // 3. Удаляем старые отправленные уведомления (старше 90 дней)
    const notifResult = await query(
      `DELETE FROM price_drop_notifications 
       WHERE notified = true AND notified_at < NOW() - INTERVAL '90 days'`,
      []
    );
    cleanedRows += notifResult.rowCount || 0;

    // 4. Удаляем старые записи аудита (старше 180 дней)
    const auditResult = await query(
      `DELETE FROM audit_log 
       WHERE created_at < NOW() - INTERVAL '180 days'`,
      []
    );
    cleanedRows += auditResult.rowCount || 0;

    // 5. Архивируем завершённые заказы (старше 1 года) - помещаем в архив таблицу
    const archiveResult = await query(
      `INSERT INTO order_archive 
       SELECT * FROM orders 
       WHERE status = 'completed' AND created_at < NOW() - INTERVAL '1 year'
       AND id NOT IN (SELECT order_id FROM order_archive)`,
      []
    );

    // 6. Удаляем архивированные заказы из основной таблицы
    const deleteArchivedResult = await query(
      `DELETE FROM orders 
       WHERE status = 'completed' AND created_at < NOW() - INTERVAL '1 year'
       AND id IN (SELECT order_id FROM order_archive)`,
      []
    );
    cleanedRows += deleteArchivedResult.rowCount || 0;

    // Логируем операцию
    console.log(`Cleanup completed: Removed ${cleanedRows} old records`);

    return res.status(200).json({
      message: 'Cleanup completed successfully',
      rowsCleaned: cleanedRows,
      timestamp: new Date().toISOString(),
      details: {
        expiredReferrals: referralResult.rowCount,
        oldCsvImports: csvResult.rowCount,
        oldNotifications: notifResult.rowCount,
        oldAuditLogs: auditResult.rowCount,
        archivedOrders: archiveResult.rowCount,
        deletedArchivedOrders: deleteArchivedResult.rowCount,
      },
    });
  } catch (err) {
    console.error('Cleanup job failed:', err);

    return res.status(500).json({
      error: 'Cleanup job failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
