import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { query } from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';

export const config = { api: { bodyParser: false } };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = fs.readFileSync(file.filepath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ error: 'Empty CSV file' });
    }

    const headers = lines[0].split(';').map((h) => h.trim());
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map((v) => v.trim());
      if (values.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const name = row['Наименование'] || row['name'] || row['Название'] || '';
      const specification = row['Характеристика'] || row['specification'] || '';
      const stock = parseInt(row['КОЛИЧЕСТВО'] || row['stock'] || '0', 10);
      const price1 = parseFloat((row['до 50.000 р'] || row['price_tier_1'] || '0').replace(/\s/g, ''));
      const price2 = parseFloat((row['от 50.000 р'] || row['price_tier_2'] || '0').replace(/\s/g, ''));
      const price3 = parseFloat((row['от 100.000 р'] || row['price_tier_3'] || '0').replace(/\s/g, ''));
      const distPrice = parseFloat((row['ДИСТР.ЦЕНА'] || row['distributor_price'] || '0').replace(/\s/g, ''));

      if (!name) continue;

      await query(
        `INSERT INTO price_import (name, specification, stock, price_tier_1, price_tier_2, price_tier_3, distributor_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, specification, stock, price1 || 0, price2 || 0, price3 || 0, distPrice || 0]
      );

      imported++;
    }

    res.status(200).json({ message: `Импортировано ${imported} товаров` });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Ошибка импорта CSV' });
  }
}

export default requireAuth(handler, ['admin']);
