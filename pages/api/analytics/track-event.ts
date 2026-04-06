import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest, requireAuth } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const userId = await getTelegramIdFromRequest(req);
    const { eventName, eventProperties } = req.body;

    try {
      await query(
        'INSERT INTO analytics_events (user_id, event_name, event_properties) VALUES ($1, $2, $3)',
        [userId || null, eventName, JSON.stringify(eventProperties || {})]
      );
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to track event' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['customer']);
