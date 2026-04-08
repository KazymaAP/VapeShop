import { NextApiRequest, NextApiResponse } from 'next';
import { transaction } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { orderIds, newStatus, notes } = req.body;
    const userId = getTelegramId(req);

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return apiError(res, 'Invalid order IDs', 400);
    }

    try {
      const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
      const updateQuery = `
        UPDATE orders 
        SET status = $${orderIds.length + 1}, 
            manager_id = $${orderIds.length + 2},
            manager_notes = COALESCE(manager_notes || ' | ', '') || $${orderIds.length + 3},
            updated_at = NOW()
        WHERE id = ANY(ARRAY[${placeholders}]::bigint[])
      `;

      await transaction(async (client) => {
        await client.query(updateQuery, [...orderIds, newStatus, userId, notes || '']);
      });

      return apiSuccess(res, { updated: orderIds.length }, 200);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : 'Unknown error');
      return apiError(res, 'Failed to update orders', 500);
    }
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(handler, ['manager', 'admin', 'super_admin']);
