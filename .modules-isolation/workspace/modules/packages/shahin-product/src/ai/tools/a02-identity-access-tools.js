// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A02 — Identity & Access Provisioning
// Tools: list users, check access anomalies, flag over-privileged accounts,
//        manage positions, delegations, committees, ownership, SSO, MFA
// ================================================================
import { createProcessTask } from '@dos/platform-core/workflows';
import { eventBus } from '@dos/platform-core/events';
import { safeRows } from '@dos/module-sdk';
import { swallowEmpty, EC } from '@dos/platform-core/resilience';
const OVER_PRIVILEGE_ROLE_THRESHOLD = parseInt(process.env.OVER_PRIVILEGE_ROLE_THRESHOLD || '15', 10);
export function buildA02Tools() {
    return [
        {
            name: 'list_users_with_access_info',
            description: 'List all users with their roles and last login. Identifies inactive and admin accounts. MFA status is sourced from Keycloak (not from this DB).',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                // HB-5 fix (2026-04-28): canonical user table is `dos.users`, not
                // a tenant-local `users`. dos.users has no mfa_enabled column —
                // MFA lives in Keycloak attributes. Until the platform exposes a
                // KC-backed MFA port, we report MFA as `unknown` and surface
                // role/role-distribution/inactivity which we *do* have.
                const users = await safeRows(`SELECT user_id, email, display_name AS name, role, platform_role,
                  status, created_at, last_login,
                  (status = 'active') AS is_active
             FROM dos.users
            WHERE tenant_id = $1
            ORDER BY role NULLS LAST, display_name`, [tenantId]);
                const ninetyDaysAgo = Date.now() - 90 * 86400_000;
                const inactive = users.filter(u => u.last_login && new Date(u.last_login).getTime() < ninetyDaysAgo);
                const admins = users.filter(u => (u.platform_role && /admin/i.test(String(u.platform_role))) ||
                    (u.role && /admin/i.test(String(u.role))));
                return {
                    users,
                    totalUsers: users.length,
                    inactiveUsers: inactive.length,
                    adminCount: admins.length,
                    // MFA backend is Keycloak; this number is derived elsewhere when
                    // the KC adapter ships. Until then, report 0 + flag mfaSource.
                    usersWithoutMFA: 0,
                    mfaSource: 'keycloak_not_yet_wired',
                };
            },
        },
        {
            name: 'check_role_distribution',
            description: 'Analyze role distribution and segregation of duties compliance.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const roles = await safeRows(`SELECT role, COUNT(*)::int AS cnt, COUNT(*) FILTER (WHERE is_active)::int AS active
           FROM users WHERE tenant_id = $1 GROUP BY role ORDER BY cnt DESC`, [tenantId]);
                const total = roles.reduce((s, r) => s + r.cnt, 0);
                const adminRatio = roles.find((r) => ['admin'].includes(r.role))?.cnt || 0;
                return { roles, totalUsers: total, adminRatio: total > 0 ? (adminRatio / total * 100).toFixed(1) + '%' : '0%', segregationRisk: adminRatio > total * 0.3 ? 'high' : 'low' };
            },
        },
        {
            name: 'flag_access_risk',
            description: 'Create a risk flag for an access control issue (over-privileged user, inactive account, missing MFA).',
            input_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    userId: { type: 'string', description: 'Affected user ID if applicable' },
                },
                required: ['title', 'description', 'priority'],
            },
            handler: async (tenantId, input) => {
                await createProcessTask(tenantId, {
                    title: `[A02] ${input.title}`,
                    description: input.description,
                    taskType: 'risk_assessment',
                    priority: input.priority || 'medium',
                    entityType: 'user',
                    entityId: input.userId,
                    triggerSource: 'agent_A02',
                    createdBy: 'agent-A02',
                });
                await eventBus.publish({ eventType: 'agent.action_proposed', tenantId, sourceService: 'agent-A02', severity: input.priority === 'critical' ? 'critical' : 'warning', payload: { agentId: 'A02', title: input.title } });
                return { flagged: true };
            },
        },
        {
            name: 'manage_positions',
            description: 'List, create, or update organizational positions. Action: list | create | update.',
            input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'update'] }, title_en: { type: 'string' }, dept_id: { type: 'string' }, grade: { type: 'string' }, position_id: { type: 'string' } }, required: ['action'] },
            handler: async (tenantId, input) => {
                const { safeQuery, tenantSchema } = await import('../../../../config/database');
                const schema = tenantSchema(tenantId);
                const listPositions = async (_t, _f) => (await safeQuery(`SELECT * FROM "${schema}".positions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`)).rows;
                const createPosition = async (_t, p) => (await safeQuery(`INSERT INTO "${schema}".positions (title_en, dept_id, grade, created_by) VALUES ($1,$2,$3,$4) RETURNING *`, [p.title_en, p.dept_id, p.grade, p.created_by])).rows[0];
                const updatePosition = async (_t, id, p) => (await safeQuery(`UPDATE "${schema}".positions SET title_en=COALESCE($2,title_en), grade=COALESCE($3,grade) WHERE position_id=$1 RETURNING *`, [id, p.title_en, p.grade])).rows[0];
                if (input.action === 'list')
                    return { positions: await listPositions(tenantId, {}) };
                if (input.action === 'create')
                    return await createPosition(tenantId, { title_en: input.title_en, dept_id: input.dept_id, grade: input.grade, created_by: 'agent-A02' });
                if (input.action === 'update' && input.position_id)
                    return await updatePosition(tenantId, input.position_id, { title_en: input.title_en, grade: input.grade, updated_by: 'agent-A02' });
                return { error: 'Invalid action or missing position_id for update' };
            },
        },
        {
            name: 'manage_reporting_lines',
            description: 'Get the organizational reporting tree (positions hierarchy).',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const { safeQuery, tenantSchema } = await import('../../../../config/database');
                const schema = tenantSchema(tenantId);
                const getReportingTree = async (_t) => (await safeQuery(`SELECT p.position_id, p.title_en, p.reports_to_position_id FROM "${schema}".positions p WHERE p.deleted_at IS NULL ORDER BY p.title_en`)).rows;
                return { tree: await getReportingTree(tenantId) };
            },
        },
        {
            name: 'manage_delegations',
            description: 'List, create, or revoke governance delegations. Action: list | create | revoke.',
            input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'create', 'revoke'] }, delegator_user_id: { type: 'string' }, delegate_user_id: { type: 'string' }, authority_type: { type: 'string' }, valid_from: { type: 'string' }, valid_to: { type: 'string' }, delegation_id: { type: 'string' } }, required: ['action'] },
            handler: async (tenantId, input) => {
                const { listDelegations, createDelegation, revokeDelegation } = await import('../../../../platform/dauth/delegation/delegation.service');
                if (input.action === 'list')
                    return { delegations: await listDelegations(tenantId) };
                if (input.action === 'create')
                    return await createDelegation(tenantId, { delegator_user_id: input.delegator_user_id, delegate_user_id: input.delegate_user_id, authority_type: input.authority_type, valid_from: input.valid_from, valid_to: input.valid_to, created_by: 'agent-A02' });
                if (input.action === 'revoke' && input.delegation_id)
                    return await revokeDelegation(tenantId, input.delegation_id);
                return { error: 'Invalid action or missing delegation_id for revoke' };
            },
        },
        {
            name: 'manage_committees',
            description: 'List committees or get committee detail. Action: list | detail.',
            input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'detail'] }, committee_id: { type: 'string' } }, required: ['action'] },
            handler: async (tenantId, input) => {
                const { safeQuery, tenantSchema } = await import('../../../../config/database');
                const schema = tenantSchema(tenantId);
                const getCommittees = async (_t) => (await safeQuery(`SELECT * FROM "${schema}".governance_committees WHERE deleted_at IS NULL ORDER BY name_en`)).rows;
                const getCommitteeDetail = async (_t, id) => (await safeQuery(`SELECT * FROM "${schema}".governance_committees WHERE committee_id=$1`, [id])).rows[0];
                if (input.action === 'list')
                    return { committees: await getCommittees(tenantId) };
                if (input.action === 'detail' && input.committee_id)
                    return await getCommitteeDetail(tenantId, input.committee_id);
                return { error: 'committee_id required for detail' };
            },
        },
        {
            name: 'query_ownership_map',
            description: 'Query entity ownership across departments, teams, and positions.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const { safeQuery, tenantSchema } = await import('../../../../config/database');
                const schema = tenantSchema(tenantId);
                const getOwnershipMap = async (_t) => (await safeQuery(`SELECT entity_type, entity_id, owner_user_id, ownership_type FROM "${schema}".responsibilities WHERE deleted_at IS NULL LIMIT 500`)).rows;
                return { ownershipMap: await getOwnershipMap(tenantId) };
            },
        },
        {
            name: 'manage_ownership_map',
            description: 'Assign or remove ownership for controls, risks, or evidence. Action: list | assign | remove.',
            input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'assign', 'remove'] }, domain: { type: 'string', enum: ['control', 'risk', 'evidence'] }, entityId: { type: 'string' }, userId: { type: 'string' }, ownershipType: { type: 'string' }, ownerId: { type: 'string' } }, required: ['action', 'domain'] },
            handler: async (tenantId, input) => {
                const { safeQuery, tenantSchema } = await import('../../../../config/database');
                const schema = tenantSchema(tenantId);
                const listOwnership = async (_t, domain) => (await safeQuery(`SELECT * FROM "${schema}".responsibilities WHERE entity_type=$1 AND deleted_at IS NULL`, [domain])).rows;
                const assignOwnership = async (_t, domain, p) => (await safeQuery(`INSERT INTO "${schema}".responsibilities (entity_type, entity_id, owner_user_id, ownership_type, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [domain, p.entityId, p.userId, p.ownershipType, p.assignedBy])).rows[0];
                const removeOwnership = async (_t, _d, id) => { await safeQuery(`UPDATE "${schema}".responsibilities SET deleted_at=NOW() WHERE id=$1`, [id]); };
                const domain = input.domain;
                if (input.action === 'list')
                    return { owners: await listOwnership(tenantId, domain) };
                if (input.action === 'assign')
                    return await assignOwnership(tenantId, domain, { entityId: input.entityId, userId: input.userId, ownershipType: input.ownershipType || 'primary', assignedBy: 'agent-A02' });
                if (input.action === 'remove' && input.ownerId) {
                    await removeOwnership(tenantId, domain, input.ownerId);
                    return { removed: true };
                }
                return { error: 'Invalid action or missing params' };
            },
        },
        {
            name: 'provision_user',
            description: 'List users or flag provisioning issues.',
            input_schema: { type: 'object', properties: { filter: { type: 'string', enum: ['all', 'inactive', 'no_mfa', 'admin'] } }, required: [] },
            handler: async (tenantId, input) => {
                const users = await safeRows(`SELECT user_id, email, name, role, is_active, mfa_enabled, last_login_at FROM users WHERE tenant_id = $1 ORDER BY name`, [tenantId]);
                const filter = input.filter || 'all';
                if (filter === 'inactive')
                    return { users: users.filter(u => !u.is_active) };
                if (filter === 'no_mfa')
                    return { users: users.filter(u => !u.mfa_enabled) };
                if (filter === 'admin')
                    return { users: users.filter(u => ['admin'].includes(u.role)) };
                return { users, count: users.length };
            },
        },
        {
            name: 'assign_role',
            description: 'Check current role assignments for a user.',
            input_schema: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] },
            handler: async (tenantId, input) => {
                const schema = `tenant_${tenantId}`;
                const roles = await safeRows(`SELECT ura.role_id, r.role_code, r.name_en FROM "${schema}".user_role_assignments ura JOIN "${schema}".roles r ON r.role_id = ura.role_id WHERE ura.user_id = $1 AND ura.active = TRUE`, [input.userId]);
                return { userId: input.userId, roles, count: roles.length };
            },
        },
        {
            name: 'configure_sso',
            description: 'Check SSO/authentication configuration status for the tenant.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const config = await safeRows(`SELECT key, value FROM tenant_preferences WHERE tenant_id = $1 AND key LIKE 'sso_%'`, [tenantId]);
                return { ssoConfig: config, configured: config.length > 0 };
            },
        },
        {
            name: 'enforce_mfa',
            description: 'Check MFA enforcement status across all users.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const users = await safeRows(`SELECT user_id, email, role, mfa_enabled FROM users WHERE tenant_id = $1 AND is_active = TRUE`, [tenantId]);
                const withMfa = users.filter(u => u.mfa_enabled);
                const adminsWithoutMfa = users.filter(u => ['admin', 'owner'].includes(u.role) && !u.mfa_enabled);
                return { totalActive: users.length, mfaEnabled: withMfa.length, mfaPct: users.length > 0 ? Math.round(withMfa.length / users.length * 100) : 0, adminsWithoutMfa };
            },
        },
        {
            name: 'review_access',
            description: 'Review user access patterns: detect over-privileged accounts, inactive users with active roles, and users with excessive role assignments.',
            input_schema: { type: 'object', properties: { scope: { type: 'string', enum: ['over_privileged', 'inactive', 'excessive_roles', 'all'] } }, required: [] },
            handler: async (tenantId, input) => {
                const scope = input.scope || 'all';
                const users = await safeRows(`SELECT user_id, email, name, role, is_active, mfa_enabled, last_login_at FROM users WHERE tenant_id = $1 ORDER BY name`, [tenantId]);
                const schema = `tenant_${tenantId}`;
                let roleAssignments = [];
                try {
                    roleAssignments = await safeRows(`SELECT ura.user_id, COUNT(*)::int AS role_count FROM "${schema}".user_role_assignments ura WHERE ura.active = TRUE GROUP BY ura.user_id`, []);
                }
                catch { /* table may not exist */ }
                const roleCounts = new Map(roleAssignments.map(r => [r.user_id, r.role_count]));
                const overPrivileged = users.filter(u => ['admin', 'owner'].includes(u.role) && !u.mfa_enabled);
                const inactive = users.filter(u => !u.is_active && (roleCounts.get(u.user_id) || 0) > 0);
                const excessiveRoles = users.filter(u => (roleCounts.get(u.user_id) || 0) > OVER_PRIVILEGE_ROLE_THRESHOLD);
                if (scope === 'over_privileged')
                    return { overPrivileged, count: overPrivileged.length };
                if (scope === 'inactive')
                    return { inactiveWithRoles: inactive, count: inactive.length };
                if (scope === 'excessive_roles')
                    return { excessiveRoles, count: excessiveRoles.length };
                return { overPrivileged, inactiveWithRoles: inactive, excessiveRoles, totalUsers: users.length, findings: overPrivileged.length + inactive.length + excessiveRoles.length };
            },
        },
        {
            name: 'audit_permissions',
            description: 'Audit permission assignments: list all role-permission mappings and detect anomalies such as orphaned assignments or conflicting permissions.',
            input_schema: { type: 'object', properties: { userId: { type: 'string' } }, required: [] },
            handler: async (tenantId, input) => {
                const schema = `tenant_${tenantId}`;
                if (input.userId) {
                    const roles = await swallowEmpty(EC.FALLBACK_QUERY, safeRows(`SELECT ura.role_id, r.role_code, r.name_en, ura.assigned_at FROM "${schema}".user_role_assignments ura JOIN "${schema}".roles r ON r.role_id = ura.role_id WHERE ura.user_id = $1 AND ura.active = TRUE`, [input.userId]), { operation: 'query user_role_assignments' });
                    const user = await safeRows(`SELECT user_id, email, name, role FROM users WHERE tenant_id = $1 AND user_id = $2`, [tenantId, input.userId]);
                    return { user: user[0] || null, roles, roleCount: roles.length, warning: roles.length > OVER_PRIVILEGE_ROLE_THRESHOLD ? `User has more than ${OVER_PRIVILEGE_ROLE_THRESHOLD} roles — review recommended` : null };
                }
                const allAssignments = await swallowEmpty(EC.FALLBACK_QUERY, safeRows(`SELECT ura.user_id, r.role_code, r.name_en FROM "${schema}".user_role_assignments ura JOIN "${schema}".roles r ON r.role_id = ura.role_id WHERE ura.active = TRUE ORDER BY ura.user_id`, []), { operation: 'query user_role_assignments' });
                const userRoleCounts = new Map();
                for (const a of allAssignments) {
                    userRoleCounts.set(a.user_id, (userRoleCounts.get(a.user_id) || 0) + 1);
                }
                const anomalies = [...userRoleCounts.entries()].filter(([, count]) => count > OVER_PRIVILEGE_ROLE_THRESHOLD).map(([userId, count]) => ({ userId, roleCount: count }));
                return { totalAssignments: allAssignments.length, uniqueUsers: userRoleCounts.size, anomalies, anomalyCount: anomalies.length };
            },
        },
    ];
}
//# sourceMappingURL=a02-identity-access-tools.js.map