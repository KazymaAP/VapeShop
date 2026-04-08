import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest, requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const userId = await getTelegramIdFromRequest(req);
    const { eventName, eventProperties } = req.body;

    try {
      await query(
        'INSERT INTO analytics_events (user_id, event_name, event_properties) VALUES ($1, $2, $3)',
        [userId || null, eventName, JSON.stringify(eventProperties || {})]
      );
      apiSuccess(res, { success: true });
    } catch {
      apiError(res, 'Failed to track event', 500);
    }
  } else {
    apiError(res, 'Method not allowed', 405);
  }
}

export default requireAuth(handler, ['customer']);
