/**
 * API для работы с рейтингами и отзывами товаров
 * POST /api/product-ratings - оставить рейтинг
 * GET /api/product-ratings?productId=xxx - получить рейтинги товара
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import type { ApiResponse, ApiError } from '@/types/api';

interface RatingPayload {
  productId: string;
  rating: number; // 1-5
  reviewText?: string;
}

type ApiResponseType = ApiResponse | ApiError;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponseType>) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed', timestamp: Date.now() });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponseType>) {
  try {
    // Требуем авторизацию
    const telegram_id = await getTelegramIdFromRequest(req);
    if (!telegram_id) {
      return res.status(401).json({ success: false, error: 'Unauthorized', timestamp: Date.now() });
    }

    const { productId, rating, reviewText }: RatingPayload = req.body;

    // Валидация
    if (!productId || !rating) {
      return res.status(400).json({ success: false, error: 'Missing required fields', timestamp: Date.now() });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5', timestamp: Date.now() });
    }

    // Проверяем, что пользователь купил этот товар (опционально)
    const orderCheck = await query(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.user_telegram_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [productId, telegram_id]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'You can only rate products you purchased', timestamp: Date.now() });
    }

    // Сохраняем рейтинг (upsert)
    const result = await query(
      `INSERT INTO rating_history (product_id, user_telegram_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_telegram_id)
       DO UPDATE SET rating = $3, review_text = $4, created_at = NOW()
       RETURNING *`,
      [productId, telegram_id, rating, reviewText || null]
    );

    // Обновляем агрегированный рейтинг товара
    const avgRating = await query(
      `SELECT 
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) as count
       FROM rating_history
       WHERE product_id = $1`,
      [productId]
    );

    if (avgRating.rows.length > 0) {
      const { avg_rating, count } = avgRating.rows[0];
      
      await transaction(async (client) => {
        await client.query(`UPDATE products SET rating = $1, rating_count = $2 WHERE id = $3`, [
          avg_rating || 0,
          count || 0,
          productId,
        ]);

        // Логируем действие
        await client.query(
          `INSERT INTO audit_log (user_telegram_id, action, details)
           VALUES ($1, 'rating_product', $2)`,
          [telegram_id, JSON.stringify({ productId, rating })]
        );
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Rating saved successfully',
      data: result.rows[0],
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Failed to save rating';
    return res.status(500).json({ success: false, error, timestamp: Date.now() });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponseType>) {
  try {
    const { productId, limit = 10, offset = 0 } = req.query;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'productId is required', timestamp: Date.now() });
    }

    // Получаем рейтинги товара с пользовательскими данными
    const result = await query(
      `SELECT 
        rh.id,
        rh.rating,
        rh.review_text,
        rh.created_at,
        SUBSTRING(u.first_name, 1, 1) || '.' as user_name
       FROM rating_history rh
       LEFT JOIN users u ON rh.user_telegram_id = u.telegram_id
       WHERE rh.product_id = $1
       ORDER BY rh.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    // Получаем агрегированные данные (для будущих улучшений)
    // const _stats = await query(
    //   `SELECT 
    //     AVG(rating)::DECIMAL(3,2) as avg_rating,
    //     COUNT(*) as total_ratings,
    //     SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count,
    //     SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative_count
    //    FROM rating_history
    //    WHERE product_id = $1`,
    //   [productId]
    // );

    return res.status(200).json({
      success: true,
      data: result.rows,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Failed to fetch ratings';
    return res.status(500).json({ success: false, error, timestamp: Date.now() });
  }
}
