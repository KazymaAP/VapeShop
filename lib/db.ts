import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // обязательно для Neon
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
