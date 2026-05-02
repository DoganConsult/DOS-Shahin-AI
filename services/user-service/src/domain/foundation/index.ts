// Host adapter: loads the extracted Foundation platform module and composes the
// /api/foundation aggregator using the factory with host-owned identity routers
// (user/team/role/department) injected as deps. Re-exports individual routers
// with the names server.ts expects. All route and service logic lives in
// platform/foundation/. No forking allowed (platform-neutral rule, 2026-05-01).

import * as path from 'path';
import { loadModuleRoute, loadModuleExports } from '@dos/service-bootstrap';
import { userRouter } from '../../routes/user.routes';
import { teamRouter } from '../../routes/team.routes';
import { roleRouter } from '../../routes/role.routes';
import { departmentRouter } from '../../routes/department.routes';

// Foundation is a platform module — canonical location: <platform-root>/platform/foundation
// __dirname at runtime → <platform-root>/services/user-service/dist/domain/foundation
// 5 ups reaches <platform-root>, then + platform/foundation/dist.
// Override with `FOUNDATION_MODULE_DIST` env var for ops/CI flexibility.
const FOUNDATION_DIST_DEFAULT = path.resolve(
  __dirname,
  '../../../../..',
  'platform',
  'foundation',
  'dist',
);
const MOD_BASE = process.env.FOUNDATION_MODULE_DIST
  ? path.resolve(process.env.FOUNDATION_MODULE_DIST)
  : FOUNDATION_DIST_DEFAULT;

const primary: any = loadModuleExports('foundation', `${MOD_BASE}/index`);
if (!primary || typeof primary.createFoundationAggregatorRouter !== 'function') {
  const reason = primary?._loadError ?? 'createFoundationAggregatorRouter missing from foundation dist';
  // Strict-mode contract: in production we refuse to boot user-service with
  // empty Foundation routers (which would silently 404). Set
  // MOUNT_FILTER_MODE=compatibility only for non-prod debugging.
  if ((process.env.MOUNT_FILTER_MODE || 'strict').toLowerCase() === 'strict') {
    throw new Error(
      `[user-service] Foundation module failed to load from ${MOD_BASE}: ${reason}. ` +
      `Build the canonical Foundation module (pnpm --filter @dos/module-foundation build) ` +
      `or set FOUNDATION_MODULE_DIST to the correct dist path.`,
    );
  }
}
const moduleExports: any = (() => {
  if (primary && typeof primary.createFoundationAggregatorRouter === 'function') {
    return primary;
  }
  // Per-router degradation — if the bundle failed we still expose empty
  // routers so the host boots and /api/foundation/modules surfaces the
  // error rather than crash-looping.
  return {
      createFoundationAggregatorRouter: (_deps: any) => loadModuleRoute(
        'foundation/aggregator',
        `${MOD_BASE}/interface/http/foundation-aggregator.routes`,
      ),
      organizationsRouter:       loadModuleRoute('foundation/organizations',      `${MOD_BASE}/interface/http/organizations.routes`),
      businessUnitsRouter:       loadModuleRoute('foundation/business-units',     `${MOD_BASE}/interface/http/business-units.routes`),
      positionsRouter:           loadModuleRoute('foundation/positions',          `${MOD_BASE}/interface/http/positions.routes`),
      locationsRouter:           loadModuleRoute('foundation/locations',          `${MOD_BASE}/interface/http/locations.routes`),
      orgHierarchyRouter:        loadModuleRoute('foundation/org-hierarchy',      `${MOD_BASE}/interface/http/org-hierarchy.routes`),
      committeeManagementRouter: loadModuleRoute('foundation/committee',          `${MOD_BASE}/interface/http/committee-management.routes`),
      ownershipMappingRouter:    loadModuleRoute('foundation/ownership-mapping',  `${MOD_BASE}/interface/http/ownership-mapping.routes`),
      sodCheckRouter:            loadModuleRoute('foundation/sod-check',          `${MOD_BASE}/interface/http/sod-check.routes`),
      foundationGovernanceRouter:loadModuleRoute('foundation/governance',         `${MOD_BASE}/interface/http/foundation-governance.routes`),
      userLifecycleRouter:       loadModuleRoute('foundation/user-lifecycle',     `${MOD_BASE}/interface/http/user-lifecycle.routes`),
      bulkInviteRouter:          loadModuleRoute('foundation/bulk-invite',        `${MOD_BASE}/interface/http/bulk-invite.routes`),
      accessReviewRouter:        loadModuleRoute('foundation/access-review',      `${MOD_BASE}/interface/http/access-review.routes`),
      delegationRouter:          loadModuleRoute('foundation/delegation',         `${MOD_BASE}/interface/http/delegation.routes`),
      _loadError: primary?._loadError ?? 'module exports did not include factory',
    };
})();

export const organizationsRouter        = moduleExports.organizationsRouter;
export const businessUnitsRouter        = moduleExports.businessUnitsRouter;
export const positionsRouter            = moduleExports.positionsRouter;
export const locationsRouter            = moduleExports.locationsRouter;
export const orgHierarchyRouter         = moduleExports.orgHierarchyRouter;
export const committeeManagementRouter  = moduleExports.committeeManagementRouter;
export const ownershipMappingRouter     = moduleExports.ownershipMappingRouter;
export const sodCheckRouter             = moduleExports.sodCheckRouter;
export const foundationGovernanceRouter = moduleExports.foundationGovernanceRouter;
export const userLifecycleRouter        = moduleExports.userLifecycleRouter;
export const bulkInviteRouter           = moduleExports.bulkInviteRouter;
export const accessReviewRouter         = moduleExports.accessReviewRouter;
export const delegationRouter           = moduleExports.delegationRouter;

// /api/foundation aggregator — composed with host-owned identity routers.
export const foundationRouter =
  typeof moduleExports.createFoundationAggregatorRouter === 'function'
    ? moduleExports.createFoundationAggregatorRouter({
        userRouter,
        teamRouter,
        roleRouter,
        departmentRouter,
      })
    : loadModuleRoute('foundation/aggregator-fallback', `${MOD_BASE}/routes/foundation-aggregator.routes`);
