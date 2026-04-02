import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../lib/db';

const PAGE_SIZE = 12;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    if (req.query.filters === '1') {
      try {
        const [categories, brands] = await Promise.all([
          query('SELECT id, name FROM categories ORDER BY sort_order, name'),
          query('SELECT id, name FROM brands ORDER BY name'),
        ]);
        return res.status(200).json({ categories: categories.rows, brands: brands.rows });
      } catch (err) {
        return res.status(500).json({ error: 'Ошибка загрузки фильтров' });
      }
    }

    try {
      const { search, category, brand, price_min, price_max, sort = 'created_at', order = 'desc', page = '1' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const offset = (pageNum - 1) * PAGE_SIZE;

      let whereClause = 'WHERE p.is_active = true';
      const params: unknown[] = [];
      let paramIdx = 1;

      if (search) {
        whereClause += ` AND (p.name ILIKE $${paramIdx} OR p.specification ILIKE $${paramIdx})`;
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (category) {
        whereClause += ` AND p.category_id = $${paramIdx}`;
        params.push(category);
        paramIdx++;
      }

      if (brand) {
        whereClause += ` AND p.brand_id = $${paramIdx}`;
        params.push(brand);
        paramIdx++;
      }

      if (price_min) {
        whereClause += ` AND p.price >= $${paramIdx}`;
        params.push(parseFloat(price_min as string));
        paramIdx++;
      }

      if (price_max) {
        whereClause += ` AND p.price <= $${paramIdx}`;
        params.push(parseFloat(price_max as string));
        paramIdx++;
      }

      const sortField = ['price', 'name', 'created_at', 'views'].includes(sort as string) ? `p.${sort}` : 'p.created_at';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      const [countRes, productsRes] = await Promise.all([
        query(`SELECT COUNT(*) FROM products p ${whereClause}`, params),
        query(
          `SELECT p.*, b.name as brand_name, c.name as category_name
           FROM products p
           LEFT JOIN brands b ON p.brand_id = b.id
           LEFT JOIN categories c ON p.category_id = c.id
           ${whereClause}
           ORDER BY ${sortField} ${sortOrder}
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, PAGE_SIZE, offset]
        ),
      ]);

      const total = parseInt(countRes.rows[0].count, 10);
      const totalPages = Math.ceil(total / PAGE_SIZE);

      res.status(200).json({ products: productsRes.rows, totalPages, total });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
