import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { requireAuth, getTelegramId } from '@/lib/auth';

/**
 * Admin endpoint for managing pickup points
 * GET: fetch all pickup points (with optional pagination)
 * POST: create new pickup point
 * PUT: update existing pickup point
 * DELETE: soft delete pickup point (sets is_active=false)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET - Fetch all pickup points
  if (req.method === 'GET') {
    try {
      const { page = '1', limit = '20' } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const pageLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const offset = (pageNum - 1) * pageLimit;

      const result = await query(
        `SELECT * FROM pickup_points 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [pageLimit, offset]
      );

      const countResult = await query('SELECT COUNT(*) as count FROM pickup_points', []);
      const total = parseInt(countResult.rows[0].count, 10);

      res.status(200).json({
        pickup_points: result.rows,
        pagination: {
          total,
          page: pageNum,
          limit: pageLimit,
          pages: Math.ceil(total / pageLimit),
        },
      });
    } catch (err) {
      console.error('Get pickup points error:', err);
      res.status(500).json({ error: 'Ошибка загрузки пунктов выдачи' });
    }
  }
  // POST - Create new pickup point
  else if (req.method === 'POST') {
    try {
      const { name, address } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Название пункта выдачи обязательно' });
      }

      if (!address || typeof address !== 'string' || address.trim().length === 0) {
        return res.status(400).json({ error: 'Адрес пункта выдачи обязателен' });
      }

      const result = await query(
        `INSERT INTO pickup_points (name, address, is_active)
         VALUES ($1, $2, TRUE) RETURNING *`,
        [name.trim(), address.trim()]
      );

      const pickupPoint = result.rows[0];

      // Log admin action
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [
          telegramId,
          'create_pickup_point',
          JSON.stringify({ pickup_point_id: pickupPoint.id, name }),
        ]
      ).catch((err) => console.error('Logging error:', err));

      res.status(201).json({ pickup_point: pickupPoint });
    } catch (err) {
      console.error('Create pickup point error:', err);
      res.status(500).json({ error: 'Ошибка создания пункта выдачи' });
    }
  }
  // PUT - Update existing pickup point
  else if (req.method === 'PUT') {
    try {
      const { id, name, address, is_active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID пункта выдачи обязателен' });
      }

      // Check if pickup point exists
      const existingResult = await query('SELECT * FROM pickup_points WHERE id = $1', [id]);

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Пункт выдачи не найден' });
      }

      const old = existingResult.rows[0];
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (name !== undefined && name !== null) {
        const trimmedName = typeof name === 'string' ? name.trim() : name;
        if (trimmedName.length === 0) {
          return res.status(400).json({ error: 'Название не может быть пустым' });
        }
        fields.push(`name = $${idx++}`);
        values.push(trimmedName);
      }

      if (address !== undefined && address !== null) {
        const trimmedAddress = typeof address === 'string' ? address.trim() : address;
        if (trimmedAddress.length === 0) {
          return res.status(400).json({ error: 'Адрес не может быть пустым' });
        }
        fields.push(`address = $${idx++}`);
        values.push(trimmedAddress);
      }

      if (is_active !== undefined && is_active !== null) {
        fields.push(`is_active = $${idx++}`);
        values.push(is_active);
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      await query(`UPDATE pickup_points SET ${fields.join(', ')} WHERE id = $${idx}`, values);

      const changes: Record<string, { old: unknown; new: unknown }> = {};
      if (name !== undefined && old.name !== name) {
        changes.name = { old: old.name, new: name };
      }
      if (address !== undefined && old.address !== address) {
        changes.address = { old: old.address, new: address };
      }
      if (is_active !== undefined && old.is_active !== is_active) {
        changes.is_active = { old: old.is_active, new: is_active };
      }

      // Log admin action
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [telegramId, 'update_pickup_point', JSON.stringify({ pickup_point_id: id, changes })]
      ).catch((err) => console.error('Logging error:', err));

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Update pickup point error:', err);
      res.status(500).json({ error: 'Ошибка обновления пункта выдачи' });
    }
  }
  // DELETE - Soft delete (set is_active=false)
  else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID пункта выдачи обязателен' });
      }

      // Check if pickup point exists
      const existingResult = await query('SELECT * FROM pickup_points WHERE id = $1', [id]);

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Пункт выдачи не найден' });
      }

      // Soft delete - set is_active=false
      await query('UPDATE pickup_points SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [
        id,
      ]);

      // Log admin action
      const telegramId = getTelegramId(req);
      await query(
        `INSERT INTO admin_logs (user_telegram_id, action, details) VALUES ($1, $2, $3)`,
        [telegramId, 'delete_pickup_point', JSON.stringify({ pickup_point_id: id })]
      ).catch((err) => console.error('Logging error:', err));

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete pickup point error:', err);
      res.status(500).json({ error: 'Ошибка удаления пункта выдачи' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler, ['admin']);
