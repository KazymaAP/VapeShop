import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';
import { Pool } from 'pg';

/**
 * API для инициализации БД с нуля
 * Создает все необходимые таблицы напрямую
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    const requestSecret = req.method === 'GET' ? req.query.secret : req.body?.secret;

    if (cronSecret && requestSecret !== cronSecret) {
      logger.warn('init-db: Invalid CRON_SECRET', {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      });
      return res.status(403).json({ error: 'Forbidden', message: 'CRON_SECRET required' });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    logger.info('🚀 Инициализация БД...');

    const client = await pool.connect();

    try {
      // Создаем таблицу пользователей
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          telegram_id BIGINT PRIMARY KEY,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          username VARCHAR(255) UNIQUE,
          role VARCHAR(20) DEFAULT 'customer',
          is_blocked BOOLEAN DEFAULT FALSE,
          phone VARCHAR(20),
          email VARCHAR(255),
          lang VARCHAR(10) DEFAULT 'en',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `);
      logger.info('✅ Таблица users создана');

      // Создаем таблицу для отслеживания миграций
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW()
        );
      `);
      logger.info('✅ Таблица schema_migrations создана');

      // Создаем таблицу категорий
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          icon_emoji VARCHAR(10),
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      logger.info('✅ Таблица categories создана');

      // Создаем таблицу брендов
      await client.query(`
        CREATE TABLE IF NOT EXISTS brands (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          logo_url TEXT,
          website VARCHAR(255),
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      logger.info('✅ Таблица brands создана');

      // Создаем таблицу товаров
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          specification TEXT,
          description TEXT,
          stock INT DEFAULT 0,
          price DECIMAL(10, 2) NOT NULL,
          category_id INT REFERENCES categories(id) ON DELETE SET NULL,
          brand_id INT REFERENCES brands(id) ON DELETE SET NULL,
          images TEXT[] DEFAULT '{}',
          is_promotion BOOLEAN DEFAULT FALSE,
          is_hit BOOLEAN DEFAULT FALSE,
          is_new BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          views INT DEFAULT 0,
          rating DECIMAL(3, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(name, specification)
        );
      `);
      logger.info('✅ Таблица products создана');

      // Создаем таблицу заказов
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          status VARCHAR DEFAULT 'pending',
          total DECIMAL NOT NULL,
          delivery_method VARCHAR,
          delivery_date DATE,
          address TEXT,
          promo_code VARCHAR,
          discount DECIMAL DEFAULT 0,
          paid_at TIMESTAMP,
          code_6digit INT,
          code_expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_orders_user_telegram_id ON orders(user_telegram_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      `);
      logger.info('✅ Таблица orders создана');

      // Создаем таблицу корзины
      await client.query(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          user_telegram_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
          product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          quantity INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_telegram_id, product_id)
        );
      `);
      logger.info('✅ Таблица cart_items создана');

      logger.info('✅ БД инициализирована успешно');

      client.release();
      await pool.end();

      return res.status(200).json({
        success: true,
        message: 'Database initialized successfully',
      });
    } catch (err) {
      client.release();
      throw err;
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('init-db error:', error);
    return res.status(500).json({
      error: error.message,
    });
  }
}
