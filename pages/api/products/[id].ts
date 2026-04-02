import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    const result = await query(
      `SELECT p.*, b.name as brand_name, c.name as category_name
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    await query('UPDATE products SET views = views + 1 WHERE id = $1', [id]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товара' });
  }
}
