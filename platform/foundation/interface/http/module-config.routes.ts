/**
 * Foundation module-config runtime endpoint.
 *
 * Serves the static config bundles defined under `modules/foundation/config/*`
 * so the frontend can resolve list/detail/form/views/filters dynamically
 * without hardcoded component assumptions.
 *
 * Mounted by the Foundation aggregator under:
 *   GET /api/foundation/module-config/list/:variant?
 *   GET /api/foundation/module-config/detail/:variant?
 *   GET /api/foundation/module-config/form/:variant?
 *   GET /api/foundation/module-config/views/:variant?
 *   GET /api/foundation/module-config/filters
 *   GET /api/foundation/module-config            (full bundle)
 *
 * The platform-wide `/api/module-config/foundation/...` proxy lives in
 * tenant-service; both paths converge on the same source of truth.
 */
import { Router, type Request, type Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { FOUNDATION_LIST_CONFIGS } from '../../config/list.config';
import { FOUNDATION_DETAIL_CONFIGS } from '../../config/detail.config';
import { FOUNDATION_FORM_CONFIGS } from '../../config/form.config';
import { FOUNDATION_DEFAULT_VIEWS } from '../../config/views.config';
import {
  FOUNDATION_STATUS_FILTER_OPTIONS,
  FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
  FOUNDATION_PERMISSION_FILTER_VALUES,
} from '../../config/filters.config';

const router = Router();

router.use(authenticate);
router.use(requirePermission('foundation.read'));

function resolve<T>(map: Record<string, T>, variant: string | undefined, res: Response): T | undefined {
  if (!variant) return undefined;
  const value = map[variant];
  if (!value) {
    res.status(404).json({
      success: false,
      error: 'Unknown variant',
      variant,
      allowed: Object.keys(map),
    });
    return undefined;
  }
  return value;
}

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      list: FOUNDATION_LIST_CONFIGS,
      detail: FOUNDATION_DETAIL_CONFIGS,
      form: FOUNDATION_FORM_CONFIGS,
      views: FOUNDATION_DEFAULT_VIEWS,
      filters: {
        status: FOUNDATION_STATUS_FILTER_OPTIONS,
        entityType: FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
        permissions: FOUNDATION_PERMISSION_FILTER_VALUES,
      },
    },
  });
});

router.get('/list/:variant?', (req: Request, res: Response) => {
  if (!req.params.variant) {
    res.json({ success: true, data: FOUNDATION_LIST_CONFIGS });
    return;
  }
  const cfg = resolve(FOUNDATION_LIST_CONFIGS, req.params.variant, res);
  if (cfg) res.json({ success: true, data: cfg });
});

router.get('/detail/:variant?', (req: Request, res: Response) => {
  if (!req.params.variant) {
    res.json({ success: true, data: FOUNDATION_DETAIL_CONFIGS });
    return;
  }
  const cfg = resolve(FOUNDATION_DETAIL_CONFIGS, req.params.variant, res);
  if (cfg) res.json({ success: true, data: cfg });
});

router.get('/form/:variant?', (req: Request, res: Response) => {
  if (!req.params.variant) {
    res.json({ success: true, data: FOUNDATION_FORM_CONFIGS });
    return;
  }
  const cfg = resolve(FOUNDATION_FORM_CONFIGS, req.params.variant, res);
  if (cfg) res.json({ success: true, data: cfg });
});

router.get('/views/:variant?', (req: Request, res: Response) => {
  if (!req.params.variant) {
    res.json({ success: true, data: FOUNDATION_DEFAULT_VIEWS });
    return;
  }
  const cfg = resolve(FOUNDATION_DEFAULT_VIEWS, req.params.variant, res);
  if (cfg) res.json({ success: true, data: cfg });
});

router.get('/filters', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: FOUNDATION_STATUS_FILTER_OPTIONS,
      entityType: FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
      permissions: FOUNDATION_PERMISSION_FILTER_VALUES,
    },
  });
});

export { router as moduleConfigRouter };
export default router;
