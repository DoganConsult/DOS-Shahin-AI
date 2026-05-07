"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceFabricRouter = exports.authoritySodRouter = exports.employeeLifecycleRouter = exports.delegationRouter = exports.accessReviewRouter = exports.bulkInviteRouter = exports.userLifecycleRouter = exports.foundationGovernanceRouter = exports.sodReviewRouter = exports.sodExceptionRouter = exports.sodCheckRouter = exports.ownershipMappingRouter = exports.committeeManagementRouter = exports.orgHierarchyRouter = exports.locationsRouter = exports.positionsRouter = exports.businessUnitsRouter = exports.organizationsRouter = void 0;
exports.createFoundationAggregatorRouter = createFoundationAggregatorRouter;
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
const organizations_routes_1 = require("./organizations.routes");
Object.defineProperty(exports, "organizationsRouter", { enumerable: true, get: function () { return organizations_routes_1.organizationsRouter; } });
const business_units_routes_1 = require("./business-units.routes");
Object.defineProperty(exports, "businessUnitsRouter", { enumerable: true, get: function () { return business_units_routes_1.businessUnitsRouter; } });
const positions_routes_1 = require("./positions.routes");
Object.defineProperty(exports, "positionsRouter", { enumerable: true, get: function () { return positions_routes_1.positionsRouter; } });
const locations_routes_1 = require("./locations.routes");
Object.defineProperty(exports, "locationsRouter", { enumerable: true, get: function () { return locations_routes_1.locationsRouter; } });
const org_hierarchy_routes_1 = require("./org-hierarchy.routes");
Object.defineProperty(exports, "orgHierarchyRouter", { enumerable: true, get: function () { return org_hierarchy_routes_1.orgHierarchyRouter; } });
const committee_management_routes_1 = require("./committee-management.routes");
Object.defineProperty(exports, "committeeManagementRouter", { enumerable: true, get: function () { return committee_management_routes_1.committeeManagementRouter; } });
const ownership_mapping_routes_1 = require("./ownership-mapping.routes");
Object.defineProperty(exports, "ownershipMappingRouter", { enumerable: true, get: function () { return ownership_mapping_routes_1.ownershipMappingRouter; } });
const sod_check_routes_1 = require("./sod-check.routes");
Object.defineProperty(exports, "sodCheckRouter", { enumerable: true, get: function () { return sod_check_routes_1.sodCheckRouter; } });
const sod_exception_routes_1 = require("./sod-exception.routes");
Object.defineProperty(exports, "sodExceptionRouter", { enumerable: true, get: function () { return sod_exception_routes_1.sodExceptionRouter; } });
const sod_review_routes_1 = require("./sod-review.routes");
Object.defineProperty(exports, "sodReviewRouter", { enumerable: true, get: function () { return sod_review_routes_1.sodReviewRouter; } });
const foundation_governance_routes_1 = require("./foundation-governance.routes");
Object.defineProperty(exports, "foundationGovernanceRouter", { enumerable: true, get: function () { return foundation_governance_routes_1.foundationGovernanceRouter; } });
const user_lifecycle_routes_1 = require("./user-lifecycle.routes");
Object.defineProperty(exports, "userLifecycleRouter", { enumerable: true, get: function () { return user_lifecycle_routes_1.userLifecycleRouter; } });
const bulk_invite_routes_1 = require("./bulk-invite.routes");
Object.defineProperty(exports, "bulkInviteRouter", { enumerable: true, get: function () { return bulk_invite_routes_1.bulkInviteRouter; } });
const access_review_routes_1 = require("./access-review.routes");
Object.defineProperty(exports, "accessReviewRouter", { enumerable: true, get: function () { return access_review_routes_1.accessReviewRouter; } });
const delegation_routes_1 = require("./delegation.routes");
Object.defineProperty(exports, "delegationRouter", { enumerable: true, get: function () { return delegation_routes_1.delegationRouter; } });
const employee_lifecycle_routes_1 = require("./employee-lifecycle.routes");
Object.defineProperty(exports, "employeeLifecycleRouter", { enumerable: true, get: function () { return employee_lifecycle_routes_1.employeeLifecycleRouter; } });
const authority_sod_routes_1 = require("./authority-sod.routes");
Object.defineProperty(exports, "authoritySodRouter", { enumerable: true, get: function () { return authority_sod_routes_1.authoritySodRouter; } });
const compliance_fabric_routes_1 = require("./compliance-fabric.routes");
Object.defineProperty(exports, "complianceFabricRouter", { enumerable: true, get: function () { return compliance_fabric_routes_1.complianceFabricRouter; } });
const foundation_health_routes_1 = require("./foundation-health.routes");
const dynamic_ui_allowlist_routes_1 = require("./dynamic-ui-allowlist.routes");
const manager_chain_routes_1 = require("./manager-chain.routes");
const org_scope_routes_1 = require("./org-scope.routes");
const inheritance_routes_1 = require("./inheritance.routes");
const access_snapshot_routes_1 = require("./access-snapshot.routes");
const teams_routes_1 = require("./teams.routes");
const foundation_suggestions_routes_1 = require("./foundation-suggestions.routes");
const module_config_routes_1 = require("./module-config.routes");
const filters_config_1 = require("../../config/filters.config");
const FOUNDATION_LOOKUP_TABLES = {
    countries: { valueCol: 'country_code', labelCol: 'name_en' },
    cities: { valueCol: 'city_code', labelCol: 'city_name_en' },
    sectors: { valueCol: 'sector_code', labelCol: 'sector_name_en' },
    employee_ranges: { valueCol: 'range_code', labelCol: 'range_label_en' },
    timezones: { valueCol: 'timezone_code', labelCol: 'timezone_name' },
    languages: { valueCol: 'language_code', labelCol: 'language_name_en' },
    frameworks: { valueCol: 'framework_code', labelCol: 'framework_name' },
    org_types: { valueCol: 'type_code', labelCol: 'type_name_en' },
};
function createFoundationAggregatorRouter(deps) {
    const foundationRouter = (0, express_1.Router)();
    foundationRouter.use('/users', deps.userRouter);
    foundationRouter.use('/teams', teams_routes_1.teamsRouter);
    foundationRouter.use('/roles', deps.roleRouter);
    foundationRouter.use('/departments', deps.departmentRouter);
    foundationRouter.use('/organizations', organizations_routes_1.organizationsRouter);
    foundationRouter.get('/dashboard', auth_adapter_1.authenticate, auth_adapter_1.requireTenantId, (0, auth_adapter_1.requirePermission)('foundation.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const schema = (0, database_port_1.tenantSchema)(tenantId);
        const present = await (0, database_port_1.query)(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]);
        const tables = new Set(present.rows.map((r) => r.table_name));
        const usersQ = tables.has('users')
            ? (0, database_port_1.query)(`SELECT COUNT(*)::int AS count FROM "${schema}".users`)
            : Promise.resolve({ rows: [{ count: 0 }] });
        const teamsQ = tables.has('teams')
            ? (0, database_port_1.query)(`SELECT COUNT(*)::int AS count FROM "${schema}".teams`)
            : Promise.resolve({ rows: [{ count: 0 }] });
        const rolesQ = tables.has('roles')
            ? (0, database_port_1.query)(`SELECT COUNT(*)::int AS count FROM "${schema}".roles`)
            : Promise.resolve({ rows: [{ count: 0 }] });
        const orgsQ = (0, database_port_1.query)(`SELECT COUNT(*)::int AS count FROM dos.organizations WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]);
        const [users, teams, roles, orgs] = await Promise.all([usersQ, teamsQ, rolesQ, orgsQ]);
        res.json({
            data: {
                users: users.rows[0]?.count ?? 0,
                teams: teams.rows[0]?.count ?? 0,
                roles: roles.rows[0]?.count ?? 0,
                organizations: orgs.rows[0]?.count ?? 0,
            },
        });
    }));
    // F1.1 — Foundation overview aggregate.
    // Replaces SPA forkJoin of 13 endpoints with one DB-backed call returning
    // tile counts and recent audit. Counts are computed from canonical dos.*
    // tables filtered by tenant_id; missing tables degrade to zero counts so
    // a partially-provisioned tenant still renders the page.
    foundationRouter.get('/overview', auth_adapter_1.authenticate, auth_adapter_1.requireTenantId, (0, auth_adapter_1.requirePermission)('foundation.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
        const tenantId = req.tenantId;
        const present = await (0, database_port_1.query)(`SELECT table_schema, table_name
           FROM information_schema.tables
          WHERE (table_schema = 'dos'
                 AND table_name IN ('organizations','business_units','departments','teams','locations',
                                    'positions','committees','delegations','policies','audit_trail',
                                    'functional_roles','users'))
             OR (table_schema = 'platform_dauth' AND table_name = 'functional_roles')`);
        const have = new Set(present.rows.map((r) => `${r.table_schema}.${r.table_name}`));
        const cnt = (sql, params = []) => (0, database_port_1.query)(sql, params).then((r) => Number(r.rows?.[0]?.count ?? 0)).catch(() => 0);
        const counts = {
            users: have.has('dos.users') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.users WHERE tenant_id=$1`, [tenantId]) : 0,
            departments: have.has('dos.departments') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.departments WHERE tenant_id=$1`, [tenantId]) : 0,
            businessUnits: have.has('dos.business_units') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.business_units WHERE tenant_id=$1`, [tenantId]) : 0,
            teams: have.has('dos.teams') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.teams WHERE tenant_id=$1`, [tenantId]) : 0,
            roles: have.has('platform_dauth.functional_roles')
                ? await cnt(`SELECT COUNT(*)::int AS count FROM platform_dauth.functional_roles WHERE (tenant_id=$1 OR tenant_id IS NULL)`, [tenantId])
                : (have.has('dos.functional_roles') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.functional_roles WHERE tenant_id=$1`, [tenantId]) : 0),
            positions: have.has('dos.positions') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.positions WHERE tenant_id=$1`, [tenantId]) : 0,
            locations: have.has('dos.locations') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.locations WHERE tenant_id=$1`, [tenantId]) : 0,
            committees: have.has('dos.committees') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.committees WHERE tenant_id=$1`, [tenantId]) : 0,
            delegations: have.has('dos.delegations') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.delegations WHERE tenant_id=$1`, [tenantId]) : 0,
            policies: have.has('dos.policies') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.policies WHERE tenant_id=$1`, [tenantId]) : 0,
            organizations: have.has('dos.organizations') ? await cnt(`SELECT COUNT(*)::int AS count FROM dos.organizations WHERE tenant_id=$1 AND deleted_at IS NULL`, [tenantId]) : 0,
        };
        let recentAudit = [];
        if (have.has('dos.audit_trail')) {
            try {
                const r = await (0, database_port_1.query)(`SELECT * FROM dos.audit_trail WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20`, [tenantId]);
                recentAudit = r.rows;
            }
            catch {
                recentAudit = [];
            }
        }
        res.json({ success: true, data: { counts, recentAudit } });
    }));
    foundationRouter.get('/lookups', auth_adapter_1.authenticate, auth_adapter_1.requireTenantId, (0, auth_adapter_1.requirePermission)('foundation.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
        const type = String(req.query.type || '').trim();
        if (!type) {
            // Aggregated FoundationLookups payload — frontend `getLookups()` consumer
            // relies on this exact shape; UI surfaces and reference-data groups must
            // be present (or empty) here, never undefined-as-success.
            res.json({
                entityStatuses: filters_config_1.FOUNDATION_STATUS_FILTER_OPTIONS.map((o) => o.value),
                referenceDataGroups: Object.keys(FOUNDATION_LOOKUP_TABLES).map((key) => ({
                    key,
                    endpoint: `/api/foundation/lookups?type=${key}`,
                    labelEn: key.replace(/_/g, ' '),
                    labelAr: key.replace(/_/g, ' '),
                    supportsWrite: false,
                })),
                foundationSurfaces: filters_config_1.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS.map((o) => ({
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
        const result = await (0, database_port_1.query)(`SELECT ${mapping.valueCol} AS value, ${mapping.labelCol} AS label FROM ${table} ORDER BY ${mapping.labelCol}`);
        res.json({ lookups: result.rows, type });
    }));
    foundationRouter.use('/business-units', business_units_routes_1.businessUnitsRouter);
    foundationRouter.use('/positions', positions_routes_1.positionsRouter);
    foundationRouter.use('/locations', locations_routes_1.locationsRouter);
    foundationRouter.use('/org-hierarchy', org_hierarchy_routes_1.orgHierarchyRouter);
    foundationRouter.use('/committees', committee_management_routes_1.committeeManagementRouter);
    // Module-config runtime contract: FE expects /api/foundation/module-config/{list,detail,form,views}/:variant
    foundationRouter.use('/module-config', module_config_routes_1.moduleConfigRouter);
    foundationRouter.use('/ownership-mappings', ownership_mapping_routes_1.ownershipMappingRouter);
    // Singular alias — historical FE callers (foundation-api.service.ts) hit /ownership-mapping
    foundationRouter.use('/ownership-mapping', ownership_mapping_routes_1.ownershipMappingRouter);
    // Authority + SoD live router MUST be mounted BEFORE the legacy /sod
    // sodCheckRouter, otherwise /sod/violations and /sod/violations/:id/resolve
    // get audited twice (the legacy router runs auditMiddleware('sod') even when
    // it has no matching route, then falls through). Authority router owns
    // /sod/rules, /sod/check, /sod/violations, /sod/violations/:id/resolve.
    foundationRouter.use('/', authority_sod_routes_1.authoritySodRouter); // mounts /authority and /sod sub-paths directly
    // Legacy sodCheckRouter remains for SoD rules CRUD (POST/DELETE /sod/rules)
    // not yet provided by authority-sod. Mounted after to avoid duplicate audits
    // on shared paths.
    foundationRouter.use('/sod', sod_check_routes_1.sodCheckRouter);
    // SoD exceptions + reviews — Wave 1 backend completion (live tables in
    // dos.foundation_sod_exception, dos.foundation_sod_review_cycle,
    // dos.foundation_sod_review_attestation). Mounted under /sod for the
    // standard /api/foundation/sod/{exceptions,reviews,attestations} surface.
    foundationRouter.use('/sod/exceptions', sod_exception_routes_1.sodExceptionRouter);
    foundationRouter.use('/sod/reviews', sod_review_routes_1.sodReviewRouter);
    foundationRouter.use('/governance', foundation_governance_routes_1.foundationGovernanceRouter);
    foundationRouter.use('/user-lifecycle', user_lifecycle_routes_1.userLifecycleRouter);
    foundationRouter.use('/bulk-invite', bulk_invite_routes_1.bulkInviteRouter);
    foundationRouter.use('/access-reviews', access_review_routes_1.accessReviewRouter);
    // Singular alias — historical FE callers hit /access-review
    foundationRouter.use('/access-review', access_review_routes_1.accessReviewRouter);
    foundationRouter.use('/delegations', delegation_routes_1.delegationRouter);
    foundationRouter.use('/employee-lifecycle', employee_lifecycle_routes_1.employeeLifecycleRouter);
    foundationRouter.use('/', compliance_fabric_routes_1.complianceFabricRouter); // mounts /policy-acks, /training, /coi
    // Phase B-1 — 5-brain architecture endpoints. Foundation owns enterprise
    // structure; these are the canonical entry points for it.
    foundationRouter.use('/manager-chain', manager_chain_routes_1.managerChainRouter);
    foundationRouter.use('/org-scope', org_scope_routes_1.orgScopeRouter);
    foundationRouter.use('/inheritance', inheritance_routes_1.inheritanceRouter);
    foundationRouter.use('/access-snapshot', access_snapshot_routes_1.accessSnapshotRouter);
    foundationRouter.use('/', foundation_health_routes_1.foundationHealthRouter);
    foundationRouter.use('/', foundation_suggestions_routes_1.foundationSuggestionsRouter);
    // Layer 2 of Carbon-only enforcement: server-side allowlist resolver.
    // Mounted at /dynamic-ui under foundation; full path is
    // /api/foundation/dynamic-ui/allowlist[/:component_key|/_health].
    foundationRouter.use('/dynamic-ui', (0, dynamic_ui_allowlist_routes_1.createDynamicUiAllowlistRouter)());
    return foundationRouter;
}
//# sourceMappingURL=foundation-aggregator.routes.js.map