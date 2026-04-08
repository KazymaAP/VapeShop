/**
 * Database migration runner (Node.js, no TypeScript needed)
 * Usage: node scripts/migrate.js
 * On production: npm run migrate:prod
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get database connection from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

async function initMigrationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Таблица schema_migrations готова');
  } catch (err) {
    console.error('❌ Ошибка создания таблицы schema_migrations:', err.message);
    throw err;
  }
}

async function getAppliedMigrations() {
  try {
    const result = await pool.query('SELECT version FROM schema_migrations');
    return new Set(result.rows.map(r => String(r.version)));
  } catch (err) {
    console.error('❌ Ошибка чтения примененных миграций:', err.message);
    return new Set();
  }
}

function getMigrationFiles() {
  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(file => ({
      name: file,
      path: path.join(MIGRATIONS_DIR, file),
      content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'),
    }));
  } catch (err) {
    console.error('❌ Ошибка чтения миграций:', err.message);
    return [];
  }
}

async function applyMigration(migration) {
  try {
    console.log(`📏 Применение миграции: ${migration.name}`);

    await pool.query(migration.content);

    await pool.query(
      `INSERT INTO schema_migrations (version, name, applied_at) 
       VALUES ($1, $2, NOW())`,
      [migration.name, migration.name]
    );

    console.log(`✅ Миграция ${migration.name} успешно применена`);
  } catch (err) {
    console.error(`❌ Ошибка при применении ${migration.name}:`, err.message);
    throw err;
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await initMigrationsTable();

    const applied = await getAppliedMigrations();
    const migrations = getMigrationFiles();

    let count = 0;
    for (const migration of migrations) {
      if (!applied.has(migration.name)) {
        await applyMigration(migration);
        count++;
      }
    }

    if (count === 0) {
      console.log('✅ Все миграции уже применены');
    } else {
      console.log(`✅ Применено ${count} новых миграций`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('✅ Миграции завершены успешно');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Ошибка миграций:', err.message);
    process.exit(1);
  });
