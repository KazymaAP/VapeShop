import { requireAuth, getTelegramId } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export default requireAuth(async (req, res) => {
  const telegramId = getTelegramId(req);

  if (req.method === 'GET') {
    try {
      const userResult = await query(
        'SELECT balance, referral_code FROM users WHERE telegram_id = $1',
        [telegramId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      let referralCode = user.referral_code;

      if (!referralCode) {
        referralCode = crypto.randomBytes(8).toString('hex').substring(0, 10).toUpperCase();
        await query(
          'UPDATE users SET referral_code = $1 WHERE telegram_id = $2',
          [referralCode, telegramId]
        );
      }

      const statsResult = await query(
        'SELECT COUNT(*) as count, COALESCE(SUM(bonus_amount), 0) as total FROM referral_stats WHERE referrer_id = $1 AND status = $2',
        [telegramId, 'credited']
      );

      res.status(200).json({
        data: {
          balance: parseFloat(user.balance) || 0,
          referral_code: referralCode,
          referrals_count: parseInt(statsResult.rows[0].count),
          total_earned: parseFloat(statsResult.rows[0].total) || 0
        }
      });
    } catch (err) {
      console.error('Error fetching referral data:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { code } = req.query;

      const referrerResult = await query(
        'SELECT telegram_id FROM users WHERE referral_code = $1',
        [code]
      );

      if (referrerResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }

      const referrerId = referrerResult.rows[0].telegram_id;

      await query(
        'INSERT INTO referral_stats (referrer_id, referee_id, bonus_amount, status) VALUES ($1, $2, $3, $4)',
        [referrerId, telegramId, 0, 'pending']
      );

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Error using referral code:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['customer', 'manager', 'admin']);

