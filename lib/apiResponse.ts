import type { NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

export type ApiResponseStatus = 'success' | 'error' | 'partial';

export interface ApiResponse<T = Record<string, unknown>> {
  success: boolean;
  status: ApiResponseStatus;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Стандартизованный успешный ответ
 */
export function apiSuccess<T>(
  res: NextApiResponse,
  data: T,
  statusCode: number = 200,
  meta?: ApiResponse<T>['meta']
): void {
  const response: ApiResponse<T> = {
    success: true,
    status: 'success',
    data,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
}

/**
 * Стандартизованный ответ об ошибке
 */
export function apiError(
  res: NextApiResponse,
  error: string,
  statusCode: number = 500,
  details?: string | Record<string, unknown>
): void {
  const response: ApiResponse & { details?: string | Record<string, unknown> } = {
    success: false,
    status: 'error',
    error,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    ...(details && { details }),
  };
  res.status(statusCode).json(response);
}

/**
 * Ответ с частичным успехом (для списков с ошибками)
 */
export function apiPartial<T>(
  res: NextApiResponse,
  data: T,
  error: string,
  statusCode: number = 206,
  meta?: ApiResponse<T>['meta']
): void {
  const response: ApiResponse<T> = {
    success: false,
    status: 'partial',
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
}

/**
 * Список с пагинацией
 */
export function apiList<T>(
  res: NextApiResponse,
  items: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = 200
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    status: 'success',
    data: items,
    timestamp: new Date().toISOString(),
    requestId: uuidv4(),
    meta: {
      total,
      page,
      limit,
    },
  };
  res.status(statusCode).json(response);
}
