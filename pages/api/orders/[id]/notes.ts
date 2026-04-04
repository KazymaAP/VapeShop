import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, getTelegramId } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export default requireAuth(async (req, res) => {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await query(
        'SELECT * FROM manager_notes_history WHERE order_id = $1 ORDER BY created_at DESC',
        [id]
      );
      res.status(200).json({ data: result.rows });
    } catch (err) {
      console.error('Error fetching notes:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { note } = req.body;
      const telegramId = getTelegramId(req);

      const noteResult = await query(
        'INSERT INTO manager_notes_history (order_id, manager_id, note) VALUES ($1, $2, $3) RETURNING *',
        [id, telegramId, note]
      );

      await query(
        'UPDATE orders SET manager_notes = $1 WHERE id = $2',
        [note, id]
      );

      res.status(201).json({ data: noteResult.rows[0] });
    } catch (err) {
      console.error('Error creating note:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}, ['manager', 'admin', 'super_admin']);
