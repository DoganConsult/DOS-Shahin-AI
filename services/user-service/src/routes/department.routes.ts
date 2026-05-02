import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '@dos/platform-core/http';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../domain/department.service';
import { createDepartmentBody, updateDepartmentBody } from '../schemas/user.schemas';
import { UserServiceError } from '../domain/contracts/user-errors';
import { writeRateLimiter } from '../middleware/rate-limiter';
import { requireAdmin } from '../middleware/ownership';

const router = Router();

router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('department'));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const result = await getDepartments(req.tenantId!);
  res.json({ success: true, departments: result.rows, count: result.count });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dept = await getDepartmentById(req.tenantId!, req.params.id);
  if (!dept) throw new UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
  res.json({ success: true, data: dept });
}));

router.post(
  '/',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: createDepartmentBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const dept = await createDepartment(req.tenantId!, req.body);
    setAuditData(res, { action: 'department.create', entityType: 'department', entityId: String(dept.dept_id ?? dept.id), afterState: dept });
    res.status(201).json({ success: true, data: dept });
  }),
);

router.put(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: updateDepartmentBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await updateDepartment(req.tenantId!, req.params.id, req.body);
    if (!updated) throw new UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
    setAuditData(res, { action: 'department.update', entityType: 'department', entityId: String(updated.dept_id ?? updated.id), afterState: updated });
    res.json({ success: true, data: updated });
  }),
);

router.delete(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await deleteDepartment(req.tenantId!, req.params.id);
    if (!result.deleted) throw new UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
    setAuditData(res, { action: 'department.delete', entityType: 'department', entityId: req.params.id });
    res.json({ success: true, message: 'Department deleted' });
  }),
);

export { router as departmentRouter };
