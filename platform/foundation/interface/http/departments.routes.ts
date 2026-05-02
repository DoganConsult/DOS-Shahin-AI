import { Response, Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, moduleStack, scopeContext } from '../../ports/middleware.port';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../../application/org/department.service';
import { validate } from "../../ports/middleware.port";
import { genericFoundationSchema } from "../../schemas/foundation.schemas";

const router = Router();

router.use(moduleStack('foundation'));
router.use(auditMiddleware('foundation'));
router.use(scopeContext);

function sendMissing(res: Response, error: string): void {
  res.status(400).json({ success: false, error });
}

router.get(
  '/',
  authenticate,
  requirePermission('foundation.record.read'),
  async (req: any, res: Response) => {
    const result = await getDepartments(req.tenantId);
    res.json({
      success: true,
      departments: result.rows,
      count: result.count,
    });
  },
);

router.get(
  '/:id',
  authenticate,
  requirePermission('foundation.record.read'),
  async (req: any, res: Response) => {
    const dept = await getDepartmentById(req.tenantId, req.params.id);
    if (!dept) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    res.json(dept);
  },
);

router.post(
  '/',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: any, res: Response) => {
    const body = req.body ?? {};
    if (!body.name_en) {
      sendMissing(res, 'name_en required');
      return;
    }
    if (!body.bu_id) {
      sendMissing(res, 'bu_id required');
      return;
    }
    
    const newDept = await createDepartment(req.tenantId, body);
    res.status(201).json(newDept);
  },
);

router.put(
  '/:id',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: any, res: Response) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      sendMissing(res, 'update payload required');
      return;
    }
    
    const updated = await updateDepartment(req.tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    res.json(updated);
  },
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('foundation.record.write'), validate({ body: genericFoundationSchema }), async (req: any, res: Response) => {
    const result = await deleteDepartment(req.tenantId, req.params.id);
    if (!result.deleted) {
      res.status(404).json({ success: false, error: 'Department not found' });
      return;
    }
    res.json({
      success: true,
      message: 'Department deleted'
    });
  },
);

export default router;
