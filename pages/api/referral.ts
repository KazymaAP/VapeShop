/**
 * API для реферальной системы
 * GET /api/referral/code - получить или создать реферальный код
 * POST /api/referral/use - использовать реферальный код
 * GET /api/referral/bonus - получить бонусы пользователя
 * GET /api/referral/history - история использования кодов
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import type { ApiResponse, ApiError } from '@/types/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const telegramId = (req as any).telegramId || req.headers['x-telegram-id'];

  if (!telegramId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const action = req.query.action as string;

    if (action === 'code') {
      // Получить или создать реферальный код текущего пользователя
      try {
        const result = await query(
          `SELECT id, code, bonus_amount, used_count, max_uses, is_active 
           FROM referral_codes 
           WHERE user_telegram_id = $1 AND is_active = true
           ORDER BY created_at DESC LIMIT 1`,
          [telegramId]
        );

        if (result.rows.length > 0) {
          return res.status(200).json({
            success: true,
            data: result.rows[0],
            timestamp: Date.now()
          });
        }

        // Создаём новый код
        const codeResult = await query(
          `INSERT INTO referral_codes (user_telegram_id, code, bonus_amount)
           VALUES ($1, generate_referral_code(), 100.00)
           RETURNING id, code, bonus_amount, used_count, max_uses, is_active`,
          [telegramId]
        );

        res.status(200).json({
          success: true,
          data: codeResult.rows[0],
          timestamp: Date.now()
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to get/create referral code' });
      }
    } else if (action === 'bonus') {
      // Получить информацию о бонусах
      try {
        const result = await query(
          `SELECT user_telegram_id, total_earned, available_balance, spent 
           FROM user_bonuses 
           WHERE user_telegram_id = $1`,
          [telegramId]
        );

        const bonusData = result.rows[0] || {
          user_telegram_id: telegramId,
          total_earned: 0,
          available_balance: 0,
          spent: 0
        };

        res.status(200).json({
          success: true,
          data: bonusData,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to get bonus info' });
      }
    } else if (action === 'history') {
      // История использования реферальных кодов текущего пользователя
      try {
        const result = await query(
          `SELECT ru.id, ru.referred_user_telegram_id, ru.bonus_amount, ru.status, ru.created_at
           FROM referral_uses ru
           WHERE ru.referrer_telegram_id = $1
           ORDER BY ru.created_at DESC
           LIMIT 50`,
          [telegramId]
        );

        res.status(200).json({
          success: true,
          data: result.rows,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to get referral history' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } else if (req.method === 'POST') {
    const action = req.query.action as string;

    if (action === 'use-code') {
      // Использовать реферальный код
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid code' });
      }

      try {
        // Находим реферальный код
        const codeResult = await query(
          `SELECT id, user_telegram_id, bonus_amount, used_count, max_uses, is_active, expires_at
           FROM referral_codes
           WHERE code = $1`,
          [code.toUpperCase()]
        );

        if (codeResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Referral code not found' });
        }

        const refCode = codeResult.rows[0];

        // Проверяем валидность кода
        if (!refCode.is_active) {
          return res.status(400).json({ success: false, error: 'Referral code is inactive' });
        }

        if (refCode.expires_at && new Date(refCode.expires_at) < new Date()) {
          return res.status(400).json({ success: false, error: 'Referral code expired' });
        }

        if (refCode.max_uses && refCode.used_count >= refCode.max_uses) {
          return res.status(400).json({ success: false, error: 'Referral code usage limit reached' });
        }

        // Проверяем, что пользователь не использовал собственный код
        if (refCode.user_telegram_id === telegramId) {
          return res.status(400).json({ success: false, error: 'Cannot use your own referral code' });
        }

        // Проверяем, что пользователь уже не получал бонус от этого кода
        const existingUse = await query(
          `SELECT id FROM referral_uses 
           WHERE referral_code_id = $1 AND referred_user_telegram_id = $2`,
          [refCode.id, telegramId]
        );

        if (existingUse.rows.length > 0) {
          return res.status(400).json({ success: false, error: 'You already used this code' });
        }

        // Начисляем бонусы
        await query('BEGIN');
        try {
          // Создаём запись об использовании кода
          const useResult = await query(
            `INSERT INTO referral_uses (referral_code_id, referrer_telegram_id, referred_user_telegram_id, bonus_amount)
             VALUES ($1, $2, $3, $4)
             RETURNING id, bonus_amount`,
            [refCode.id, refCode.user_telegram_id, telegramId, refCode.bonus_amount]
          );

          // Начисляем бонус рефереру
          await query(
            `SELECT add_user_bonus($1, $2, $3, $4)`,
            [refCode.user_telegram_id, refCode.bonus_amount, 'Реферальный бонус', useResult.rows[0].id]
          );

          // Обновляем счётчик использований кода
          await query(
            `UPDATE referral_codes SET used_count = used_count + 1 WHERE id = $1`,
            [refCode.id]
          );

          await query('COMMIT');

          // Отправляем уведомление рефереру через бота
          // TODO: отправить сообщение в Telegram о начислении бонуса

          res.status(200).json({
            success: true,
            data: {
              message: `Вы получили бонус! Реферер получил ${refCode.bonus_amount}₽`,
              bonus_awarded: refCode.bonus_amount
            },
            timestamp: Date.now()
          });
        } catch (err) {
          await query('ROLLBACK');
          throw err;
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to use referral code' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

export default rateLimit(requireAuth(handler, ['customer']), RATE_LIMIT_PRESETS.normal);
