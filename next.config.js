/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============ Оптимизация компиляции ============
  reactStrictMode: true,
  swcMinify: true, // Быстрее и меньше размер bundle

  // ============ Изображения ============
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // для тестовых изображений
      },
    ],
    // Оптимизация размеров изображений
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // ISR для оптимизации при деплое
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 год для статичных
  },

  // ============ Безопасность ============
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // ============ Webpack оптимизация ============
  webpack: (config, { dev, isServer }) => {
    // Отключение source maps в production
    if (!dev && !isServer) {
      config.devtool = 'hidden-source-map';
    }
    return config;
  },

  // ============ Production режим ============
  compress: true,
  productionBrowserSourceMaps: false, // Не отправлять source maps браузеру
  poweredByHeader: false, // Скрыть X-Powered-By заголовок

  // ============ Опционально: экспериментальные функции ============
  experimental: {
    // Включить оптимизацию папок компонентов
    optimizePackageImports: ['@/components'],
  },

  // ============ Rewrite для API ============
  async rewrites() {
    return {
      beforeFiles: [
        // Перенаправление Telegram webhook на /api/bot
        {
          source: '/webhook/telegram',
          destination: '/api/bot',
        },
      ],
    };
  },

  // ============ Перенаправления ============
  async redirects() {
    return [
      // Перенаправление старых URL если нужно
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      // /profile redirect removed - /user/profile doesn't exist
    ];
  },

  // ============ Переменные окружения ============
  env: {
    NEXT_PUBLIC_BOT_USERNAME: process.env.NEXT_PUBLIC_BOT_USERNAME || 'vapexays_bot',
  },
};

module.exports = nextConfig;
