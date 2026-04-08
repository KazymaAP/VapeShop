import { requireAuth, getTelegramId } from '../../../../lib/auth';
import { query } from '../../../../lib/db';
import { apiSuccess, apiError } from '../../../../lib/apiResponse';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req, res) => {
    let { id } = req.query;
    
    // Валидация id
    id = Array.isArray(id) ? id[0] : id;
    if (!id) {
      return apiError(res, 'Invalid order ID', 400);
    }

    if (req.method === 'GET') {
      try {
        const result = await query(
          'SELECT * FROM manager_notes_history WHERE order_id = $1 ORDER BY created_at DESC',
          [id]
        );
        return apiSuccess(res, result.rows, 200);
      } catch (err) {
        logger.error('Error fetching notes:', err);
        return apiError(res, 'Internal Server Error', 500);
      }
    } else if (req.method === 'POST') {
      try {
        const { note } = req.body;
        const telegramId = getTelegramId(req);

        const noteResult = await query(
          'INSERT INTO manager_notes_history (order_id, manager_id, note) VALUES ($1, $2, $3) RETURNING *',
          [id, telegramId, note]
        );

        await query('UPDATE orders SET manager_notes = $1 WHERE id = $2', [note, id]);

        return apiSuccess(res, noteResult.rows[0], 201);
      } catch (err) {
        logger.error('Error creating note:', err);
        return apiError(res, 'Internal Server Error', 500);
      }
    } else {
      return apiError(res, 'Method not allowed', 405);
    }
  },
  ['manager', 'admin', 'super_admin']
);
