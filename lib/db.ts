import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
