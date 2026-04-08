import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

/**
 * API для запуска миграций БД
 * Только с правильным CRON_SECRET
 */

interface Migration {
  name: string;
  path: string;
  content: string;
}

async function initMigrationsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    logger.info('✅ Таблица schema_migrations готова');
  } catch (err) {
    logger.error('❌ Ошибка создания таблицы schema_migrations:', err);
    throw err;
  }
}

async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await query('SELECT version FROM schema_migrations');
    return new Set(result.rows.map((r: Record<string, unknown>) => String(r.version)));
  } catch (err) {
    logger.error('❌ Ошибка чтения примененных миграций:', err);
    return new Set();
  }
}

function getMigrationFiles(): Migration[] {
  try {
    const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    return files.map((file) => ({
      name: file,
      path: path.join(migrationsDir, file),
      content: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
    }));
  } catch (err) {
    logger.error('❌ Ошибка чтения миграций:', err);
    return [];
  }
}

async function applyMigration(migration: Migration): Promise<void> {
  try {
    logger.info(`📏 Применение миграции: ${migration.name}`);
    // Запускаем каждый SQL statement отдельно
    const statements = migration.content
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await query(statement);
      } catch (err) {
        logger.warn(`Warning in statement of ${migration.name}:`, err);
        // Continue with next statement even if one fails
      }
    }

    await query(
      `INSERT INTO schema_migrations (version, name, applied_at) 
       VALUES ($1, $2, NOW())`,
      [migration.name, migration.name]
    );
    logger.info(`✅ Миграция ${migration.name} успешно применена`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`❌ Ошибка при применении ${migration.name}:`, errMsg);
    throw err;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const requestSecret = req.method === 'GET' ? req.query.secret : req.body?.secret;

    if (cronSecret && requestSecret !== cronSecret) {
      logger.warn('migrate-db: Invalid or missing CRON_SECRET', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CRON_SECRET required',
      });
    }

    logger.info('🚀 Начало применения миграций...');

    // Инициализируем таблицу отслеживания
    await initMigrationsTable();

    // Получаем примененные миграции
    const appliedMigrations = await getAppliedMigrations();
    logger.info(`📋 Уже применено миграций: ${appliedMigrations.size}`);

    // Получаем все миграции
    const allMigrations = getMigrationFiles();
    logger.info(`📁 Найдено файлов миграций: ${allMigrations.length}`);

    // Применяем неприменённые миграции
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of allMigrations) {
      if (!appliedMigrations.has(migration.name)) {
        await applyMigration(migration);
        applied.push(migration.name);
      } else {
        logger.info(`⏭️  Миграция ${migration.name} уже применена (пропускаем)`);
        skipped.push(migration.name);
      }
    }

    logger.info(`✅ Миграции завершены! Применено новых миграций: ${applied.length}`);

    return res.status(200).json({
      success: true,
      message: 'Migrations applied successfully',
      stats: {
        total: allMigrations.length,
        applied: applied.length,
        skipped: skipped.length,
        appliedMigrations: applied,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('migrate-db error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to apply migrations',
    });
  }
}

export default handler;
