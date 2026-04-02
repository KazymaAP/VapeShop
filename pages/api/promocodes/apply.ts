import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, total } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code required' });
    }

    const result = await query(
      `SELECT * FROM promocodes
       WHERE code = $1
       AND valid_from <= NOW()
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (max_uses IS NULL OR used_count < max_uses)
       AND $2 >= min_order_amount`,
      [code, total]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ valid: false });
    }

    const promo = result.rows[0];
    let discount = 0;

    if (promo.discount_type === 'percent') {
      discount = (total * promo.discount_value) / 100;
    } else {
      discount = promo.discount_value;
    }

    await query('UPDATE promocodes SET used_count = used_count + 1 WHERE code = $1', [code]);

    res.status(200).json({ valid: true, discount, type: promo.discount_type });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки промокода' });
  }
}
