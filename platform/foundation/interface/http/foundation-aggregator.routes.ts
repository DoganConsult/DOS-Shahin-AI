import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requirePermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import { query, tenantSchema } from '../../ports/database.port';
import { organizationsRouter } from './organizations.routes';
import { businessUnitsRouter } from './business-units.routes';
import { positionsRouter } from './positions.routes';
import { locationsRouter } from './locations.routes';
import { orgHierarchyRouter } from './org-hierarchy.routes';
import { committeeManagementRouter } from './committee-management.routes';
import { ownershipMappingRouter } from './ownership-mapping.routes';
import { sodCheckRouter } from './sod-check.routes';
import { foundationGovernanceRouter } from './foundation-governance.routes';
import { userLifecycleRouter } from './user-lifecycle.routes';
import { bulkInviteRouter } from './bulk-invite.routes';
import { accessReviewRouter } from './access-review.routes';
import { delegationRouter } from './delegation.routes';
import { employeeLifecycleRouter } from './employee-lifecycle.routes';
import { authoritySodRouter } from './authority-sod.routes';
import { complianceFabricRouter } from './compliance-fabric.routes';
import { foundationHealthRouter } from './foundation-health.routes';
import { createDynamicUiAllowlistRouter } from './dynamic-ui-allowlist.routes';
import { managerChainRouter } from './manager-chain.routes';
import { orgScopeRouter } from './org-scope.routes';
import { inheritanceRouter } from './inheritance.routes';
import { accessSnapshotRouter } from './access-snapshot.routes';
import { teamsRouter } from './teams.routes';
import { foundationSuggestionsRouter } from './foundation-suggestions.routes';
import { moduleConfigRouter } from './module-config.routes';
import {
  FOUNDATION_STATUS_FILTER_OPTIONS,
  FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
} from '../../config/filters.config';

export interface FoundationAggregatorDeps {
  userRouter: ExpressRouter;
  roleRouter: ExpressRouter;
  departmentRouter: ExpressRouter;
}

const FOUNDATION_LOOKUP_TABLES: Record<string, { valueCol: string; labelCol: string }> = {
  countries:        { valueCol: 'country_code',  labelCol: 'name_en' },
  cities:           { valueCol: 'city_code',     labelCol: 'city_name_en' },
  sectors:          { valueCol: 'sector_code',   labelCol: 'sector_name_en' },
  employee_ranges:  { valueCol: 'range_code',    labelCol: 'range_label_en' },
  timezones:        { valueCol: 'timezone_code', labelCol: 'timezone_name' },
  languages:        { valueCol: 'language_code', labelCol: 'language_name_en' },
  frameworks:       { valueCol: 'framework_code',labelCol: 'framework_name' },
  org_types:        { valueCol: 'type_code',     labelCol: 'type_name_en' },
};

