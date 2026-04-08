import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';
import { validateProduct, validatePagination } from '@/lib/validate';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';
import { ApiResponse } from '../../../types/api';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const {
        name,
        specification,
        price,
        stock,
        brand_id,
        category_id,
        is_new,
        is_hit,
        promotion,
        image_url,
      } = req.body;

      // Валидация
      const errors = validateProduct({
        name,
        specification,
        price,
        stock,
        category_id,
        brand_id,
        image_url,
      });
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const adminTelegramId = getTelegramId(req);

      const result = await query(
        `INSERT INTO products (name, specification, price, stock, brand_id, category_id, is_new, is_hit, promotion, image_url, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          name,
          specification || null,
          price,
          stock,
          brand_id || null,
          category_id || null,
          is_new || false,
          is_hit || false,
          promotion || false,
          image_url || null,
          true,
          adminTelegramId,
        ]
      );

      // Логируем
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
         VALUES ($1, $2, $3, $4)`,
        [
          adminTelegramId,
          'CREATE_PRODUCT',
          'products',
          JSON.stringify({ product_id: result.rows[0].id, name }),
        ]
      ).catch(() => {});

      const response: ApiResponse = {
        success: true,
        data: { product: result.rows[0] },
        timestamp: Date.now(),
      };

      res.status(201).json(response);
    } catch (err) {
      logger.error('Product creation error:', err);
      res
        .status(500)
        .json({ error: 'Ошибка создания товара', success: false, timestamp: Date.now() });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Product ID required' });
      }

      // Валидация только переданных полей
      const errors = validateProduct(updateData);
      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // Проверяем что товар существует
      const oldProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
      if (oldProduct.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const old = oldProduct.rows[0];

      const fields: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      let idx = 1;

      // Список допустимых полей для обновления
      const allowedFields = [
        'name',
        'specification',
        'price',
        'stock',
        'brand_id',
        'category_id',
        'is_active',
        'is_new',
        'is_hit',
        'promotion',
        'image_url',
      ];
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          fields.push(`${field} = $${idx++}`);
          values.push(updateData[field]);
        }
      });

      // Проверяем, что есть хотя бы одно поле для обновления
      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      // Выполняем UPDATE с RETURNING для подтверждения
      const updateResult = await query(
        `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (updateResult.rows.length === 0) {
        return res.status(500).json({ error: 'Update failed - no rows returned' });
      }

      // Логируем изменения
      const changes: Record<string, { old: unknown; new: unknown }> = {};
      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined && old[field] !== updateData[field]) {
          changes[field] = { old: old[field], new: updateData[field] };
        }
      });

      if (Object.keys(changes).length > 0) {
        const adminTelegramId = getTelegramId(req);
        await query(
          `INSERT INTO product_history (product_id, user_telegram_id, changes) VALUES ($1, $2, $3)`,
          [id, adminTelegramId || null, JSON.stringify(changes)]
        ).catch(() => {});

        // Логируем в audit_log
        await query(
          `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
           VALUES ($1, $2, $3, $4)`,
          [
            adminTelegramId,
            'UPDATE_PRODUCT',
            'products',
            JSON.stringify({ product_id: id, changes }),
          ]
        ).catch(() => {});
      }

      const response: ApiResponse = {
        success: true,
        data: { product: updateResult.rows[0], changes },
        timestamp: Date.now(),
      };

      res.status(200).json(response);
    } catch (err) {
      logger.error('Product update error:', err);
      res
        .status(500)
        .json({ error: 'Ошибка обновления товара', success: false, timestamp: Date.now() });
    }
  } else if (req.method === 'GET') {
    try {
      const { search, page = '1', limit = '20', category_id, brand_id } = req.query;

      // Валидация пагинации
      const pageNum = parseInt(String(page));
      const limitNum = Math.min(parseInt(String(limit)), 100);

      const validationErrors = validatePagination(pageNum, limitNum);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Invalid pagination', details: validationErrors });
      }

      const offset = (pageNum - 1) * limitNum;

      // Построение WHERE условия
      let whereClause = '';
      const params: (string | number | boolean | null)[] = [];

      if (search) {
        whereClause = `WHERE (p.name ILIKE $1 OR p.specification ILIKE $1)`;
        params.push(`%${search}%`);
      }

      if (category_id) {
        whereClause += whereClause
          ? ` AND p.category_id = $${params.length + 1}`
          : `WHERE p.category_id = $${params.length + 1}`;
        params.push(parseInt(String(category_id)));
      }

      if (brand_id) {
        whereClause += whereClause
          ? ` AND p.brand_id = $${params.length + 1}`
          : `WHERE p.brand_id = $${params.length + 1}`;
        params.push(parseInt(String(brand_id)));
      }

      // Получаем общее количество
      const countResult = await query(
        `SELECT COUNT(*) as total FROM products p ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Получаем товары с пагинацией
      const result = await query(
        `SELECT p.*, b.name as brand_name, c.name as category_name
         FROM products p
         LEFT JOIN brands b ON p.brand_id = b.id
         LEFT JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      );

      const response: ApiResponse = {
        success: true,
        data: {
          products: result.rows,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        timestamp: Date.now(),
      };

      res.status(200).json(response);
    } catch (err) {
      logger.error('Product list error:', err);
      res
        .status(500)
        .json({ error: 'Ошибка загрузки товаров', success: false, timestamp: Date.now() });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const adminTelegramId = getTelegramId(req);

      if (!id) return res.status(400).json({ error: 'Product ID required' });

      // Проверяем что товар существует
      const productRes = await query('SELECT * FROM products WHERE id = $1', [id]);
      if (productRes.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // ⚠️ КРИТИЧНО: используем soft delete вместо жёсткого удаления
      // Это сохраняет ссылку на товар в заказах и отзывах
      await query(
        'UPDATE products SET is_active = false, updated_by = $1, updated_at = NOW() WHERE id = $2',
        [adminTelegramId, id]
      );

      // Логируем удаление
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, record_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminTelegramId, 'DELETE_PRODUCT', 'products', id, JSON.stringify(productRes.rows[0])]
      ).catch(() => {});

      res.status(200).json({ success: true, message: 'Product deactivated' });
    } catch (err) {
      logger.error('Delete product error:', err);
      res.status(500).json({ error: 'Ошибка удаления товара' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(rateLimit(handler, RATE_LIMIT_PRESETS.normal), ['admin']);
