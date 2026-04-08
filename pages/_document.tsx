import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        {/* Telegram WebApp SDK - КРИТИЧЕСКИ ВАЖНО! */}
        <script src="https://telegram.org/js/telegram-web-app.js" async={false} />

        {/* Fallback: встроенный Telegram SDK если внешний не загрузился */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (!window.Telegram || !window.Telegram.WebApp) {
                // Минимальная реализация Telegram.WebApp для fallback
                window.Telegram = window.Telegram || {};
                window.Telegram.WebApp = {
                  initData: '',
                  initDataUnsafe: { user: null },
                  ready: () => {},
                  expand: () => {},
                  close: () => {},
                  MainButton: {
                    setText: () => {},
                    show: () => {},
                    hide: () => {},
                    enable: () => {},
                    disable: () => {},
                    onClick: () => {},
                    offClick: () => {}
                  },
                  BackButton: {
                    show: () => {},
                    hide: () => {},
                    onClick: () => {},
                    offClick: () => {}
                  },
                  HapticFeedback: {
                    impactOccurred: () => {},
                    notificationOccurred: () => {}
                  }
                };
              }
            `,
          }}
        />

        {/* Инициализация initData из URL хеша (для локальной разработки и Telegram) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Парсим initData из URL или hash
                let initData = '';
                let initDataUnsafe = { user: null };

                // Получаем из window hash (Telegram Web App передаёт через hash)
                if (window.location.hash) {
                  const hash = window.location.hash.substring(1);
                  const params = new URLSearchParams(hash);
                  initData = params.get('tgWebAppData') || '';
                }

                // Альтернативно, из URL query params
                if (!initData) {
                  const params = new URLSearchParams(window.location.search);
                  initData = params.get('tgWebAppData') || '';
                }

                // Если есть initData, парсим его
                if (initData) {
                  const parsed = new URLSearchParams(initData);
                  const userStr = parsed.get('user');
                  if (userStr) {
                    try {
                      initDataUnsafe.user = JSON.parse(userStr);
                      initDataUnsafe.query_id = parsed.get('query_id');
                      initDataUnsafe.auth_date = parsed.get('auth_date');
                      initDataUnsafe.hash = parsed.get('hash');
                    } catch (e) {
                      console.error('Failed to parse user data:', e);
                    }
                  }
                }

                // Сохраняем в window.Telegram.WebApp
                if (window.Telegram && window.Telegram.WebApp) {
                  window.Telegram.WebApp.initData = initData;
                  window.Telegram.WebApp.initDataUnsafe = initDataUnsafe;
                }

                // Отправляем ошибку в консоль если нет пользователя
                if (!initDataUnsafe.user) {
                  console.warn('⚠️ Telegram user not found. App may not work correctly outside Telegram.');
                }
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
