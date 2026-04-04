/**
 * Интеграция Sentry в pages/_app.tsx
 * Добавить этот код в существующий файл
 */

// Добавить в начало файла:
import * as Sentry from "@sentry/nextjs";
import { initAmplitude, useAmplitudePageView } from "@/lib/analytics";

// Инициализировать Sentry
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

// В компоненте App:
function App({ Component, pageProps }: AppProps) {
  // Инициализировать Amplitude аналитику
  useEffect(() => {
    initAmplitude();
  }, []);

  // Отслеживать page views
  useAmplitudePageView();

  return (
    <ErrorBoundary>
      <TelegramProvider>
        <Component {...pageProps} />
      </TelegramProvider>
    </ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);
