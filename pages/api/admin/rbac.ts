import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export default requireAuth(async (req, res) => {
  try {
    if (req.method === 'GET') {
      // GET все роли с их разрешениями
      const rolesResult = await query(
        `SELECT r.id, r.name, r.description, r.is_system_role,
                array_agg(rp.permission) as permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         GROUP BY r.id, r.name, r.description, r.is_system_role
         ORDER BY r.name`,
        []
      );

      return res.status(200).json({ roles: rolesResult.rows });
    } 
    else if (req.method === 'POST') {
      // CREATE новая роль
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Role name required' });
      }

      const roleResult = await query(
        `INSERT INTO roles (name, description, is_system_role)
         VALUES ($1, $2, false)
         RETURNING id, name, description`,
        [name, description || '']
      );

      const roleId = roleResult.rows[0].id;

      // Добавить разрешения
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          await query(
            `INSERT INTO role_permissions (role_id, permission)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [roleId, perm]
          );
        }
      }

      return res.status(201).json(roleResult.rows[0]);
    } 
    else if (req.method === 'PUT') {
      // UPDATE роль
      const { id, description, permissions } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Role id required' });
      }

      // Проверить что это не система роль
      const roleCheck = await query(
        `SELECT is_system_role FROM roles WHERE id = $1`,
        [id]
      );

      if (roleCheck.rows[0].is_system_role) {
        return res.status(403).json({ error: 'Cannot edit system role' });
      }

      // Обновить описание
      if (description !== undefined) {
        await query(
          `UPDATE roles SET description = $1 WHERE id = $2`,
          [description, id]
        );
      }

      // Обновить разрешения
      if (permissions && Array.isArray(permissions)) {
        await query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
        for (const perm of permissions) {
          await query(
            `INSERT INTO role_permissions (role_id, permission)
             VALUES ($1, $2)`,
            [id, perm]
          );
        }
      }

      return res.status(200).json({ success: true });
    } 
    else if (req.method === 'DELETE') {
      // DELETE роль
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Role id required' });
      }

      // Проверить что это не система роль
      const roleCheck = await query(
        `SELECT is_system_role FROM roles WHERE id = $1`,
        [id]
      );

      if (roleCheck.rows[0].is_system_role) {
        return res.status(403).json({ error: 'Cannot delete system role' });
      }

      await query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
      await query(`DELETE FROM roles WHERE id = $1`, [id]);

      return res.status(200).json({ success: true });
    } 
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (_err) {
    console.error('rbac error:', _err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}, ['super_admin']);

