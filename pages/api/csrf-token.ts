import { logger } from '@/lib/logger';
/**
 * Endpoint для получения CSRF токена
 * GET /api/csrf-token
 *
 * Клиент вызывает этот endpoint при загрузке страницы для получения CSRF токена.
 * Затем отправляет токен в X-CSRF-Token заголовке при мутирующих операциях.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { generateCSRFToken } from '@/lib/csrf';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем session ID пользователя
    const telegramId = await getTelegramIdFromRequest(req);

    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Генерируем CSRF токен
    const csrfToken = await generateCSRFToken(String(telegramId));

    return res.status(200).json({
      token: csrfToken,
      header: 'X-CSRF-Token',
    });
  } catch (err) {
    logger.error('CSRF token generation error:', err);
    return res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
}

export default rateLimit(handler, RATE_LIMIT_PRESETS.normal);
