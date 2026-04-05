import { NextApiResponse } from 'next';
import { HTTP_STATUS, ERROR_MESSAGES, LOG_LEVELS } from './constants';

export interface ApiErrorResponse {
  error: string;
  code?: string;
  status?: number;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Логирует ошибку в зависимости от уровня разработки
 */
function logError(
  level: string,
  message: string,
  error: unknown,
  details?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logEntry = {
    timestamp,
    level,
    message,
    error: errorMessage,
    details,
    ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
  };

  if (process.env.NODE_ENV === 'production') {
    // Отправить на сервис логирования (Sentry, LogRocket и т.д.)
  } else {
    console.error('[API Error]', JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Определяет HTTP статус на основе типа ошибки
 */
function getStatusCodeFromError(error: unknown): number {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  if (error instanceof SyntaxError) {
    return HTTP_STATUS.BAD_REQUEST;
  }

  if (error instanceof TypeError) {
    return HTTP_STATUS.UNPROCESSABLE_ENTITY;
  }

  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * Единый формат ошибок для API
 * Примеры использования:
 * apiError(res, HTTP_STATUS.BAD_REQUEST, 'Неверные параметры');
 * apiError(res, HTTP_STATUS.UNAUTHORIZED, 'Не авторизован');
 * apiError(res, HTTP_STATUS.FORBIDDEN, 'Нет доступа');
 * apiError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Внутренняя ошибка сервера');
 */
export function apiError(
  res: NextApiResponse<ApiErrorResponse>,
  status: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>
): void {
  const errorResponse: ApiErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (code) {
    errorResponse.code = code;
  }

  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.details = details;
  }

  res.status(status).json(errorResponse);
}

/**
 * Успешный ответ
 */
export function apiSuccess<T>(
  res: NextApiResponse<ApiSuccessResponse<T>>,
  data: T,
  status: number = HTTP_STATUS.OK
): void {
  res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Главный обработчик ошибок для try/catch блоков
 */
export function handleApiError(
  err: unknown,
  res: NextApiResponse<ApiErrorResponse>,
  defaultMessage: string = ERROR_MESSAGES.INTERNAL_ERROR,
  context?: string
): void {
  const statusCode = getStatusCodeFromError(err);

  if (err instanceof ApiError) {
    logError(LOG_LEVELS.WARN, context || 'API Error', err, err.details);
    apiError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  if (err instanceof Error) {
    // Известные ошибки БД
    if (err.message.includes('permission denied')) {
      logError(LOG_LEVELS.WARN, 'Permission Error', err, { context });
      return apiError(res, HTTP_STATUS.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN, 'PERMISSION_DENIED');
    }

    if (err.message.includes('syntax error')) {
      logError(LOG_LEVELS.WARN, 'Syntax Error', err, { context });
      return apiError(res, HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.INVALID_INPUT, 'SYNTAX_ERROR');
    }

    if (err.message.includes('unique violation')) {
      logError(LOG_LEVELS.WARN, 'Duplicate Entry Error', err, { context });
      return apiError(res, HTTP_STATUS.CONFLICT, ERROR_MESSAGES.DUPLICATE_ENTRY, 'DUPLICATE_ENTRY');
    }

    logError(LOG_LEVELS.ERROR, context || 'Error', err);
  } else {
    logError(LOG_LEVELS.ERROR, context || 'Unknown Error', err);
  }

  apiError(
    res,
    statusCode,
    process.env.NODE_ENV === 'production' ? ERROR_MESSAGES.INTERNAL_ERROR : defaultMessage
  );
}
