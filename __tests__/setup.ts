/**
 * Jest Test Setup
 * Initialize test environment, mocks, and utilities
 */
import { beforeAll, afterAll, jest as jestModule } from '@jest/globals';

// Enable extended matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock environment variables
Object.assign(process.env, {
  TELEGRAM_BOT_TOKEN: 'test_bot_token_123456789',
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/vape_shop_test',
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    pathname: '/',
    asPath: '/',
    isReady: true,
  }),
}));

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = jest.fn((...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('act')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
