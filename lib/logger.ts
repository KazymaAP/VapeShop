/**
 * Структурированное логирование для production
 * Заменяет console.log, console.error и т.д.
 *
 * Использование:
 * logger.info('Пользователь вошёл', { userId: 123 });
 * logger.error('Ошибка БД', error);
 * logger.warn('Высокая нагрузка', { cpu: 85 });
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

type LogLevel = keyof typeof LOG_LEVELS;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Определяет минимальный уровень логирования
 * - production: INFO и выше (скрывает DEBUG)
 * - development: DEBUG и выше (все)
 */
function getMinLogLevel(): LogLevel {
  return process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
}

/**
 * Форматирует лог в JSON для парсинга (сервисы типа Sentry, Datadog)
 */
function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // Production: JSON format для логгинга сервисов
    return JSON.stringify(entry);
  } else {
    // Development: читаемый формат
    const { timestamp, level, message, context, error } = entry;
    let output = `[${timestamp}] ${level}: ${message}`;
    if (context) {
      output += ` | ${JSON.stringify(context)}`;
    }
    if (error) {
      output += ` | ${error.name}: ${error.message}`;
      if (error.stack && process.env.DEBUG === '1') {
        output += `\n${error.stack}`;
      }
    }
    return output;
  }
}

/**
 * Записывает лог в консоль или сервис логирования
 */
function writeLog(entry: LogEntry): void {
  const formatted = formatLog(entry);

  if (process.env.NODE_ENV === 'production') {
    // На production отправляем в сервис логирования (Sentry, Datadog и т.д.)
    // Для сейчас - просто в stderr
    if (LOG_LEVELS[entry.level] >= LOG_LEVELS.WARN) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  } else {
    // На development - в консоль с цветами
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m', // cyan
      INFO: '\x1b[32m', // green
      WARN: '\x1b[33m', // yellow
      ERROR: '\x1b[31m', // red
      FATAL: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    console.log(`${colors[entry.level]}${formatted}${reset}`);
  }
}

/**
 * Основной объект логгера
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS.DEBUG >= LOG_LEVELS[getMinLogLevel()]) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        context,
      });
    }
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS.INFO >= LOG_LEVELS[getMinLogLevel()]) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        context,
      });
    }
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS.WARN >= LOG_LEVELS[getMinLogLevel()]) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        context,
      });
    }
  },

  error(message: string, err?: Error | unknown, context?: Record<string, unknown>): void {
    let error: LogEntry['error'];
    if (err instanceof Error) {
      error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    if (LOG_LEVELS.ERROR >= LOG_LEVELS[getMinLogLevel()]) {
      writeLog({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        error,
        context,
      });
    }
  },

  fatal(message: string, err?: Error | unknown, context?: Record<string, unknown>): void {
    let error: LogEntry['error'];
    if (err instanceof Error) {
      error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    writeLog({
      timestamp: new Date().toISOString(),
      level: 'FATAL',
      message,
      error,
      context,
    });
  },
};

export default logger;
