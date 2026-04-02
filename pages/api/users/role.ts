import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id, role } = req.body;
    if (!telegram_id || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRoles = ['admin', 'manager', 'seller', 'buyer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await query('UPDATE users SET role = $1 WHERE telegram_id = $2', [role, telegram_id]);
    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Ошибка обновления роли' });
  }
}
