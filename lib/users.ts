import { query } from '../lib/db';

export async function getUserByTelegramId(telegramId: number) {
  const res = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return res.rows[0] || null;
}

export async function createUser(data: {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  referral_code?: string;
  referred_by?: number;
}) {
  const res = await query(
    `INSERT INTO users (telegram_id, first_name, last_name, username, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      data.telegram_id,
      data.first_name,
      data.last_name || null,
      data.username || null,
      data.referral_code || null,
      data.referred_by || null,
    ]
  );
  return res.rows[0];
}

export async function updateUserLastSeen(telegramId: number) {
  await query('UPDATE users SET last_seen = NOW() WHERE telegram_id = $1', [telegramId]);
}
