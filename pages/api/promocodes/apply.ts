import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, total } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code required' });
    }

    // Валидация формата прокода (длина 2-50, только буквы/цифры/дефис)
    if (
      typeof code !== 'string' ||
      code.length < 2 ||
      code.length > 50 ||
      !/^[A-Z0-9-]+$/i.test(code)
    ) {
      return res.status(400).json({ error: 'Invalid code format', valid: false });
    }

    const result = await query(
      `SELECT * FROM promocodes
       WHERE UPPER(code) = UPPER($1)
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

    // ❌ УБРАНО: await query('UPDATE promocodes SET used_count ...')
    // ✅ причина: нужно увеличивать used_count только ПОСЛЕ успешного платежа
    // ✅ это делается в pages/api/orders.ts в handlePaymentSuccess

    res.status(200).json({ valid: true, discount, type: promo.discount_type });
  } catch {
    res.status(500).json({ error: 'Ошибка проверки промокода' });
  }
}
