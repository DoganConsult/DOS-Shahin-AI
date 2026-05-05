/**
 * H-1 test-app harness — builds a minimal Express app with the 4 new
 * Foundation routes mounted, behind a pass-through auth middleware that
 * injects `req.user` and `req.tenantId` from request headers.
 *
 * The real authz middleware (requirePermission etc.) is replaced with
 * pass-through stubs because these tests are about route + service shape,
 * not about authorization. Authz behavior is covered by the Phase G port
 * tests and by the lifecycle-proof scripts.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase H-1)
 */
import express, { type Express, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { setAuthMiddleware, type AuthMiddleware } from '@dos/dauth-shared';

/** Pass-through middleware that reads test fixtures from headers. */
function makeStubAuthMiddleware(): AuthMiddleware {
  const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
    const userId = req.header('x-test-user-id') ?? 'u-test-1';
    const tenantId = req.header('x-test-tenant-id') ?? 'test-tenant';
    const isSuperAdmin = req.header('x-test-is-super-admin') === 'true';
    (req as any).user = {
      userId,
      id: userId,
      tenantId,
      role: isSuperAdmin ? 'admin' : 'member',
      roles: isSuperAdmin ? ['admin', '*'] : ['member'],
      permissions: isSuperAdmin ? ['*'] : [],
      isSuperAdmin,
      is_super_admin: isSuperAdmin,
    };
    (req as any).tenantId = tenantId;
    next();
  };

  const optionalAuthenticate = authenticate;

  const passthrough: RequestHandler = (_req, _res, next) => next();

  return {
    authenticate,
    optionalAuthenticate,
    requirePermission: () => passthrough,
    requireAnyPermission: () => passthrough,
    requireSuperAdmin: passthrough,
  };
}

let _appPromise: Promise<Express> | null = null;

/** Lazily build (and cache) the test app. */
export async function getTestApp(): Promise<Express> {
  if (_appPromise) return _appPromise;
  _appPromise = (async () => {
    setAuthMiddleware(makeStubAuthMiddleware());

    const { managerChainRouter } = await import('../../source/backend/foundation/routes/manager-chain.routes');
    const { orgScopeRouter }     = await import('../../source/backend/foundation/routes/org-scope.routes');
    const { inheritanceRouter }  = await import('../../source/backend/foundation/routes/inheritance.routes');
    const { accessSnapshotRouter } = await import('../../source/backend/foundation/routes/access-snapshot.routes');

    const app = express();
    app.use(express.json());
    app.use('/api/foundation/manager-chain',   managerChainRouter);
    app.use('/api/foundation/org-scope',       orgScopeRouter);
    app.use('/api/foundation/inheritance',     inheritanceRouter);
    app.use('/api/foundation/access-snapshot', accessSnapshotRouter);

    // Friendly default error handler so test failures show the route's
    // throw rather than just hanging the connection.
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      // eslint-disable-next-line no-console
      console.error('[H-1 test-app]', err);
      res.status(500).json({ success: false, error: err.message ?? 'unknown' });
    });

    return app;
  })();
  return _appPromise;
}
