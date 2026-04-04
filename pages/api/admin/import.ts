import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { rateLimit, RATE_LIMIT_PRESETS } from '@/lib/rateLimit';

export const config = { api: { bodyParser: false } };

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size: 10MB' });
    }

    const content = fs.readFileSync(file.filepath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ error: 'Empty CSV file' });
    }

    const headers = lines[0].split(';').map((h) => h.trim());
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    // ⚠️ КРИТИЧНО: используем транзакцию для гарантии целостности данных
    try {
      await query('BEGIN');

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map((v) => v.trim());
        if (values.length < 2) {
          skipped++;
          continue;
        }

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

        if (!name) {
          skipped++;
          continue;
        }

        // Валидация данных
        if (name.length > 255 || name.length < 3) {
          skipped++;
          continue;
        }

        if (stock < 0 || price1 < 0) {
          skipped++;
          continue;
        }

        // ⚠️ КРИТИЧНО: проверяем на дубликаты и обновляем цену вместо вставки
        const existingRes = await query(
          'SELECT id FROM price_import WHERE name = $1 LIMIT 1',
          [name]
        );

        if (existingRes.rows.length > 0) {
          // Товар уже существует, обновляем цену
          await query(
            `UPDATE price_import 
             SET stock = $1, price_tier_1 = $2, price_tier_2 = $3, price_tier_3 = $4, distributor_price = $5, updated_at = NOW()
             WHERE id = $6`,
            [stock, price1 || 0, price2 || 0, price3 || 0, distPrice || 0, existingRes.rows[0].id]
          );
          updated++;
        } else {
          // Товар новый, вставляем
          await query(
            `INSERT INTO price_import (name, specification, stock, price_tier_1, price_tier_2, price_tier_3, distributor_price)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [name, specification, stock, price1 || 0, price2 || 0, price3 || 0, distPrice || 0]
          );
          imported++;
        }
      }

      // Завершаем транзакцию
      await query('COMMIT');

      // Логируем импорт
      const adminTelegramId = (req as Record<string, unknown>).telegramId as string;
      await query(
        `INSERT INTO audit_log (user_telegram_id, action, table_name, details)
         VALUES ($1, $2, $3, $4)`,
        [adminTelegramId, 'CSV_IMPORT', 'price_import', JSON.stringify({ imported, updated, skipped, total_lines: lines.length - 1 })]
      ).catch(() => {});

      res.status(200).json({
        message: `Импорт завершён: ${imported} товаров добавлено, ${updated} обновлено, ${skipped} пропущено`,
        statistics: { imported, updated, skipped }
      });
    } catch (txErr) {
      // Откатываем транзакцию при ошибке
      await query('ROLLBACK').catch(() => {});
      throw txErr;
    }
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Ошибка импорта CSV' });
  }
}

export default rateLimit(requireAuth(handler, ['admin']), RATE_LIMIT_PRESETS.strict);

