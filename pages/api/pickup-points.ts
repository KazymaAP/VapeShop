import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { buildUpdateSet } from '@/lib/sqlBuilder';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM pickup_points WHERE is_active = true ORDER BY name');
      res.status(200).json({ pickup_points: result.rows });
    } catch {
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
    } catch {
      res.status(500).json({ error: 'Ошибка создания точки' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, address, is_active } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      // 🔒 Безопасное построение SET clause с белым списком полей
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (address !== undefined) updates.address = address;
      if (is_active !== undefined) updates.is_active = is_active;

      const [setClause, values, nextIdx] = buildUpdateSet('pickup_points', updates);
      values.push(id);

      await query(`UPDATE pickup_points SET ${setClause} WHERE id = $${nextIdx}`, values);

      res.status(200).json({ success: true });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Pickup points update error:', error);
      res.status(400).json({ error: error.message || 'Ошибка обновления точки' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

