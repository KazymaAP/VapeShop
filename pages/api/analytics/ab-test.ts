import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramId } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userId = getTelegramId(req);
    const testName = req.query.testName as string;

    try {
      const testResult = await query('SELECT id FROM ab_tests WHERE name = $1 AND status = $2', [
        testName,
        'active',
      ]);

      if (testResult.rows.length === 0) {
        return res.status(200).json({ variant: 'A' });
      }

      const testId = testResult.rows[0].id;
      const variant = Math.random() < 0.5 ? 'A' : 'B';

      await query('INSERT INTO ab_test_results (test_id, user_id, variant) VALUES ($1, $2, $3)', [
        testId,
        userId,
        variant,
      ]);

      res.status(200).json({ variant });
    } catch {
      res.status(500).json({ error: 'Failed to get test variant' });
    }
  } else if (req.method === 'POST') {
    const userId = getTelegramId(req);
    const { testName, result } = req.body;

    try {
      const testResult = await query('SELECT id FROM ab_tests WHERE name = $1', [testName]);

      if (testResult.rows.length > 0) {
        await query('UPDATE ab_test_results SET result = $1 WHERE test_id = $2 AND user_id = $3', [
          result,
          testResult.rows[0].id,
          userId,
        ]);
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to record result' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default handler;
