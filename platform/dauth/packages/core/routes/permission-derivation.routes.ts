import { Router } from 'express';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate, requirePermission } from '..';
import { safeQuery, tenantSchema } from '@dos/db';

const router = Router();

router.get('/tree', authenticate, requirePermission('admin.system.read'), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(`SELECT fr.name as role, p.code as permission FROM "${schema}".role_permissions rp JOIN "${schema}".functional_roles fr ON rp.functional_role_id = fr.id JOIN "${schema}".permissions p ON rp.permission_id = p.id ORDER BY fr.name, p.code`);
  const tree: Record<string, string[]> = {};
  for (const row of result.rows) { (tree[row.role] ??= []).push(row.permission); }
  res.json(tree);
}));

export default router;
