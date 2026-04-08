/**
 * Timing constants for polling, debounce, and delays
 * Используются для управления периодичностью операций
 */
export const TIMINGS = {
  // Polling intervals
  POLL_INTERVAL: 30000, // 30 seconds for alerts polling
  ALERTS_POLL: 30000, // 30 seconds

  // Debounce delays
  SEARCH_DEBOUNCE: 300, // 300ms for search input debounce
  INPUT_DEBOUNCE: 300,

  // Notification durations
  TOAST_DURATION: 3000, // 3 seconds default toast show time
  TOAST_SUCCESS: 3000, // 3 seconds
  TOAST_ERROR: 5000, // 5 seconds (longer for errors)
  TOAST_INFO: 4000, // 4 seconds

  // API and connection timeouts
  API_TIMEOUT: 30000, // 30 seconds for API calls
  CONNECTION_TIMEOUT: 10000, // 10 seconds for initial connection
  FETCH_TIMEOUT: 30000, // 30 seconds for fetch operations

  // Retry and backoff
  RETRY_DELAY: 500, // 500ms initial retry delay
  MAX_BACKOFF: 5000, // 5 seconds maximum backoff

  // Cache and deduplication
  DEDUP_INTERVAL: 60000, // 1 minute
  CACHE_DURATION: 300000, // 5 minutes
  SESSION_TIMEOUT: 1800000, // 30 minutes

  // Animation durations
  TRANSITION_FAST: 200, // 200ms for fast transitions
  TRANSITION_NORMAL: 300, // 300ms for normal transitions
  TRANSITION_SLOW: 500, // 500ms for slow transitions
};

/**
 * Global application limits
 */
export const LIMITS = {
  // Product prices
  MAX_PRICE: 10000, // Максимальная цена для отображения фильтра
  MIN_PRICE: 0, // Минимальная цена

  // Pagination
  PRODUCTS_PER_PAGE: 20, // Default pagination size
  USERS_PER_PAGE: 20, // Users pagination
  ORDERS_PER_PAGE: 20, // Orders pagination
  ITEMS_PER_PAGE: 20, // Generic items per page

  // Cart limits
  CART_ITEMS_MAX: 100, // Maximum items in shopping cart
  CART_ITEM_QTY_MAX: 100, // Max quantity for single item
  CART_ITEM_QTY_MIN: 1, // Min quantity for single item

  // Search and results
  SEARCH_LIMIT: 50, // Search results limit
  SEARCH_QUERY_MIN: 2, // Minimum search query length
  SEARCH_QUERY_MAX: 255, // Maximum search query length

  // Batch operations
  BATCH_SIZE: 100, // Batch query size for database
  BATCH_INSERT_SIZE: 50, // Batch insert size
  BATCH_UPDATE_SIZE: 100, // Batch update size

  // Form and input
  USERNAME_MIN: 3, // Minimum username length
  USERNAME_MAX: 50, // Maximum username length
  PASSWORD_MIN: 8, // Minimum password length
  DESCRIPTION_MAX: 5000, // Maximum description length
  TITLE_MAX: 255, // Maximum title length

  // Rate limiting
  RATE_LIMIT_REQUESTS: 100, // Requests per window
  RATE_LIMIT_WINDOW: 60000, // 1 minute window
};

/**
 * Response codes and statuses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Database and retry settings
 */
export const DB_SETTINGS = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 500,
  ISOLATION_LEVEL: 'READ_COMMITTED',
  CONNECTION_POOL_SIZE: 20,
  QUERY_TIMEOUT: 30000, // 30 seconds
};
