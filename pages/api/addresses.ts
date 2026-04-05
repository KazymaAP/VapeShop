import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getTelegramIdFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получаем текущего пользователя
  const currentTelegramId = await getTelegramIdFromRequest(req);

  // Для всех операций нужна авторизация
  if (!currentTelegramId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // ⚠️ КРИТИЧНО: проверяем, что пользователь запрашивает СВОИ адреса
      // Игнорируем telegram_id из query, используем только текущего пользователя
      const result = await query(
        'SELECT * FROM addresses WHERE user_telegram_id = $1 ORDER BY is_default DESC, id',
        [currentTelegramId]
      );

      res.status(200).json({ addresses: result.rows });
    } catch (err) {
      console.error('Get addresses error:', err);
      res.status(500).json({ error: 'Ошибка загрузки адресов' });
    }
  } else if (req.method === 'POST') {
    try {
      const { address, is_default } = req.body;

      if (!address || address.trim().length === 0) {
        return res.status(400).json({ error: 'Address is required' });
      }

      if (address.length > 500) {
        return res.status(400).json({ error: 'Address is too long' });
      }

      // ⚠️ КРИТИЧНО: используем текущего пользователя, игнорируем telegram_id из body
      if (is_default) {
        await query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [
          currentTelegramId,
        ]);
      }

      const result = await query(
        'INSERT INTO addresses (user_telegram_id, address, is_default) VALUES ($1, $2, $3) RETURNING *',
        [currentTelegramId, address, is_default || false]
      );

      res.status(200).json({ address: result.rows[0] });
    } catch (err) {
      console.error('Post address error:', err);
      res.status(500).json({ error: 'Ошибка добавления адреса' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id required' });

      // Проверяем принадлежность адреса пользователю
      const addrRes = await query('SELECT user_telegram_id FROM addresses WHERE id = $1', [id]);
      if (!addrRes.rows[0]) {
        return res.status(404).json({ error: 'Address not found' });
      }

      if (Number(addrRes.rows[0].user_telegram_id) !== currentTelegramId) {
        return res.status(403).json({ error: "Forbidden: cannot delete another user's address" });
      }

      await query('DELETE FROM addresses WHERE id = $1', [id]);

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete address error:', err);
      res.status(500).json({ error: 'Ошибка удаления адреса' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, is_default } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Проверяем принадлежность адреса пользователю
      const addrRes = await query('SELECT user_telegram_id FROM addresses WHERE id = $1', [id]);
      if (!addrRes.rows[0]) {
        return res.status(404).json({ error: 'Address not found' });
      }

      if (Number(addrRes.rows[0].user_telegram_id) !== currentTelegramId) {
        return res.status(403).json({ error: "Forbidden: cannot modify another user's address" });
      }

      if (is_default) {
        await query('UPDATE addresses SET is_default = false WHERE user_telegram_id = $1', [
          currentTelegramId,
        ]);
      }

      await query('UPDATE addresses SET is_default = $1 WHERE id = $2', [is_default || false, id]);

      res.status(200).json({ success: true });
    } catch (err) {
      console.error('Put address error:', err);
      res.status(500).json({ error: 'Ошибка обновления адреса' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
