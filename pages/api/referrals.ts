/**
 * API для реферальной системы
 * POST /api/referrals/generate - генерировать реферальный код
 * GET /api/referrals/stats - статистика реферала
 * POST /api/referrals/apply - применить реферальный код
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { ApiResponse } from '@/types/api';
import crypto from 'crypto';

export default requireAuth(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) => {
  const telegramId = getTelegramId(req);

  if (req.method === 'POST' && req.url?.includes('/generate')) {
    try {
      // Генерируем реферальный код (8 символов)
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();

      const result = await query(
        `INSERT INTO referral_codes (user_telegram_id, code, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (user_telegram_id) DO UPDATE SET code = $2
         RETURNING code, created_at`,
        [telegramId, code]
      );

      return res.status(200).json({
        data: {
          code: result.rows[0].code,
          link: `https://your-app.com/?ref=${result.rows[0].code}`,
        },
      });
    } catch (err) {
      console.error('Referral generation error:', err);
      return res.status(500).json({ error: 'Failed to generate referral code' });
    }
  }

  if (req.method === 'GET' && req.url?.includes('/stats')) {
    try {
      const stats = await query(
        `SELECT 
           rc.code,
           COUNT(DISTINCT r.referred_user_id) as total_referrals,
           SUM(CASE WHEN r.bonus_awarded THEN 1 ELSE 0 END) as bonus_awarded,
           SUM(COALESCE(r.bonus_amount, 0)) as total_bonus
         FROM referral_codes rc
         LEFT JOIN referrals r ON rc.user_telegram_id = r.referrer_id
         WHERE rc.user_telegram_id = $1
         GROUP BY rc.code`,
        [telegramId]
      );

      if (stats.rows.length === 0) {
        return res.status(200).json({
          data: {
            code: null,
            total_referrals: 0,
            bonus_awarded: 0,
            total_bonus: 0,
          },
        });
      }

      return res.status(200).json({ data: stats.rows[0] });
    } catch (err) {
      console.error('Referral stats error:', err);
      return res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
  }

  if (req.method === 'POST' && req.url?.includes('/apply')) {
    try {
      const { referralCode } = req.body;

      if (!referralCode) {
        return res.status(400).json({ error: 'Referral code required' });
      }

      // Находим реферера
      const referrer = await query(
        `SELECT user_telegram_id FROM referral_codes WHERE code = $1 AND is_active = true`,
        [referralCode]
      );

      if (referrer.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }

      const referrerId = referrer.rows[0].user_telegram_id;

      // Проверяем что это не сам себя
      if (referrerId === parseInt(telegramId)) {
        return res.status(400).json({ error: 'Cannot use own referral code' });
      }

      // Добавляем запись реферала
      await query(
        `INSERT INTO referrals (referrer_id, referred_user_id, status)
         VALUES ($1, $2, 'pending')
         ON CONFLICT (referrer_id, referred_user_id) DO NOTHING`,
        [referrerId, telegramId]
      );

      // Если у нового пользователя первый заказ - начисляем бонусы обоим
      const firstOrder = await query(
        `SELECT COUNT(*) as count FROM orders WHERE user_telegram_id = $1`,
        [telegramId]
      );

      if (parseInt(firstOrder.rows[0].count) === 0) {
        // Начисляем бонусы
        const bonusAmount = 50; // 50 рублей

        await query(
          `UPDATE referrals 
           SET bonus_awarded = true, bonus_amount = $1, bonus_type = 'signup'
           WHERE referrer_id = $2 AND referred_user_id = $3`,
          [bonusAmount, referrerId, telegramId]
        );

        // Добавляем в личный счёт
        await query(
          `INSERT INTO user_balance (user_telegram_id, balance)
           VALUES ($1, $2)
           ON CONFLICT (user_telegram_id) DO UPDATE SET balance = balance + $2`,
          [referrerId, bonusAmount]
        );
      }

      return res.status(200).json({
        data: {
          message: 'Referral code applied successfully',
          bonusMessage: 'Получите бонус 50₽ после первого заказа',
        },
      });
    } catch (err) {
      console.error('Referral apply error:', err);
      return res.status(500).json({ error: 'Failed to apply referral code' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
