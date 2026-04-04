/**
 * Sentry инициализация для production error tracking
 * Используется в pages/_app.tsx
 */

import * as Sentry from "@sentry/nextjs";

const environment = process.env.NODE_ENV || "development";
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACING_SAMPLE_RATE || "0.1"),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Фильтруем sensitive информацию
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }

      // Не отправляем 404 errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error && error.message?.includes("404")) {
          return null;
        }
      }

      return event;
    },
  });
}

export default Sentry;
