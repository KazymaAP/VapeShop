/**
 * Глобальные константы приложения VapeShop
 * Все строки, числа, статусы, URL вынесены сюда для централизованного управления
 */

// ============ Статусы заказов ============
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PENDING]: 'В ожидании',
  [ORDER_STATUS.CONFIRMED]: 'Подтверждено',
  [ORDER_STATUS.SHIPPED]: 'Отправлено',
  [ORDER_STATUS.COMPLETED]: 'Завершено',
  [ORDER_STATUS.CANCELLED]: 'Отменено',
};

// ============ Роли пользователей ============
export const USER_ROLES = {
  CUSTOMER: 'customer',
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  SUPPORT: 'support',
  COURIER: 'courier',
} as const;

// ============ Статусы платежей ============
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

// ============ HTTP статусы ============
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============ Сообщения об ошибках ============
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Вы не авторизованы',
  FORBIDDEN: 'Доступ запрещён',
  NOT_FOUND: 'Ресурс не найден',
  INVALID_INPUT: 'Некорректные входные данные',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',
  DATABASE_ERROR: 'Ошибка базы данных',
  VALIDATION_ERROR: 'Ошибка валидации',
  TELEGRAM_ERROR: 'Ошибка Telegram API',
  DUPLICATE_ENTRY: 'Запись уже существует',
  OUT_OF_STOCK: 'Товар отсутствует на складе',
  INVALID_ORDER: 'Некорректный заказ',
  PAYMENT_FAILED: 'Ошибка платежа',
} as const;

// ============ Пагинация ============
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ============ Кеширование ============
export const CACHE_CONFIG = {
  STALE_TIME: 5 * 60 * 1000, // 5 минут
  PRODUCTS_STALE_TIME: 10 * 60 * 1000, // 10 минут
  USER_STALE_TIME: 60 * 1000, // 1 минута
} as const;

// ============ Типы доставки ============
export const DELIVERY_TYPES = {
  PICKUP: 'pickup',
  COURIER: 'courier',
} as const;

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  [DELIVERY_TYPES.PICKUP]: 'Самовывоз',
  [DELIVERY_TYPES.COURIER]: 'Доставка курьером',
};

// ============ Ограничения и пределы ============
export const LIMITS = {
  MAX_PRODUCTS_PER_ORDER: 1000,
  MAX_ORDER_AMOUNT: 1000000, // В копейках
  MIN_ORDER_AMOUNT: 100, // В копейках
  MAX_PRODUCT_QUANTITY: 10000,
  MAX_PRODUCT_NAME_LENGTH: 255,
  MAX_PRODUCT_DESCRIPTION_LENGTH: 2000,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 32,
} as const;

// ============ Регулярные выражения ============
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\s+\-()]{10,}$/,
  URL: /^https?:\/\/.+/,
  TELEGRAM_USERNAME: /^@[a-zA-Z0-9_]{5,}$/,
  PRICE: /^\d+(\.\d{1,2})?$/,
} as const;

// ============ Версии API ============
export const API_VERSIONS = {
  V1: '/api/v1',
  V2: '/api/v2',
} as const;

export const DEFAULT_API_VERSION = API_VERSIONS.V1;

// ============ Запросы по умолчанию ============
export const REQUEST_DEFAULTS = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// ============ Логирование ============
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

// ============ Типы уведомлений ============
export const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  PRODUCT_IN_STOCK: 'product_in_stock',
  PROMO_CODE_AVAILABLE: 'promo_code_available',
} as const;
