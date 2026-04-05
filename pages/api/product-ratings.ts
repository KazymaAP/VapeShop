/**
 * API для работы с рейтингами и отзывами товаров
 * POST /api/product-ratings - оставить рейтинг
 * GET /api/product-ratings?productId=xxx - получить рейтинги товара
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ApiResponse } from '@/types/api';

interface RatingPayload {
  productId: string;
  rating: number; // 1-5
  reviewText?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Требуем авторизацию
    const telegram_id = await requireAuth(req, res);
    if (!telegram_id) return;

    const { productId, rating, reviewText }: RatingPayload = req.body;

    // Валидация
    if (!productId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
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
      return res.status(403).json({ error: 'You can only rate products you purchased' });
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
      await query(
        `UPDATE products SET rating = $1, rating_count = $2 WHERE id = $3`,
        [avg_rating || 0, count || 0, productId]
      );
    }

    // Логируем действие
    await query(
      `INSERT INTO audit_log (user_telegram_id, action, details)
       VALUES ($1, 'rating_product', $2)`,
      [telegram_id, JSON.stringify({ productId, rating })]
    );

    return res.status(201).json({
      message: 'Rating saved successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('POST /api/product-ratings error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { productId, limit = 10, offset = 0 } = req.query;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
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

    // Получаем агрегированные данные
    const stats = await query(
      `SELECT 
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) as total_ratings,
        SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative_count
       FROM rating_history
       WHERE product_id = $1`,
      [productId]
    );

    return res.status(200).json({
      data: result.rows,
      stats: stats.rows[0],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: stats.rows[0]?.total_ratings || 0,
      },
    });
  } catch (err) {
    console.error('GET /api/product-ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
}
