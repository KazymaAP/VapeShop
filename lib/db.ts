import { Pool, PoolClient, QueryResult } from 'pg';

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
export async function query(text: string, params?: (string | number | boolean | null)[]): Promise<QueryResult> {
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
      console.warn(
        `DB query retry attempt ${attempt}/${maxRetries} after ${delay}ms:`,
        errorMessage
      );

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
 * @returns результат callback функции
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
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
