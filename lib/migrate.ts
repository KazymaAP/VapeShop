/**
 * Скрипт применения миграций БД
 * 
 * Использование:
 * node scripts/migrate.ts         # Применить все миграции
 * ts-node scripts/migrate.ts      # С TypeScript
 * npm run migrate                 # Если добавлена в package.json
 * 
 * На production должен запускаться автоматически при деплое.
 */

import { query } from './db';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

interface Migration {
  name: string;
  path: string;
  content: string;
  timestamp: number;
}

/**
 * Создаёт таблицу для отслеживания примененных миграций
 */
async function initMigrationsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Таблица schema_migrations готова');
  } catch (err) {
    console.error('❌ Ошибка создания таблицы schema_migrations:', err);
    throw err;
  }
}

/**
 * Получает список примененных миграций
 */
async function getAppliedMigrations(): Promise<Set<string>> {
  try {
    const result = await query('SELECT version FROM schema_migrations');
    return new Set(result.rows.map((r: any) => r.version));
  } catch (err) {
    console.error('❌ Ошибка чтения примененных миграций:', err);
    return new Set();
  }
}

/**
 * Получает все миграции из папки, отсортированные по имени
 */
function getMigrationFiles(): Migration[] {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => ({
      name: file,
      path: path.join(MIGRATIONS_DIR, file),
      content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'),
      timestamp: fs.statSync(path.join(MIGRATIONS_DIR, file)).mtimeMs,
    }));
  } catch (err) {
    console.error('❌ Ошибка чтения миграций:', err);
    return [];
  }
}

/**
 * Применяет одну миграцию
 */
async function applyMigration(migration: Migration): Promise<void> {
  try {
    console.log(`📝 Применение миграции: ${migration.name}`);

    await query(migration.content);

    await query(
      `INSERT INTO schema_migrations (version, name, applied_at) 
       VALUES ($1, $2, NOW())`,
      [migration.name, migration.name]
    );

    console.log(`✅ Миграция ${migration.name} успешно применена`);
  } catch (err: any) {
    console.error(`❌ Ошибка при применении ${migration.name}:`, err.message);
    throw err;
  }
}

/**
 * Главная функция применения всех миграций
 */
async function migrate(): Promise<void> {
  try {
    console.log('🚀 Начало применения миграций...\n');

    // Создаём таблицу отслеживания
    await initMigrationsTable();

    // Получаем примененные миграции
    const appliedMigrations = await getAppliedMigrations();
    console.log(`📊 Уже применено миграций: ${appliedMigrations.size}\n`);

    // Получаем все миграции
    const allMigrations = getMigrationFiles();
    console.log(`📁 Найдено файлов миграций: ${allMigrations.length}\n`);

    // Применяем неприменённые миграции
    let appliedCount = 0;
    for (const migration of allMigrations) {
      if (!appliedMigrations.has(migration.name)) {
        await applyMigration(migration);
        appliedCount++;
      } else {
        console.log(`⏭️  Миграция ${migration.name} уже применена (пропускаем)`);
      }
    }

    console.log(`\n✅ Миграции завершены! Применено новых миграций: ${appliedCount}`);
  } catch (err) {
    console.error('\n❌ Ошибка при применении миграций:', err);
    process.exit(1);
  }
}

// Запуск миграций если скрипт вызван напрямую
if (require.main === module) {
  migrate();
}

export { migrate, getMigrationFiles, getAppliedMigrations };
