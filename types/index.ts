/**
 * Global TypeScript types and type definitions
 * 
 * ⚠️ CENTRALIZED: All type aliases should be defined here for consistency
 */

/**
 * UUID v4 type - используется для database IDs
 * Пример: "550e8400-e29b-41d4-a716-446655440000"
 */
export type UUID = string & { readonly __brand: 'UUID' };

/**
 * Function для создания UUID type (используется при необходимости runtime validation)
 */
export function isUUID(value: string): value is UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Cast string to UUID (используется когда вы уверены что это UUID)
 * ⚠️ ОСТОРОЖНО: Это unsafe operation, используйте только когда уверены
 */
export function asUUID(value: string): UUID {
  return value as UUID;
}

/**
 * Telegram ID type - BIGINT от Telegram
 */
export type TelegramID = number & { readonly __brand: 'TelegramID' };

/**
 * Product ID type
 */
export type ProductID = UUID;

/**
 * Order ID type
 */
export type OrderID = UUID;

/**
 * Brand ID type
 */
export type BrandID = number;

/**
 * Category ID type
 */
export type CategoryID = number;

/**
 * Cart ID type
 */
export type CartID = UUID;
