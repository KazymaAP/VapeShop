import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM promocodes ORDER BY code');
      res.status(200).json({ promocodes: result.rows });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки промокодов' });
    }
  } else if (req.method === 'POST') {
    try {
      const { code, discount_type, discount_value, valid_from, valid_until, min_order_amount, max_uses } = req.body;
      if (!code || !discount_type || discount_value === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await query(
        `INSERT INTO promocodes (code, discount_type, discount_value, valid_from, valid_until, min_order_amount, max_uses)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [code.toUpperCase(), discount_type, discount_value, valid_from || null, valid_until || null, min_order_amount || 0, max_uses || null]
      );
      res.status(200).json({ promocode: result.rows[0] });
    } catch {
      res.status(500).json({ error: 'Ошибка создания промокода' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { code, discount_type, discount_value, valid_from, valid_until, min_order_amount, max_uses } = req.body;
      if (!code) return res.status(400).json({ error: 'code required' });

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (discount_type !== undefined) { fields.push(`discount_type = $${idx++}`); values.push(discount_type); }
      if (discount_value !== undefined) { fields.push(`discount_value = $${idx++}`); values.push(discount_value); }
      if (valid_from !== undefined) { fields.push(`valid_from = $${idx++}`); values.push(valid_from); }
      if (valid_until !== undefined) { fields.push(`valid_until = $${idx++}`); values.push(valid_until); }
      if (min_order_amount !== undefined) { fields.push(`min_order_amount = $${idx++}`); values.push(min_order_amount); }
      if (max_uses !== undefined) { fields.push(`max_uses = $${idx++}`); values.push(max_uses); }

      values.push(code.toUpperCase());
      await query(`UPDATE promocodes SET ${fields.join(', ')} WHERE code = $${idx}`, values);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления промокода' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { code } = req.query;
      if (!code) return res.status(400).json({ error: 'code required' });

      await query('DELETE FROM promocodes WHERE code = $1', [code]);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка удаления промокода' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
