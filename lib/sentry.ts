/**
 * Sentry инициализация для production error tracking
 * Используется в pages/_app.tsx
 */

interface SentryModule {
  init?: (config: Record<string, unknown>) => void;
  [key: string]: unknown;
}

let Sentry: SentryModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs') as SentryModule;
} catch {
  console.warn('⚠️ Sentry не установлен, пропускаем инициализацию');
}

const environment = process.env.NODE_ENV || 'development';
const dsn = process.env.SENTRY_DSN;

if (Sentry && dsn && typeof Sentry.init === 'function') {
  Sentry.init({
    dsn,
    environment,
    integrations: [],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACING_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export default Sentry || {};
