import { requireAuth } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/lib/logger';

export default requireAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
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
      } else if (req.method === 'POST') {
        // CREATE новая роль
        const { name, description, permissions } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Role name required' });
        }

        const roleResult = await transaction(async (client) => {
          const result = await client.query(
            `INSERT INTO roles (name, description, is_system_role)
           VALUES ($1, $2, false)
           RETURNING id, name, description`,
            [name, description || '']
          );

          const roleId = result.rows[0].id;

          // Добавить разрешения
          if (permissions && Array.isArray(permissions)) {
            for (const perm of permissions) {
              await client.query(
                `INSERT INTO role_permissions (role_id, permission)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
                [roleId, perm]
              );
            }
          }

          return result;
        });

        return res.status(201).json(roleResult.rows[0]);
      } else if (req.method === 'PUT') {
        // UPDATE роль
        const { id, description, permissions } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Role id required' });
        }

        await transaction(async (client) => {
          // Проверить что это не система роль
          const roleCheck = await client.query(`SELECT is_system_role FROM roles WHERE id = $1`, [id]);

          if (roleCheck.rows[0].is_system_role) {
            throw new Error('Cannot edit system role');
          }

          // Обновить описание
          if (description !== undefined) {
            await client.query(`UPDATE roles SET description = $1 WHERE id = $2`, [description, id]);
          }

          // Обновить разрешения
          if (permissions && Array.isArray(permissions)) {
            await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
            for (const perm of permissions) {
              await client.query(
                `INSERT INTO role_permissions (role_id, permission)
               VALUES ($1, $2)`,
                [id, perm]
              );
            }
          }
        });

        return res.status(200).json({ success: true });
      } else if (req.method === 'DELETE') {
        // DELETE роль
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Role id required' });
        }

        await transaction(async (client) => {
          // Проверить что это не система роль
          const roleCheck = await client.query(`SELECT is_system_role FROM roles WHERE id = $1`, [id]);

          if (roleCheck.rows[0].is_system_role) {
            throw new Error('Cannot delete system role');
          }

          await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);
          await client.query(`DELETE FROM roles WHERE id = $1`, [id]);
        });

        return res.status(200).json({ success: true });
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (_err) {
      logger.error('rbac error:', _err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  ['super_admin']
);
