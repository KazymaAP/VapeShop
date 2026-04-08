import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from './logger';

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
});

// Основная функция query
export async function query(
  text: string,
  params?: (string | number | boolean | null | string[] | number[])[]
): Promise<QueryResult> {
  return pool.query(text, params);
}

/**
 * Выполнить запрос с автоматическим повтором при ошибке
 * Полезно для обработки временных ошибок сети
 *
 * @param text SQL запрос
 * @param params параметры запроса
 * @param maxRetries максимум попыток (по умолчанию 3)
 * @param delayMs задержка между попытками в миллисекундах (по умолчанию 500)
 * @returns результат запроса
 */
export async function queryWithRetry(
  text: string,
  params?: (string | number | boolean | null)[],
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<QueryResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      lastError = err as Error;

      // Не повторяем для ошибок синтаксиса и других non-retriable ошибок
      const errorMessage = (err as Error).message || '';
      if (
        errorMessage.includes('syntax error') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('UNIQUE violation') ||
        errorMessage.includes('FOREIGN KEY violation')
      ) {
        throw err;
      }

      // Если это последняя попытка, бросаем ошибку
      if (attempt === maxRetries) {
        break;
      }

      // Экспоненциальная задержка перед повтором
      const delay = delayMs * Math.pow(2, attempt - 1);
      logger.warn(`DB query retry attempt ${attempt}/${maxRetries} after ${delay}ms:`, {
        errorMessage,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Query failed after retries');
}

/**
 * Получить клиент БД для выполнения транзакций
 * Используйте для BEGIN/COMMIT/ROLLBACK
 *
 * @returns Promise<PoolClient>
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Выполнить запросы в транзакции
 *
 * @param callback функция, которая выполняет запросы
 * @param isolationLevel уровень изоляции (по умолчанию READ_COMMITTED)
 *                       'SERIALIZABLE' для критических операций (заказы, платежи)
 * @returns результат callback функции
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  isolationLevel:
    | 'READ_UNCOMMITTED'
    | 'READ_COMMITTED'
    | 'REPEATABLE_READ'
    | 'SERIALIZABLE' = 'READ_COMMITTED'
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Устанавливаем уровень изоляции для критических операций
    if (isolationLevel !== 'READ_COMMITTED') {
      await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
    }

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Логировать действие в audit_log таблицу
 * Используется для отслеживания изменений данных
 */
export async function logAuditAction(
  userId: number | string | null,
  action: string,
  entityType: string,
  entityId: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>,
  details?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, user_telegram_id, action, entity_type, entity_id, old_data, new_data, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        null,
        userId || null,
        action,
        entityType,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        details || null,
      ]
    );
  } catch (error) {
    // Log errors но не бросай, чтобы основная операция не сломалась
    logger.error('Failed to log audit action:', error);
  }
}

/**
 * Безопасное soft delete с логированием
 */
export async function softDelete(
  tableName: string,
  id: string,
  userId: number | string | null,
  reason?: string
): Promise<void> {
  // Сначала получим текущие данные
  const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);

  if (result.rows.length === 0) {
    throw new Error(`${tableName} with id ${id} not found`);
  }

  const oldData = result.rows[0];

  // Soft delete
  await query(
    `UPDATE ${tableName} SET deleted_at = NOW(), deleted_by = $1, deletion_reason = $2 WHERE id = $3`,
    [userId || null, reason || null, id]
  );

  // Логируем
  await logAuditAction(
    userId,
    'DELETE',
    tableName,
    id,
    oldData,
    undefined,
    `Soft delete. Reason: ${reason || 'Not provided'}`
  );
}
