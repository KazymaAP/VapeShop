import { NextApiRequest, NextApiResponse } from 'next';
import { transaction } from '@/lib/db';
import { getTelegramIdFromRequest, requireAuth } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { apiSuccess, apiError } from '@/lib/apiResponse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ⚠️ ТРЕБУЕТСЯ НОМАХ VALIDATION для всех операций
  const userId = await getTelegramIdFromRequest(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const testName = req.query.testName as string;

    try {
      await transaction(async (client) => {
        const testResult = await client.query('SELECT id FROM ab_tests WHERE name = $1 AND status = $2', [
          testName,
          'active',
        ]);

        if (testResult.rows.length === 0) {
          apiSuccess(res, { variant: 'A' });
          return;
        }

        const testId = testResult.rows[0].id;
        const variant = Math.random() < 0.5 ? 'A' : 'B';

        await client.query('INSERT INTO ab_test_results (test_id, user_id, variant) VALUES ($1, $2, $3)', [
          testId,
          userId,
          variant,
        ]);

        apiSuccess(res, { variant });
      });
    } catch {
      apiError(res, 'Failed to get test variant', 500);
    }
  } else if (req.method === 'POST') {
    const { testName, result } = req.body;

    try {
      await transaction(async (client) => {
        const testResult = await client.query('SELECT id FROM ab_tests WHERE name = $1', [testName]);

        if (testResult.rows.length > 0) {
          await client.query('UPDATE ab_test_results SET result = $1 WHERE test_id = $2 AND user_id = $3', [
            result,
            testResult.rows[0].id,
            userId,
          ]);
        }
      });

      apiSuccess(res, { success: true });
    } catch {
      apiError(res, 'Failed to record result', 500);
    }
  } else {
    apiError(res, 'Method not allowed', 405);
  }
}

export default rateLimit(requireAuth(handler, ['customer']), RATE_LIMIT_PRESETS.normal);
