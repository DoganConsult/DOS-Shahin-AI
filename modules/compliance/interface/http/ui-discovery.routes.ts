/**
 * UI discovery router — lets the SPA shell ask the Compliance backend
 * which component keys are owned by the module and what their readiness is.
 *
 * Mounted on `/api/compliance` alongside the runtime-config router.
 *   GET /ui/components          → full registry
 *   GET /ui/components/:key     → single entry or 404
 */
import { Router, type Router as ExpressRouter } from 'express';
import {
  COMPLIANCE_COMPONENT_KEYS,
  componentRegistryByKey,
} from '../../ui/component-registry';

export function createUiDiscoveryRouter(): ExpressRouter {
  const router = Router();

  router.get('/ui/components', (_req, res) => {
    res.json({
      data: {
        moduleCode: 'compliance',
        count: COMPLIANCE_COMPONENT_KEYS.length,
        components: COMPLIANCE_COMPONENT_KEYS,
      },
    });
  });

  router.get('/ui/components/:key', (req, res) => {
    const entry = componentRegistryByKey[req.params.key];
    if (!entry) {
      res.status(404).json({ error: { code: 'not_found', message: `unknown component key: ${req.params.key}` } });
      return;
    }
    res.json({ data: entry });
  });

  return router;
}
