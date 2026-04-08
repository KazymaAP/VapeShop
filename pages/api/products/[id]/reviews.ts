import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

/**
 * GET /api/products/[id]/reviews - получить отзывы о товаре
 * POST /api/products/[id]/reviews - оставить отзыв (требует auth)
 * DELETE /api/products/[id]/reviews/[review_id] - удалить свой отзыв
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, review_id } = req.query;

  if (!id || typeof id !== 'string') {
    return apiError(res, 'Invalid product id', 400);
  }

  // Проверяем, существует ли товар
  const productCheck = await query('SELECT id FROM products WHERE id = $1', [id]);
  if (productCheck.rows.length === 0) {
    return apiError(res, 'Product not found', 404);
  }

  if (req.method === 'GET') {
    return handleGetReviews(id, req, res);
  } else if (req.method === 'POST') {
    return handleCreateReview(id, req, res);
  } else if (req.method === 'DELETE') {
    return handleDeleteReview(review_id as string, req, res);
  } else {
    return apiError(res, 'Method not allowed', 405);
  }
}

async function handleGetReviews(productId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(Math.max(1, parseInt(String(limit), 10)), 50);
    const offset = (pageNum - 1) * limitNum;

    // Получаем количество отзывов
    const countResult = await query(
      'SELECT COUNT(*) as cnt FROM product_reviews WHERE product_id = $1',
      [productId]
    );
    const total = parseInt(countResult.rows[0].cnt, 10);

    // Получаем отзывы
    const result = await query(
      `SELECT 
        id, product_id, user_telegram_id, comment, rating, 
        created_at, updated_at, user_name, user_avatar
       FROM product_reviews 
       WHERE product_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [productId, limitNum, offset]
    );

    const reviews = result.rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      user_telegram_id: row.user_telegram_id,
      comment: row.comment,
      rating: row.rating || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
    }));

    return apiSuccess(
      res,
      {
        reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      200,
      { total }
    );
  } catch (err) {
    logger.error('Get reviews error:', err);
    return apiError(res, 'Failed to load reviews', 500);
  }
}

async function handleCreateReview(productId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const telegramId = await getTelegramIdFromRequest(req);
    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    const { comment, rating } = req.body;

    // Валидация входных данных
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return apiError(res, 'Comment is required and must be non-empty', 400);
    }

    if (comment.length > 2000) {
      return apiError(res, 'Comment too long (max 2000 chars)', 400);
    }

    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return apiError(res, 'Rating must be between 1 and 5', 400);
    }

    // Проверяем, не оставил ли уже отзыв этот пользователь
    const existingReview = await query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_telegram_id = $2',
      [productId, telegramId]
    );

    if (existingReview.rows.length > 0) {
      return apiError(res, 'You already left a review for this product', 409);
    }

    // Получаем информацию о пользователе для имени
    const userResult = await query(
      'SELECT first_name, last_name FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    const userName =
      userResult.rows.length > 0
        ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name || ''}`.trim()
        : `User #${telegramId}`;

    // Создаем отзыв
    const insertResult = await query(
      `INSERT INTO product_reviews (product_id, user_telegram_id, comment, rating, user_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, product_id, user_telegram_id, comment, rating, created_at, updated_at, user_name`,
      [productId, telegramId, comment, rating || null, userName]
    );

    if (insertResult.rows.length === 0) {
      throw new Error('Failed to insert review');
    }

    const review = insertResult.rows[0];

    // Обновляем среднюю оценку товара (если таблица product_ratings существует)
    if (rating) {
      try {
        await query(
          `UPDATE products 
           SET rating = (
             SELECT AVG(rating)::numeric(3,2) FROM product_reviews 
             WHERE product_id = $1 AND rating IS NOT NULL
           ),
           reviews_count = (
             SELECT COUNT(*) FROM product_reviews WHERE product_id = $1
           )
           WHERE id = $1`,
          [productId]
        );
      } catch (err: unknown) {
        logger.warn('Failed to update product rating:', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info(`Review created for product ${productId} by user ${telegramId}`);

    return apiSuccess(
      res,
      {
        id: review.id,
        product_id: review.product_id,
        comment: review.comment,
        rating: review.rating,
        created_at: review.created_at,
      },
      201
    );
  } catch (err) {
    logger.error('Create review error:', err);
    return apiError(res, 'Failed to create review', 500);
  }
}

async function handleDeleteReview(reviewId: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!reviewId || typeof reviewId !== 'string') {
      return apiError(res, 'Invalid review id', 400);
    }

    const telegramId = await getTelegramIdFromRequest(req);
    if (!telegramId) {
      return apiError(res, 'Unauthorized', 401);
    }

    // Проверяем, что отзыв принадлежит пользователю
    const reviewCheck = await query(
      'SELECT product_id FROM product_reviews WHERE id = $1 AND user_telegram_id = $2',
      [reviewId, telegramId]
    );

    if (reviewCheck.rows.length === 0) {
      return apiError(res, 'Cannot delete this review', 403);
    }

    const productId = reviewCheck.rows[0].product_id;

    // Удаляем отзыв
    await query('DELETE FROM product_reviews WHERE id = $1', [reviewId]);

    // Обновляем среднюю оценку товара
    try {
      await query(
        `UPDATE products 
         SET rating = (
           SELECT AVG(rating)::numeric(3,2) FROM product_reviews 
           WHERE product_id = $1 AND rating IS NOT NULL
         ),
         reviews_count = (
           SELECT COUNT(*) FROM product_reviews WHERE product_id = $1
         )
         WHERE id = $1`,
        [productId]
      );
    } catch (err: unknown) {
      logger.warn('Failed to update product rating after review deletion:', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info(`Review ${reviewId} deleted by user ${telegramId}`);

    return apiSuccess(res, { review_deleted: true }, 200);
  } catch (err) {
    logger.error('Delete review error:', err);
    return apiError(res, 'Failed to delete review', 500);
  }
}