export function createFoundationAggregatorRouter(deps: FoundationAggregatorDeps): ExpressRouter {
  const foundationRouter = Router();

  foundationRouter.use('/users', deps.userRouter);
  foundationRouter.use('/teams', teamsRouter);
  foundationRouter.use('/roles', deps.roleRouter);
  foundationRouter.use('/departments', deps.departmentRouter);
  foundationRouter.use('/organizations', organizationsRouter);

  foundationRouter.get(
    '/dashboard',
    authenticate,
    requireTenantId,
    requirePermission('foundation.read'),
    asyncHandler(async (req, res) => {
      const tenantId = (req as any).tenantId as string;
      const schema = tenantSchema(tenantId);
      const present = await query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
        [schema],
      );
      const tables = new Set<string>(present.rows.map((r: any) => r.table_name));
      const usersQ = tables.has('users')
        ? query(`SELECT COUNT(*)::int AS count FROM "${schema}".users`)
        : Promise.resolve({ rows: [{ count: 0 }] });
      const teamsQ = tables.has('teams')
        ? query(`SELECT COUNT(*)::int AS count FROM "${schema}".teams`)
        : Promise.resolve({ rows: [{ count: 0 }] });
      const rolesQ = tables.has('roles')
        ? query(`SELECT COUNT(*)::int AS count FROM "${schema}".roles`)
        : Promise.resolve({ rows: [{ count: 0 }] });
      const orgsQ = query(
        `SELECT COUNT(*)::int AS count FROM dos.organizations WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      );
      const [users, teams, roles, orgs] = await Promise.all([usersQ, teamsQ, rolesQ, orgsQ]);
      res.json({
        data: {
          users: users.rows[0]?.count ?? 0,
          teams: teams.rows[0]?.count ?? 0,
          roles: roles.rows[0]?.count ?? 0,
          organizations: orgs.rows[0]?.count ?? 0,
        },
      });
    }),
  );

  // F1.1 — Foundation overview aggregate.
  // Replaces SPA forkJoin of 13 endpoints with one DB-backed call returning
  // tile counts and recent audit. Counts are computed from canonical dos.*
  // tables filtered by tenant_id; missing tables degrade to zero counts so
  // a partially-provisioned tenant still renders the page.
  foundationRouter.get(
    '/overview',
    authenticate,
    requireTenantId,
    requirePermission('foundation.read'),
    asyncHandler(async (req, res) => {
      const tenantId = (req as any).tenantId as string;

      const present = await query(
        `SELECT table_schema, table_name
           FROM information_schema.tables
          WHERE (table_schema = 'dos'
                 AND table_name IN ('organizations','business_units','departments','teams','locations',
                                    'positions','committees','delegations','policies','audit_trail',
                                    'functional_roles','users'))
             OR (table_schema = 'platform_dauth' AND table_name = 'functional_roles')`
      );
      const have = new Set<string>(present.rows.map((r: any) => `${r.table_schema}.${r.table_name}`));

      const cnt = (sql: string, params: unknown[] = []) =>
        query(sql, params).then((r: any) => Number(r.rows?.[0]?.count ?? 0)).catch(() => 0);

      const counts = {
        users:          have.has('dos.users')             ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.users WHERE tenant_id=$1`, [tenantId]) : 0,
        departments:    have.has('dos.departments')       ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.departments WHERE tenant_id=$1`, [tenantId]) : 0,
        businessUnits:  have.has('dos.business_units')    ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.business_units WHERE tenant_id=$1`, [tenantId]) : 0,
        teams:          have.has('dos.teams')             ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.teams WHERE tenant_id=$1`, [tenantId]) : 0,
        roles:          have.has('platform_dauth.functional_roles')
                          ? await cnt(`SELECT COUNT(*)::int AS count FROM platform_dauth.functional_roles WHERE (tenant_id=$1 OR tenant_id IS NULL)`, [tenantId])
                          : (have.has('dos.functional_roles') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.functional_roles WHERE tenant_id=$1`, [tenantId]) : 0),
        positions:      have.has('dos.positions')         ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.positions WHERE tenant_id=$1`, [tenantId]) : 0,
        locations:      have.has('dos.locations')         ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.locations WHERE tenant_id=$1`, [tenantId]) : 0,
        committees:     have.has('dos.committees')        ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.committees WHERE tenant_id=$1`, [tenantId]) : 0,
        delegations:    have.has('dos.delegations')       ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.delegations WHERE tenant_id=$1`, [tenantId]) : 0,
        policies:       have.has('dos.policies')          ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.policies WHERE tenant_id=$1`, [tenantId]) : 0,
        organizations:  have.has('dos.organizations')     ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.organizations WHERE tenant_id=$1 AND deleted_at IS NULL`, [tenantId]) : 0,
      };

      let recentAudit: any[] = [];
      if (have.has('dos.audit_trail')) {
        try {
          const r = await query(
            `SELECT * FROM dos.audit_trail WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20`,
            [tenantId],
          );
          recentAudit = r.rows;
        } catch {
          recentAudit = [];
        }
      }

      res.json({ success: true, data: { counts, recentAudit } });
    }),
  );

  foundationRouter.get(
    '/lookups',
    authenticate,
    requireTenantId,
    requirePermission('foundation.read'),
    asyncHandler(async (req, res) => {
      const type = String(req.query.type || '').trim();
      if (!type) {
        // Aggregated FoundationLookups payload — frontend `getLookups()` consumer
        // relies on this exact shape; UI surfaces and reference-data groups must
        // be present (or empty) here, never undefined-as-success.
        res.json({
          entityStatuses: FOUNDATION_STATUS_FILTER_OPTIONS.map((o) => o.value),
          referenceDataGroups: Object.keys(FOUNDATION_LOOKUP_TABLES).map((key) => ({
            key,
            endpoint: `/api/foundation/lookups?type=${key}`,
            labelEn: key.replace(/_/g, ' '),
            labelAr: key.replace(/_/g, ' '),
            supportsWrite: false,
          })),
          foundationSurfaces: FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS.map((o) => ({
            id: o.value,
            classification: 'foundation',
          })),
          availableLookupTypes: Object.keys(FOUNDATION_LOOKUP_TABLES),
        });
        return;
      }
      const mapping = FOUNDATION_LOOKUP_TABLES[type];
      if (!mapping) {
        res.status(400).json({ error: 'Unknown lookup type', allowed: Object.keys(FOUNDATION_LOOKUP_TABLES) });
        return;
      }
      const table = `public.lookup_${type}`;
      const result = await query(
        `SELECT ${mapping.valueCol} AS value, ${mapping.labelCol} AS label FROM ${table} ORDER BY ${mapping.labelCol}`,
      );
      res.json({ lookups: result.rows, type });
    }),
  );

  foundationRouter.use('/business-units', businessUnitsRouter);
  foundationRouter.use('/positions', positionsRouter);
  foundationRouter.use('/locations', locationsRouter);
  foundationRouter.use('/org-hierarchy', orgHierarchyRouter);
  foundationRouter.use('/committees', committeeManagementRouter);
  // Module-config runtime contract: FE expects /api/foundation/module-config/{list,detail,form,views}/:variant
  foundationRouter.use('/module-config', moduleConfigRouter);
  foundationRouter.use('/ownership-mappings', ownershipMappingRouter);
  // Singular alias — historical FE callers (foundation-api.service.ts) hit /ownership-mapping
  foundationRouter.use('/ownership-mapping', ownershipMappingRouter);
  foundationRouter.use('/sod', sodCheckRouter);
  foundationRouter.use('/governance', foundationGovernanceRouter);
  foundationRouter.use('/user-lifecycle', userLifecycleRouter);
  foundationRouter.use('/bulk-invite', bulkInviteRouter);
  foundationRouter.use('/access-reviews', accessReviewRouter);
  // Singular alias — historical FE callers hit /access-review
  foundationRouter.use('/access-review', accessReviewRouter);
  foundationRouter.use('/delegations', delegationRouter);
  foundationRouter.use('/employee-lifecycle', employeeLifecycleRouter);
  foundationRouter.use('/', authoritySodRouter);  // mounts /authority and /sod sub-paths directly
  foundationRouter.use('/', complianceFabricRouter); // mounts /policy-acks, /training, /coi
  // Phase B-1 — 5-brain architecture endpoints. Foundation owns enterprise
  // structure; these are the canonical entry points for it.
  foundationRouter.use('/manager-chain', managerChainRouter);
  foundationRouter.use('/org-scope', orgScopeRouter);
  foundationRouter.use('/inheritance', inheritanceRouter);
  foundationRouter.use('/access-snapshot', accessSnapshotRouter);
  foundationRouter.use('/', foundationHealthRouter);
  foundationRouter.use('/', foundationSuggestionsRouter);
  // Layer 2 of Carbon-only enforcement: server-side allowlist resolver.
  // Mounted at /dynamic-ui under foundation; full path is
  // /api/foundation/dynamic-ui/allowlist[/:component_key|/_health].
  foundationRouter.use('/dynamic-ui', createDynamicUiAllowlistRouter());

  return foundationRouter;
}

export {
  organizationsRouter,
  businessUnitsRouter,
  positionsRouter,
  locationsRouter,
  orgHierarchyRouter,
  committeeManagementRouter,
  ownershipMappingRouter,
  sodCheckRouter,
  foundationGovernanceRouter,
  userLifecycleRouter,
  bulkInviteRouter,
  accessReviewRouter,
  delegationRouter,
  employeeLifecycleRouter,
  authoritySodRouter,
  complianceFabricRouter,
};
