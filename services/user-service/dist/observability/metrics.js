"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMetrics = void 0;
exports.tracedTenant = tracedTenant;
/**
 * user-service Prometheus metrics. Registered on the shared registry exposed
 * by @dos/platform-core so they appear on the inherited /metrics endpoint.
 *
 * Design: lazy-init on first recorder call so tests and CLI entry points don't
 * pay the cost. If prom-client isn't installed, recorders are no-ops.
 */
const observability_1 = require("@dos/platform-core/observability");
let userCreated = null;
let userUpdated = null;
let userDeactivated = null;
let roleAssigned = null;
let roleRevoked = null;
let teamCreated = null;
let teamMemberAdded = null;
let teamMemberRemoved = null;
let deptCreated = null;
let deptUpdated = null;
let deptDeleted = null;
let viewPrefUpsert = null;
let raciAssigned = null;
let raciRevoked = null;
let dbQueryDuration = null;
let initialized = false;
function maybeInit() {
    if (initialized)
        return;
    initialized = true;
    const client = (0, observability_1.getPrometheusClient)();
    const register = (0, observability_1.getPrometheusRegistry)();
    if (!client || !register)
        return;
    const opts = (name, help, labelNames = []) => ({
        name,
        help,
        labelNames,
        registers: [register],
    });
    userCreated = new client.Counter(opts('user_service_user_created_total', 'Users created', ['tenant_id']));
    userUpdated = new client.Counter(opts('user_service_user_updated_total', 'User profile updates', ['tenant_id']));
    userDeactivated = new client.Counter(opts('user_service_user_deactivated_total', 'Users deactivated', ['tenant_id']));
    roleAssigned = new client.Counter(opts('user_service_role_assigned_total', 'Role assignments', ['tenant_id', 'role_code']));
    roleRevoked = new client.Counter(opts('user_service_role_revoked_total', 'Role revocations', ['tenant_id', 'role_code']));
    teamCreated = new client.Counter(opts('user_service_team_created_total', 'Teams created', ['tenant_id']));
    teamMemberAdded = new client.Counter(opts('user_service_team_member_added_total', 'Members added to teams', ['tenant_id']));
    teamMemberRemoved = new client.Counter(opts('user_service_team_member_removed_total', 'Members removed from teams', ['tenant_id']));
    deptCreated = new client.Counter(opts('user_service_dept_created_total', 'Departments created', ['tenant_id']));
    deptUpdated = new client.Counter(opts('user_service_dept_updated_total', 'Departments updated', ['tenant_id']));
    deptDeleted = new client.Counter(opts('user_service_dept_deleted_total', 'Departments deleted', ['tenant_id']));
    viewPrefUpsert = new client.Counter(opts('user_service_view_pref_upsert_total', 'View preference upserts', ['tenant_id']));
    raciAssigned = new client.Counter(opts('user_service_raci_assigned_total', 'RACI assignments', ['tenant_id', 'raci_role']));
    raciRevoked = new client.Counter(opts('user_service_raci_revoked_total', 'RACI revocations', ['tenant_id']));
    dbQueryDuration = new client.Histogram({
        name: 'user_service_db_query_duration_seconds',
        help: 'user-service DB query duration by operation',
        labelNames: ['operation'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
        registers: [register],
    });
}
exports.userMetrics = {
    userCreated: (tenantId) => { maybeInit(); userCreated?.inc({ tenant_id: tenantId }); },
    userUpdated: (tenantId) => { maybeInit(); userUpdated?.inc({ tenant_id: tenantId }); },
    userDeactivated: (tenantId) => { maybeInit(); userDeactivated?.inc({ tenant_id: tenantId }); },
    roleAssigned: (tenantId, roleCode) => { maybeInit(); roleAssigned?.inc({ tenant_id: tenantId, role_code: roleCode }); },
    roleRevoked: (tenantId, roleCode) => { maybeInit(); roleRevoked?.inc({ tenant_id: tenantId, role_code: roleCode }); },
    teamCreated: (tenantId) => { maybeInit(); teamCreated?.inc({ tenant_id: tenantId }); },
    teamMemberAdded: (tenantId) => { maybeInit(); teamMemberAdded?.inc({ tenant_id: tenantId }); },
    teamMemberRemoved: (tenantId) => { maybeInit(); teamMemberRemoved?.inc({ tenant_id: tenantId }); },
    deptCreated: (tenantId) => { maybeInit(); deptCreated?.inc({ tenant_id: tenantId }); },
    deptUpdated: (tenantId) => { maybeInit(); deptUpdated?.inc({ tenant_id: tenantId }); },
    deptDeleted: (tenantId) => { maybeInit(); deptDeleted?.inc({ tenant_id: tenantId }); },
    viewPrefUpsert: (tenantId) => { maybeInit(); viewPrefUpsert?.inc({ tenant_id: tenantId }); },
    raciAssigned: (tenantId, raciRole) => { maybeInit(); raciAssigned?.inc({ tenant_id: tenantId, raci_role: raciRole }); },
    raciRevoked: (tenantId) => { maybeInit(); raciRevoked?.inc({ tenant_id: tenantId }); },
    observeDb: (operation, durationMs) => { maybeInit(); dbQueryDuration?.observe({ operation }, durationMs / 1000); },
};
/**
 * Wrap a withTenantClient call with DB duration tracking.
 * Use via: await tracedTenant('user.list', tenantId, async (c) => { ... })
 */
async function tracedTenant(operation, tenantId, fn) {
    const { withTenantClient } = await import('@dos/db');
    const start = Date.now();
    try {
        return await withTenantClient(tenantId, fn);
    }
    finally {
        exports.userMetrics.observeDb(operation, Date.now() - start);
    }
}
//# sourceMappingURL=metrics.js.map