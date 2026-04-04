import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { buildUpdateSet } from '@/lib/sqlBuilder';

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

      // 🔒 Безопасное построение SET clause с белым списком полей
      const updates: Record<string, unknown> = {};
      if (discount_type !== undefined) updates.discount_type = discount_type;
      if (discount_value !== undefined) updates.discount_value = discount_value;
      if (valid_from !== undefined) updates.valid_from = valid_from;
      if (valid_until !== undefined) updates.valid_until = valid_until;
      if (min_order_amount !== undefined) updates.min_order_amount = min_order_amount;
      if (max_uses !== undefined) updates.max_uses = max_uses;

      const [setClause, values, nextIdx] = buildUpdateSet('promocodes', updates);
      values.push(code.toUpperCase());

      await query(`UPDATE promocodes SET ${setClause} WHERE code = $${nextIdx}`, values);
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Promocodes update error:', err);
      res.status(400).json({ error: err.message || 'Ошибка обновления промокода' });
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

