import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { telegram_id } = req.query;
      if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

      const result = await query(
        'SELECT * FROM addresses WHERE user_telegram_id = $1 ORDER BY is_default DESC, id',
        [telegram_id]
      );

      res.status(200).json({ addresses: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка загрузки адресов' });
    }
  } else if (req.method === 'POST') {
    try {
      const { telegram_id, address, is_default } = req.body;
      if (!telegram_id || !address) return res.status(400).json({ error: 'Missing fields' });

      if (is_default) {
        await query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [telegram_id]);
      }

      const result = await query(
        'INSERT INTO addresses (user_telegram_id, address, is_default) VALUES ($1, $2, $3) RETURNING *',
        [telegram_id, address, is_default || false]
      );

      res.status(200).json({ address: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка добавления адреса' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });

      await query('DELETE FROM addresses WHERE id = $1', [id]);

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка удаления адреса' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, is_default } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      if (is_default) {
        const addr = await query('SELECT user_telegram_id FROM addresses WHERE id = $1', [id]);
        await query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [addr.rows[0]?.user_telegram_id]);
      }

      await query('UPDATE addresses SET is_default = $1 WHERE id = $2', [is_default, id]);

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка обновления адреса' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
