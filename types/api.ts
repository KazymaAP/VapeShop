/**
 * API Response Types
 * Единая типизация для всех API ответов
 */

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
}

// Заказ
export interface OrderResponse {
  id: string;
  user_telegram_id: number;
  status: 'new' | 'confirmed' | 'readyship' | 'shipped' | 'done' | 'cancelled';
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
  is_default: boolean;
  created_at: string;
}

// Отзыв
export interface ReviewResponse {
  id: string;
  product_id: string;
  user_telegram_id: number;
  comment: string;
  rating?: number;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

// Общий формат API ошибки
export interface ApiErrorResponse {
  error: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Общий формат API успеха
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
  role: 'admin' | 'manager' | 'seller' | 'buyer';
}

// Statuses
export type OrderStatus = 'new' | 'confirmed' | 'readyship' | 'shipped' | 'done' | 'cancelled';
export type DiscountType = 'percent' | 'fixed';
export type DeliveryMethod = 'pickup' | 'courier';
