import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

/**
 * API для проверки 6-значного кода доставки
 * Используется курьером при завершении доставки
 * 
 * POST /api/orders/verify-code
 * Body: { order_id: string, code_6digit: number }
 * Response: { success: boolean, message: string, order?: Order }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order_id, code_6digit } = req.body;

    // Валидация входных данных
    if (!order_id || !code_6digit) {
      return res.status(400).json({
        success: false,
        message: 'Отсутствуют обязательные поля: order_id, code_6digit',
      });
    }

    if (typeof code_6digit !== 'number' || code_6digit < 100000 || code_6digit > 999999) {
      return res.status(400).json({
        success: false,
        message: 'Код должен быть 6-значным числом',
      });
    }

    // Получаем заказ
    const orderRes = await query(
      `SELECT * FROM orders 
       WHERE id = $1 AND status = $2`,
      [order_id, 'new']
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден или уже завершён',
      });
    }

    const order = orderRes.rows[0];

    // Проверяем, что код совпадает
    if (order.code_6digit !== code_6digit) {
      return res.status(400).json({
        success: false,
        message: 'Неверный код доставки',
      });
    }

    // Проверяем срок действия кода (24 часа)
    const codeExpiresAt = new Date(order.code_expires_at);
    if (codeExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Код доставки истёк. Срок действия: 24 часа после оплаты',
      });
    }

    // Обновляем статус заказа на 'done' (выполнен)
    // Очищаем 6-значный код
    await query(
      `UPDATE orders 
       SET status = $1, 
           code_6digit = NULL, 
           code_expires_at = NULL, 
           updated_at = NOW()
       WHERE id = $2`,
      ['done', order_id]
    );

    // Получаем обновленный заказ
    const updatedOrderRes = await query(
      'SELECT * FROM orders WHERE id = $1',
      [order_id]
    );

    const updatedOrder = updatedOrderRes.rows[0];

    return res.status(200).json({
      success: true,
      message: `✅ Заказ #${order_id.slice(0, 8).toUpperCase()} успешно завершён!`,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        total: updatedOrder.total,
        created_at: updatedOrder.created_at,
        updated_at: updatedOrder.updated_at,
      },
    });
  } catch (err) {
    console.error('Verify code error:', err);
    return res.status(500).json({
      success: false,
      message: 'Технаическая ошибка при проверке кода',
    });
  }
}

