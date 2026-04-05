import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

interface HealthResponse {
  success: boolean;
  data?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: 'connected' | 'disconnected';
    uptime_seconds: number;
    memory_usage_mb: number;
    timestamp: string;
    version: string;
  };
  error?: string;
  timestamp: string;
}

// Время старта приложения
const START_TIME = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      timestamp: new Date().toISOString(),
    });
  }

  const timestamp = new Date().toISOString();
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Проверка БД
    const result = await query('SELECT 1 as health_check');
    if (result.rows.length > 0) {
      dbStatus = 'connected';
    }
  } catch {
    dbStatus = 'disconnected';
    overallStatus = 'degraded';
  }

  // Если БД не подключена, статус unhealthy
  if (dbStatus === 'disconnected') {
    overallStatus = 'unhealthy';
  }

  // Расчёт metrics
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return res.status(statusCode).json({
    success: dbStatus === 'connected',
    data: {
      status: overallStatus,
      database: dbStatus,
      uptime_seconds: uptime,
      memory_usage_mb: memory,
      timestamp,
      version: '1.0.0',
    },
    timestamp,
  });
}

