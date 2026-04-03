import { NextApiResponse } from 'next';

/**
 * Единый формат ошибок для API
 * 
 * Примеры использования:
 * apiError(res, 400, 'Неверные параметры');
 * apiError(res, 401, 'Не авторизован');
 * apiError(res, 403, 'Нет доступа');
 * apiError(res, 500, 'Внутренняя ошибка сервера');
 */
export function apiError(
  res: NextApiResponse,
  status: number,
  message: string,
  details?: Record<string, unknown>
) {
  const errorResponse: {
    error: string;
    timestamp: string;
    details?: Record<string, unknown>;
  } = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorResponse.details = details;
  }

  res.status(status).json(errorResponse);
}

/**
 * Успешный ответ (опционально)
 */
export function apiSuccess(
  res: NextApiResponse,
  data: unknown,
  status: number = 200
) {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Обработчик ошибок для try/catch блоков
 */
export function handleApiError(
  err: unknown,
  res: NextApiResponse,
  defaultMessage: string = 'Внутренняя ошибка сервера'
) {
  console.error('[API Error]', err);

  if (err instanceof Error) {
    // Известные ошибки БД
    if (err.message.includes('permission denied')) {
      return apiError(res, 403, 'Недостаточно прав для этой операции');
    }
    if (err.message.includes('syntax error')) {
      return apiError(res, 400, 'Некорректные данные в запросе');
    }
    if (err.message.includes('unique violation')) {
      return apiError(res, 409, 'Такая запись уже существует');
    }
  }

  apiError(res, 500, defaultMessage);
}
