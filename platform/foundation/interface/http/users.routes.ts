import { Request, Response, Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, moduleStack, scopeContext } from '../../ports/middleware.port';
import { getClient, safeQuery, tenantSchema } from '../../ports/database.port';
import { validate } from "../../ports/middleware.port";
import { genericFoundationSchema } from "../../schemas/foundation.schemas";
import { sendCsv } from './csv.util';

const router = Router();

router.use(moduleStack('foundation'));
router.use(auditMiddleware('foundation'));
router.use(scopeContext);

function getCount(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sendMissing(res: Response, error: string): void {
  res.status(400).json({ success: false, error });
}

router.get(
  '/',
  authenticate,
  requirePermission('foundation.record.read'),
  async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);

    await safeQuery('SELECT 1');
    const countResult = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".users WHERE deleted_at IS NULL`);
    const listResult = await safeQuery(
      `SELECT u.*, d.name_en AS department_name
       FROM "${schema}".users u
       LEFT JOIN "${schema}".departments d ON d.id = u.department_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
    );

    res.json({
      success: true,
      users: listResult.rows,
      count: getCount(countResult.rows[0]?.count, listResult.rows.length),
    });
  },
);

router.get(
  '/export',
  authenticate,
  requirePermission('foundation.record.read'),
  async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const search = (req.query.search as string | undefined)?.trim() || null;
    const status = (req.query.status as string | undefined) || null;
    const role = (req.query.role as string | undefined) || null;
    const departmentId = (req.query.department_id as string | undefined) || null;

    const result = await safeQuery(
      `SELECT u.user_id, u.id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.department_id, d.name_en AS department_name,
              u.created_at, u.updated_at
       FROM "${schema}".users u
       LEFT JOIN "${schema}".departments d ON d.id = u.department_id
       WHERE u.deleted_at IS NULL
         AND ($1::text IS NULL OR (u.email ILIKE '%'||$1||'%' OR u.first_name ILIKE '%'||$1||'%' OR u.last_name ILIKE '%'||$1||'%'))
         AND ($2::text IS NULL OR u.status = $2)
         AND ($3::text IS NULL OR u.role = $3)
         AND ($4::text IS NULL OR u.department_id::text = $4)
       ORDER BY u.created_at DESC`,
      [search, status, role, departmentId],
    );

    sendCsv(
      res,
      'foundation-users',
      ['user_id', 'email', 'first_name', 'last_name', 'role', 'status', 'department_id', 'department_name', 'created_at', 'updated_at'],
      result.rows as any[],
    );
  },
);

router.post(
  '/',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const { email, first_name, last_name, role, department_id } = req.body ?? {};
    if (!email) {
      sendMissing(res, 'email required');
      return;
    }

    const schema = tenantSchema((req as any).tenantId);
    const result = await safeQuery(
      `INSERT INTO "${schema}".users (email, first_name, last_name, role, department_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       RETURNING *`,
      [email, first_name ?? null, last_name ?? null, role ?? 'viewer', department_id ?? null],
    );

    res.status(201).json(result.rows[0]);
  },
);

router.put(
  '/:id',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const existsResult = await safeQuery(
      `SELECT user_id FROM "${schema}".users WHERE id = $1 OR user_id = $1 LIMIT 1`,
      [req.params.id],
    );

    if (!existsResult.rows[0]) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const { role, department_id, first_name, last_name, email, status } = req.body ?? {};
    const updateResult = await safeQuery(
      `UPDATE "${schema}".users
       SET role = COALESCE($2, role),
           department_id = COALESCE($3, department_id),
           first_name = COALESCE($4, first_name),
           last_name = COALESCE($5, last_name),
           email = COALESCE($6, email),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $1 OR user_id = $1
       RETURNING *`,
      [req.params.id, role ?? null, department_id ?? null, first_name ?? null, last_name ?? null, email ?? null, status ?? null],
    );

    res.json(updateResult.rows[0]);
  },
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const schema = tenantSchema((req as any).tenantId);
    const result = await safeQuery(
      `UPDATE "${schema}".users
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 OR user_id = $1
       RETURNING id`,
      [req.params.id],
    );

    if (!result.rows[0]) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, message: 'User deleted' });
  },
);

router.post(
  '/bulk/assign-role',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const { user_ids, role } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0 || !role) {
      sendMissing(res, 'user_ids and role required');
      return;
    }

    const schema = tenantSchema((req as any).tenantId);
    const client = await getClient();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE "${schema}".users
         SET role = $2, updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`,
        [user_ids, role],
      );
      await client.query('COMMIT');
      res.json({ success: true, updated: result.rows.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
);

router.post(
  '/bulk/deactivate',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const { user_ids } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      sendMissing(res, 'user_ids required');
      return;
    }

    const schema = tenantSchema((req as any).tenantId);
    const client = await getClient();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE "${schema}".users
         SET status = 'inactive', updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`,
        [user_ids],
      );
      await client.query('COMMIT');
      res.json({ success: true, updated: result.rows.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
);

router.post(
  '/bulk/assign-department',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: Request, res: Response) => {
    const { user_ids, department_id } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      sendMissing(res, 'user_ids required');
      return;
    }

    const schema = tenantSchema((req as any).tenantId);
    const client = await getClient();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE "${schema}".users
         SET department_id = $2, updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`,
        [user_ids, department_id ?? null],
      );
      await client.query('COMMIT');
      res.json({ success: true, updated: result.rows.length });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
);

export default router;
