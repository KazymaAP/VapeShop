import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { name, specification, price, stock, brand_id, category_id, is_new, is_hit, promotion } = req.body;

      const result = await query(
        `INSERT INTO products (name, specification, price, stock, brand_id, category_id, is_new, is_hit, promotion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [name, specification || null, price, stock, brand_id || null, category_id || null, is_new || false, is_hit || false, promotion || false]
      );

      res.status(200).json({ product: result.rows[0] });
    } catch {
      res.status(500).json({ error: 'Ошибка создания товара' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, name, specification, price, stock, brand_id, category_id, is_active, is_new, is_hit, promotion, telegram_id } = req.body;

      const oldProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
      const old = oldProduct.rows[0];

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (specification !== undefined) { fields.push(`specification = $${idx++}`); values.push(specification); }
      if (price !== undefined) { fields.push(`price = $${idx++}`); values.push(price); }
      if (stock !== undefined) { fields.push(`stock = $${idx++}`); values.push(stock); }
      if (brand_id !== undefined) { fields.push(`brand_id = $${idx++}`); values.push(brand_id); }
      if (category_id !== undefined) { fields.push(`category_id = $${idx++}`); values.push(category_id); }
      if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
      if (is_new !== undefined) { fields.push(`is_new = $${idx++}`); values.push(is_new); }
      if (is_hit !== undefined) { fields.push(`is_hit = $${idx++}`); values.push(is_hit); }
      if (promotion !== undefined) { fields.push(`promotion = $${idx++}`); values.push(promotion); }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      await query(`UPDATE products SET ${fields.join(', ')} WHERE id = $${idx}`, values);

      const changes: Record<string, { old: unknown; new: unknown }> = {};
      ['name', 'specification', 'price', 'stock', 'brand_id', 'category_id', 'is_active', 'is_new', 'is_hit', 'promotion'].forEach((field) => {
        if (req.body[field] !== undefined && old[field] !== req.body[field]) {
          changes[field] = { old: old[field], new: req.body[field] };
        }
      });

      if (Object.keys(changes).length > 0) {
        await query(
          `INSERT INTO product_history (product_id, user_telegram_id, changes) VALUES ($1, $2, $3)`,
          [id, telegram_id || null, JSON.stringify(changes)]
        );
      }

      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка обновления товара' });
    }
  } else if (req.method === 'GET') {
    try {
      const { search } = req.query;
      let whereClause = '';
      const params: unknown[] = [];

      if (search) {
        whereClause = `WHERE p.name ILIKE $1 OR p.specification ILIKE $1`;
        params.push(`%${search}%`);
      }

      const result = await query(
        `SELECT p.*, b.name as brand_name, c.name as category_name
         FROM products p
         LEFT JOIN brands b ON p.brand_id = b.id
         LEFT JOIN categories c ON p.category_id = c.id
         ${whereClause}
         ORDER BY p.created_at DESC`,
        params
      );

      res.status(200).json({ products: result.rows });
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await query('DELETE FROM products WHERE id = $1', [id]);
      res.status(200).json({ success: true });
    } catch {
      res.status(500).json({ error: 'Ошибка удаления товара' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
