/**
 * @dos/module-compliance — HTTP aggregator.
 *
 * Mirrors Foundation's `createFoundationAggregatorRouter` pattern.
 * Mounts every prefix declared in `module.manifest.json#routeBases`.
 *
 * Each prefix routes to a real router when the module's port-fix codemod (W2)
 * has wired it; otherwise falls back to a typed `notImplemented` router that
 * returns HTTP 501 with the route metadata. This guarantees the mount surface
 * is observable even before each vertical slice is wired.
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import manifest from '../../module.manifest.json';

export interface ComplianceAggregatorDeps {
  /** Pre-built routers keyed by routeBase (e.g. `'/api/compliance'`). */
  routers?: Record<string, ExpressRouter>;
  /** Optional override for the not-implemented response shape. */
  notImplementedHandler?: (routeBase: string) => ExpressRouter;
}

const buildNotImplementedRouter = (routeBase: string): ExpressRouter => {
  const r = Router();
  r.all('*', (req: Request, res: Response) => {
    res.status(501).json({
      status: 'not_implemented',
      module: manifest.moduleCode,
      version: manifest.version,
      routeBase,
      requestedPath: req.originalUrl,
      method: req.method,
      message: 'Compliance route mount surface present; vertical handler will be wired in subsequent waves.',
    });
  });
  return r;
};

/**
 * Returns the prefix-keyed routers that the aggregator will mount.
 * Reads `manifest.routeBases` so the surface is data-driven.
 */
export function listRouteBases(): string[] {
  const bases = (manifest as { routeBases?: string[] }).routeBases ?? [];
  return [...new Set(bases)].filter((b) => typeof b === 'string' && b.length > 0);
}

export function createComplianceAggregatorRouter(
  deps: ComplianceAggregatorDeps = {},
): { router: ExpressRouter; mounts: Array<{ routeBase: string; wired: boolean }> } {
  const router = Router();
  const mounts: Array<{ routeBase: string; wired: boolean }> = [];
  const fallback = deps.notImplementedHandler ?? buildNotImplementedRouter;

  for (const routeBase of listRouteBases()) {
    const wired = deps.routers?.[routeBase];
    const sub = wired ?? fallback(routeBase);
    router.use(routeBase, sub);
    mounts.push({ routeBase, wired: Boolean(wired) });
  }

  router.get('/__compliance/mounts', (_req, res) => {
    res.json({ module: manifest.moduleCode, version: manifest.version, mounts });
  });

  return { router, mounts };
}
