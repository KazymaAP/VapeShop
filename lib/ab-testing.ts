import { query } from './db';
import { logger } from './logger';

export async function getABTestVariant(userId: string, testName: string): Promise<'A' | 'B'> {
  try {
    const testResult = await query('SELECT id FROM ab_tests WHERE name = $1 AND status = $2', [
      testName,
      'active',
    ]);

    if (testResult.rows.length === 0) {
      return 'A';
    }

    const testId = testResult.rows[0].id;
    const variant = Math.random() < 0.5 ? 'A' : 'B';

    await query('INSERT INTO ab_test_results (test_id, user_id, variant) VALUES ($1, $2, $3)', [
      testId,
      userId,
      variant,
    ]);

    return variant;
  } catch (err) {
    logger.error('Error getting AB test variant:', err);
    return 'A';
  }
}

export async function recordTestResult(userId: string, testName: string, result: number) {
  try {
    const testResult = await query('SELECT id FROM ab_tests WHERE name = $1', [testName]);

    if (testResult.rows.length > 0) {
      await query('UPDATE ab_test_results SET result = $1 WHERE test_id = $2 AND user_id = $3', [
        result,
        testResult.rows[0].id,
        userId,
      ]);
    }
  } catch (err) {
    logger.error('Error recording test result:', err);
  }
}
