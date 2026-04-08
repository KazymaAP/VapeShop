import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse, ApiError } from '@/types/api';
import crypto from 'crypto';

type ApiResponseType = ApiResponse | ApiError;

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponseType>) {
  // Получаем текущего пользователя с HMAC проверкой
  const telegramId = await getTelegramIdFromRequest(req);

  if (!telegramId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - invalid Telegram verification',
      timestamp: Date.now(),
    });
  }

  try {
    if (req.method === 'GET') {
      // ============ GET: Получить статистику реферала ============
      const stats = await query(
        `SELECT 
           rc.code,
           COUNT(DISTINCT r.referred_user_id) as total_referrals,
           SUM(CASE WHEN r.bonus_awarded THEN 1 ELSE 0 END) as bonus_awarded,
           SUM(COALESCE(r.bonus_amount, 0)) as total_bonus,
           rc.created_at
         FROM referral_codes rc
         LEFT JOIN referrals r ON rc.user_telegram_id = r.referrer_id
         WHERE rc.user_telegram_id = $1
         GROUP BY rc.code, rc.created_at`,
        [telegramId]
      );

      if (stats.rows.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            code: null,
            total_referrals: 0,
            bonus_awarded: 0,
            total_bonus: 0,
          },
          timestamp: Date.now(),
        });
      }

      return res.status(200).json({ success: true, data: stats.rows[0], timestamp: Date.now() });
    } else if (req.method === 'POST') {
      // ============ POST: Действия с рефералами ============
      const { action, referralCode } = req.body;

      if (!action || typeof action !== 'string') {
        return res
          .status(400)
          .json({ success: false, error: 'Action parameter required', timestamp: Date.now() });
      }

      if (action === 'generate') {
        // ===== Генерировать новый реферальный код =====
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();

        const result = await query(
          `INSERT INTO referral_codes (user_telegram_id, code, is_active, created_at)
           VALUES ($1, $2, true, NOW())
           ON CONFLICT (user_telegram_id) DO UPDATE 
           SET code = $2, is_active = true, created_at = NOW()
           RETURNING code, created_at`,
          [telegramId, code]
        );

        if (result.rows.length === 0) {
          return res
            .status(500)
            .json({ success: false, error: 'Failed to generate code', timestamp: Date.now() });
        }

        return res.status(200).json({
          success: true,
          data: {
            code: result.rows[0].code,
            link: `${process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://your-app.com'}/?ref=${result.rows[0].code}`,
            createdAt: result.rows[0].created_at,
          },
          timestamp: Date.now(),
        });
      } else if (action === 'apply') {
        // ===== Применить реферальный код =====
        if (!referralCode || typeof referralCode !== 'string') {
          return res
            .status(400)
            .json({ success: false, error: 'Referral code required', timestamp: Date.now() });
        }

        // Валидируем формат кода (8 символов, только hex)
        if (!/^[A-F0-9]{8}$/.test(referralCode)) {
          return res
            .status(400)
            .json({ success: false, error: 'Invalid referral code format', timestamp: Date.now() });
        }

        // Находим реферера
        const referrer = await query(
          `SELECT user_telegram_id FROM referral_codes 
           WHERE code = $1 AND is_active = true`,
          [referralCode.toUpperCase()]
        );

        if (referrer.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or inactive referral code',
            timestamp: Date.now(),
          });
        }

        const referrerId = referrer.rows[0].user_telegram_id;

        // Проверяем, что это не сам себя приглашает
        if (referrerId === telegramId) {
          return res
            .status(400)
            .json({ success: false, error: 'Cannot use own referral code', timestamp: Date.now() });
        }

        // Проверяем, что пользователь ещё не применил другой код
        const existingReferral = await query(
          `SELECT id FROM referrals WHERE referred_user_id = $1 LIMIT 1`,
          [telegramId]
        );

        if (existingReferral.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'You already used a referral code',
            timestamp: Date.now(),
          });
        }

        // Добавляем запись реферала
        const refResult = await query(
          `INSERT INTO referrals (referrer_id, referred_user_id, status, created_at)
           VALUES ($1, $2, 'pending', NOW())
           ON CONFLICT (referrer_id, referred_user_id) DO NOTHING
           RETURNING id`,
          [referrerId, telegramId]
        );

        if (refResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'This referral is already applied',
            timestamp: Date.now(),
          });
        }

        // Проверяем, есть ли уже заказы у этого пользователя
        const orders = await query(
          `SELECT COUNT(*) as count FROM orders 
           WHERE user_telegram_id = $1`,
          [telegramId]
        );

        const hasOrders = parseInt(orders.rows[0].count, 10) > 0;

        // Если первый заказ - начисляем бонусы
        if (!hasOrders) {
          const bonusAmount = 50; // 50 рублей

          await query(
            `UPDATE referrals 
             SET bonus_awarded = true, bonus_amount = $1, bonus_type = 'signup'
             WHERE referrer_id = $2 AND referred_user_id = $3`,
            [bonusAmount, referrerId, telegramId]
          );

          // Добавляем в личный счёт реферера
          await query(
            `INSERT INTO user_balance (user_telegram_id, balance, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_telegram_id) DO UPDATE 
             SET balance = balance + $2, updated_at = NOW()`,
            [referrerId, bonusAmount]
          );
        }

        return res.status(200).json({
          success: true,
          data: {
            message: 'Referral code applied successfully',
            bonusInfo: hasOrders
              ? 'Бонусы дарят только при первом заказе'
              : 'Вы получите 50₽ бонуса после вашего первого заказа',
          },
          timestamp: Date.now(),
        });
      } else {
        return res
          .status(400)
          .json({ success: false, error: 'Invalid action', timestamp: Date.now() });
      }
    } else {
      return res
        .status(405)
        .json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ success: false, error, timestamp: Date.now() });
  }
}

// Экспортируем с Rate Limiting ✅
export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
