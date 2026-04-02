import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM pickup_points WHERE is_active = true ORDER BY name');
      res.status(200).json({ pickup_points: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка загрузки точек самовывоза' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, address } = req.body;
      if (!name || !address) return res.status(400).json({ error: 'Missing fields' });

      const result = await query(
        'INSERT INTO pickup_points (name, address) VALUES ($1, $2) RETURNING *',
        [name, address]
      );

      res.status(200).json({ pickup_point: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка создания точки' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, address, is_active } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
      if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

      values.push(id);
      await query(`UPDATE pickup_points SET ${fields.join(', ')} WHERE id = $${idx}`, values);

      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка обновления точки' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
