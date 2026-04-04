/**
 * API Response Types
 * Единая типизация для всех API ответов
 */

// Общий формат API ответа (успех)
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: number;
}

// Общий формат API ответа (ошибка)
export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string | string[]>;
  code?: string;
  timestamp: number;
}

export type ApiResult<T = any> = ApiResponse<T> | ApiError;

// Пагинированный ответ
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Продукт
export interface ProductResponse {
  id: string;
  name: string;
  specification: string;
  price: number;
  stock: number;
  category_id: string;
  brand_id: string;
  images: string[];
  is_promotion: boolean;
  is_hit: boolean;
  is_new: boolean;
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

// Заказ
export interface OrderResponse {
  id: string;
  user_telegram_id: number;
  status: 'new' | 'confirmed' | 'readyship' | 'shipped' | 'done' | 'cancelled' | 'pending' | 'processing' | 'delivered';
  total: number;
  delivery_method: 'pickup' | 'courier';
  delivery_date: string;
  address?: string;
  promo_code?: string;
  discount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItemResponse[];
  history?: OrderHistoryResponse[];
  paid_at?: string | null;
  code_6digit?: string | null;
}

export interface OrderItemResponse {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderHistoryResponse {
  old_status: string;
  new_status: string;
  note?: string;
  created_at: string;
}

// Корзина
export interface CartResponse {
  items: CartItemResponse[];
  total: number;
  item_count: number;
}

export interface CartItemResponse {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
}

// Промокод
export interface PromocodeResponse {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  is_valid: boolean;
  discount_amount?: number;
}

// Страница контента
export interface PageResponse {
  slug: string;
  title: string;
  content: string;
  seo_description?: string;
  updated_at: string;
}

// Баннер
export interface BannerResponse {
  id: string;
  image_url: string;
  link?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// FAQ
export interface FaqResponse {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Адрес доставки
export interface AddressResponse {
  id: string;
  user_telegram_id: number;
  address: string;
  street?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

// Отзыв
export interface ReviewResponse {
  id: string;
  product_id: string;
  user_telegram_id: number;
  comment: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_avatar?: string;
}

// Общий формат API ошибки (совместимость)
export interface ApiErrorResponse {
  error: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Общий формат API успеха (совместимость)
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

// Категория
export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  products_count?: number;
}

// Бренд
export interface BrandResponse {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  products_count?: number;
}

// Пользователь (публичная информация)
export interface UserPublicResponse {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'seller' | 'buyer' | 'customer' | 'support' | 'courier' | 'super_admin';
  is_blocked?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Статистика
export interface StatisticsResponse {
  total_orders: number;
  total_revenue: number;
  total_users: number;
  average_order_value: number;
  orders_this_month: number;
  revenue_this_month: number;
  top_products: Array<{ name: string; quantity: number }>;
  orders_by_status: Record<string, number>;
}

// Статус импорта
export interface ImportStatusResponse {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details?: Array<{ row: number; error: string }>;
}

// Статусы
export type OrderStatus = 'new' | 'confirmed' | 'readyship' | 'shipped' | 'done' | 'cancelled' | 'pending' | 'processing' | 'delivered';
export type DiscountType = 'percent' | 'fixed';
export type DeliveryMethod = 'pickup' | 'courier' | 'self_pickup' | 'locker';
export type UserRole = 'admin' | 'manager' | 'seller' | 'buyer' | 'customer' | 'support' | 'courier' | 'super_admin';
