import { logger } from '@/lib/logger';
/**
 * Утилиты для работы с платежами Telegram Stars
 */

export interface OrderResponse {
  order_id: string;
  status: 'pending' | 'new' | 'confirmed' | 'done' | 'cancelled';
  message: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
  order?: {
    id: string;
    status: string;
    total: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Создаёт заказ и инициирует процесс оплаты
 * @param telegram_id ID пользователя в Telegram
 * @param items Товары в заказе
 * @param deliveryMethod Способ доставки: 'pickup' или 'courier'
 * @param deliveryDate Дата доставки
 * @param address Адрес доставки (если доставка курьером)
 * @param promoCode Промокод (если применяется)
 * @param discount Скидка
 * @returns OrderResponse с информацией о заказе
 */
export async function createOrderWithPayment(
  telegram_id: number,
  items: Array<{
    product_id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  deliveryMethod: 'pickup' | 'courier',
  deliveryDate: string,
  address: string | null,
  promoCode?: string,
  discount?: number
): Promise<OrderResponse> {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_id,
        items,
        delivery_method: deliveryMethod,
        delivery_date: deliveryDate,
        address,
        promo_code: promoCode || null,
        discount: discount || 0,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка создания заказа');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    logger.error('Create order error:', err);
    throw err;
  }
}

/**
 * Проверяет 6-значный код доставки (для курьера)
 * @param order_id UUID заказа
 * @param code_6digit 6-значный код
 * @returns VerifyCodeResponse с результатом проверки
 */
export async function verifyDeliveryCode(
  order_id: string,
  code_6digit: number
): Promise<VerifyCodeResponse> {
  try {
    const response = await fetch('/api/orders/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id,
        code_6digit,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Ошибка проверки кода');
    }

    return data;
  } catch (err) {
    logger.error('Verify code error:', err);
    throw err;
  }
}

/**
 * Форматирует сумму в звёзды Telegram
 * @param amount Сумма в целых числах (звёзды)
 * @returns Отформатированная строка
 */
export function formatStars(amount: number): string {
  return `${amount} ⭐️`;
}

/**
 * Получает информацию о заказе
 * @param order_id UUID заказа
 * @returns Информацию о заказе
 */
export async function getOrderInfo(order_id: string) {
  try {
    const response = await fetch(`/api/orders/${order_id}`);

    if (!response.ok) {
      throw new Error('Ошибка получения информации о заказе');
    }

    return await response.json();
  } catch (err) {
    logger.error('Get order info error:', err);
    throw err;
  }
}

/**
 * Отменяет заказ (если его статус позволяет)
 * @param order_id UUID заказа
 * @param telegram_id ID пользователя
 * @returns Результат отмены
 */
export async function cancelOrder(order_id: string, telegram_id: number) {
  try {
    const response = await fetch(`/api/orders/${order_id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка отмены заказа');
    }

    return await response.json();
  } catch (err) {
    logger.error('Cancel order error:', err);
    throw err;
  }
}
