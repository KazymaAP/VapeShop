import { requireAuth, getTelegramId } from '../../../../../lib/auth';
import { query } from '../../../../../lib/db';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    const { id } = req.query;
    const telegramId = getTelegramId(req);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Валидация id
    const deliveryId = Array.isArray(id) ? id[0] : id;
    if (!deliveryId) {
      return res.status(400).json({ error: 'Invalid delivery ID' });
    }

    try {
      const { notes } = req.body;

      const deliveryResult = await query(
        'SELECT * FROM courier_deliveries WHERE id = $1 AND courier_id = $2',
        [deliveryId, telegramId]
      );

      if (deliveryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      await query(
        'UPDATE courier_deliveries SET status = $1, completed_at = NOW(), notes = $2 WHERE id = $3',
        ['completed', notes, deliveryId]
      );

      await query('UPDATE orders SET status = $1 WHERE id = $2', [
        'completed',
        deliveryResult.rows[0].order_id,
      ]);

      res.status(200).json({ success: true });
    } catch (_err) {
      logger.error('Error completing delivery:', _err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['courier', 'admin']
);
