/**
 * Cron job для очистки старых сессий и данных
 * GET /api/cron/cleanup-old-sessions
 * Запускается ежедневно в 2:00 AM
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { verifyCronSecret } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { CRON_LIMITS } from '@/lib/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ⚠️ КРИТИЧНО: Проверяем CRON_SECRET с защитой от timing attacks
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let cleanedRows = 0;

    // 1. HIGH-009 FIX: Use soft delete for audit trail instead of hard DELETE
    const referralResult = await query(
      `UPDATE referrals SET deleted_at = NOW()
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '${CRON_LIMITS.CLEANUP_REFERRALS_DAYS} days' AND deleted_at IS NULL`,
      []
    );
    cleanedRows += referralResult.rowCount || 0;

    // 2. MEDIUM-004 FIX: Use CRON_LIMITS constants for magic numbers
    const csvResult = await query(
      `DELETE FROM csv_import_progress 
       WHERE created_at < NOW() - INTERVAL '${CRON_LIMITS.CLEANUP_CSV_DAYS} days'`,
      []
    );
    cleanedRows += csvResult.rowCount || 0;

    // 3. Удаляем старые отправленные уведомления (старше N дней)
    const notifResult = await query(
      `DELETE FROM price_drop_notifications 
       WHERE notified = true AND notified_at < NOW() - INTERVAL '${CRON_LIMITS.CLEANUP_NOTIFICATIONS_DAYS} days'`,
      []
    );
    cleanedRows += notifResult.rowCount || 0;

    // 4. Удаляем старые записи аудита (старше N дней)
    const auditResult = await query(
      `DELETE FROM audit_log 
       WHERE created_at < NOW() - INTERVAL '${CRON_LIMITS.CLEANUP_OLD_AUDIT_DAYS} days'`,
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
    logger.info(`Cleanup completed: Removed ${cleanedRows} old records`);

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
    logger.error('Cleanup job failed:', err);

    return res.status(500).json({
      error: 'Cleanup job failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
