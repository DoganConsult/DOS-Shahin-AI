"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOpenFgaTupleSync = registerOpenFgaTupleSync;
/**
 * OpenFGA tuple-sync subscriber.
 *
 * Listens for DAuth source-of-truth events (delegation, ownership,
 * membership) and mirrors them into OpenFGA as tuples. Keeps the relation
 * graph eventually consistent with the DAuth database.
 *
 * Registration is idempotent: if `DAUTH_OPENFGA_SHADOW` and `_ENFORCE` are
 * both false, the subscriber registers but skips writes — this avoids
 * accidentally doubling writes if flags are flipped mid-sprint.
 *
 * Failures surface on the logger; an accompanying nightly reconciliation job
 * is expected to catch any drift that slips through.
 */
const events_1 = require("@dos/platform-core/events");
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
const rebac_factory_1 = require("../adapters/rebac.factory");
const MAPPERS = [
    {
        eventType: 'dauth.delegation.created',
        subscriberId: 'dauth:openfga-delegation-created',
        map: (p) => {
            const from = str(p.fromUserId);
            const to = str(p.toUserId);
            const grantId = str(p.grantId ?? p.delegationId);
            if (!from || !to || !grantId)
                return [];
            return [
                { user: `user:${from}`, relation: 'from', object: `delegation:${grantId}`, op: 'write' },
                { user: `user:${to}`, relation: 'to', object: `delegation:${grantId}`, op: 'write' },
            ];
        },
    },
    {
        eventType: 'dauth.delegation.revoked',
        subscriberId: 'dauth:openfga-delegation-revoked',
        map: (p) => {
            const grantId = str(p.grantId ?? p.delegationId);
            const to = str(p.toUserId);
            const from = str(p.fromUserId);
            if (!grantId)
                return [];
            const out = [];
            if (from)
                out.push({ user: `user:${from}`, relation: 'from', object: `delegation:${grantId}`, op: 'delete' });
            if (to)
                out.push({ user: `user:${to}`, relation: 'to', object: `delegation:${grantId}`, op: 'delete' });
            return out;
        },
    },
    {
        eventType: 'dauth.ownership.assigned',
        subscriberId: 'dauth:openfga-ownership-assigned',
        map: (p) => {
            const userId = str(p.userId);
            const type = str(p.entityType);
            const id = str(p.entityId);
            if (!userId || !type || !id)
                return [];
            return [{ user: `user:${userId}`, relation: 'owner', object: `${type}:${id}`, op: 'write' }];
        },
    },
    {
        eventType: 'dauth.ownership.revoked',
        subscriberId: 'dauth:openfga-ownership-revoked',
        map: (p) => {
            const userId = str(p.userId);
            const type = str(p.entityType);
            const id = str(p.entityId);
            if (!userId || !type || !id)
                return [];
            return [{ user: `user:${userId}`, relation: 'owner', object: `${type}:${id}`, op: 'delete' }];
        },
    },
    {
        eventType: 'dauth.membership.added',
        subscriberId: 'dauth:openfga-membership-added',
        map: (p) => {
            const userId = str(p.userId);
            const tenantId = str(p.tenantId);
            if (!userId || !tenantId)
                return [];
            return [{ user: `user:${userId}`, relation: 'member', object: `tenant:${tenantId}`, op: 'write' }];
        },
    },
    {
        eventType: 'dauth.membership.removed',
        subscriberId: 'dauth:openfga-membership-removed',
        map: (p) => {
            const userId = str(p.userId);
            const tenantId = str(p.tenantId);
            if (!userId || !tenantId)
                return [];
            return [{ user: `user:${userId}`, relation: 'member', object: `tenant:${tenantId}`, op: 'delete' }];
        },
    },
    // ── Phase F-3: position holder + manager chain + role assignment ──
    // Foundation publishes these events when a user is assigned to / removed
    // from a position, when a position's reports_to changes, or when a role
    // is granted / revoked. The OpenFGA model gains the corresponding tuples
    // so DAuth's ReBAC step can answer "is this user a position holder?",
    // "is A a manager of B?", and "does this user hold role R?" without
    // round-tripping the SQL chain.
    {
        eventType: 'foundation.position.holder.assigned',
        subscriberId: 'dauth:openfga-position-holder-assigned',
        map: (p) => {
            const userId = str(p.userId);
            const positionId = str(p.positionId);
            if (!userId || !positionId)
                return [];
            return [{ user: `user:${userId}`, relation: 'holder', object: `position:${positionId}`, op: 'write' }];
        },
    },
    {
        eventType: 'foundation.position.holder.unassigned',
        subscriberId: 'dauth:openfga-position-holder-unassigned',
        map: (p) => {
            const userId = str(p.userId);
            const positionId = str(p.positionId);
            if (!userId || !positionId)
                return [];
            return [{ user: `user:${userId}`, relation: 'holder', object: `position:${positionId}`, op: 'delete' }];
        },
    },
    {
        eventType: 'foundation.org.manager.changed',
        subscriberId: 'dauth:openfga-org-manager-changed',
        // Payload: { positionId, oldManagerPositionId?, newManagerPositionId? }
        // Models the reports_to relationship as `position:<id>#manager → position:<parent>`.
        // OpenFGA model treats user→manager via the holder relation transitively.
        map: (p) => {
            const positionId = str(p.positionId);
            const oldMgr = str(p.oldManagerPositionId);
            const newMgr = str(p.newManagerPositionId);
            if (!positionId)
                return [];
            const out = [];
            if (oldMgr)
                out.push({ user: `position:${oldMgr}`, relation: 'manager', object: `position:${positionId}`, op: 'delete' });
            if (newMgr)
                out.push({ user: `position:${newMgr}`, relation: 'manager', object: `position:${positionId}`, op: 'write' });
            return out;
        },
    },
    {
        eventType: 'foundation.role.assigned',
        subscriberId: 'dauth:openfga-role-assigned',
        map: (p) => {
            const userId = str(p.userId);
            const roleCode = str(p.roleCode);
            const tenantId = str(p.tenantId);
            if (!userId || !roleCode)
                return [];
            // Tenant-scoped role assignment if tenantId provided; otherwise
            // platform-scoped. Matches the access-profiles.ts model.
            const obj = tenantId ? `role:${tenantId}/${roleCode}` : `role:${roleCode}`;
            return [{ user: `user:${userId}`, relation: 'assignee', object: obj, op: 'write' }];
        },
    },
    {
        eventType: 'foundation.role.unassigned',
        subscriberId: 'dauth:openfga-role-unassigned',
        map: (p) => {
            const userId = str(p.userId);
            const roleCode = str(p.roleCode);
            const tenantId = str(p.tenantId);
            if (!userId || !roleCode)
                return [];
            const obj = tenantId ? `role:${tenantId}/${roleCode}` : `role:${roleCode}`;
            return [{ user: `user:${userId}`, relation: 'assignee', object: obj, op: 'delete' }];
        },
    },
    // ── Foundation hierarchy lifecycle events ──
    // org_created / dept_created / scope_changed write tuples that let OpenFGA
    // answer "is this org a child of that org?" and "is this department under
    // that org?" without re-querying SQL on every check.
    {
        eventType: 'foundation.org_created',
        subscriberId: 'dauth:openfga-org-created',
        map: (p) => {
            const tenantId = str(p.tenantId);
            const orgId = str(p.entityId);
            const parentId = str(p.parentId);
            if (!tenantId || !orgId)
                return [];
            const out = [
                { user: `tenant:${tenantId}`, relation: 'owner', object: `org:${orgId}`, op: 'write' },
            ];
            if (parentId) {
                out.push({ user: `org:${parentId}`, relation: 'parent', object: `org:${orgId}`, op: 'write' });
            }
            return out;
        },
    },
    {
        eventType: 'foundation.dept_created',
        subscriberId: 'dauth:openfga-dept-created',
        map: (p) => {
            const tenantId = str(p.tenantId);
            const deptId = str(p.entityId);
            const parentId = str(p.parentId);
            if (!tenantId || !deptId)
                return [];
            const out = [
                { user: `tenant:${tenantId}`, relation: 'owner', object: `department:${deptId}`, op: 'write' },
            ];
            // Parent may be an org or another department. Use generic `parent` relation.
            if (parentId) {
                out.push({ user: `org:${parentId}`, relation: 'parent', object: `department:${deptId}`, op: 'write' });
            }
            return out;
        },
    },
    {
        eventType: 'foundation.scope_changed',
        subscriberId: 'dauth:openfga-scope-changed',
        // Re-parents an entity in the hierarchy. Payload:
        //   { tenantId, entityId, entityType, oldParentId?, newParentId? }
        map: (p) => {
            const entityId = str(p.entityId);
            const entityType = str(p.entityType);
            const oldParentId = str(p.oldParentId);
            const newParentId = str(p.newParentId);
            if (!entityId || !entityType)
                return [];
            const objType = entityType === 'organization' ? 'org' : entityType;
            const out = [];
            if (oldParentId) {
                out.push({ user: `org:${oldParentId}`, relation: 'parent', object: `${objType}:${entityId}`, op: 'delete' });
            }
            if (newParentId) {
                out.push({ user: `org:${newParentId}`, relation: 'parent', object: `${objType}:${entityId}`, op: 'write' });
            }
            return out;
        },
    },
    // J-1: legacy underscore-variant role events from the existing Foundation
    // event contract (`foundation.role_assigned` / `foundation.role_revoked`).
    // Same tuple shape as the dotted variants — kept until all emit sites
    // converge on the dotted names.
    {
        eventType: 'foundation.role_assigned',
        subscriberId: 'dauth:openfga-role-assigned-underscore',
        map: (p) => {
            const userId = str(p.userId);
            const roleCode = str(p.roleCode);
            const tenantId = str(p.tenantId);
            if (!userId || !roleCode)
                return [];
            const obj = tenantId ? `role:${tenantId}/${roleCode}` : `role:${roleCode}`;
            return [{ user: `user:${userId}`, relation: 'assignee', object: obj, op: 'write' }];
        },
    },
    {
        eventType: 'foundation.role_revoked',
        subscriberId: 'dauth:openfga-role-revoked-underscore',
        map: (p) => {
            const userId = str(p.userId);
            const roleCode = str(p.roleCode);
            const tenantId = str(p.tenantId);
            if (!userId || !roleCode)
                return [];
            const obj = tenantId ? `role:${tenantId}/${roleCode}` : `role:${roleCode}`;
            return [{ user: `user:${userId}`, relation: 'assignee', object: obj, op: 'delete' }];
        },
    },
];
function registerOpenFgaTupleSync() {
    const active = dauth_config_1.DAUTH_CONFIG.openfga.shadow || dauth_config_1.DAUTH_CONFIG.openfga.enforce;
    for (const mapper of MAPPERS) {
        (0, events_1.subscribe)({
            eventType: mapper.eventType,
            subscriberId: mapper.subscriberId,
            handler: async (event) => {
                if (!active)
                    return;
                try {
                    const tuples = mapper.map((event.payload ?? {}));
                    if (tuples.length === 0)
                        return;
                    const { primary, shadow } = (0, rebac_factory_1.getRebacAdapters)();
                    const target = primary.name === 'openfga' ? primary : shadow?.name === 'openfga' ? shadow : null;
                    if (!target)
                        return;
                    await target.writeTuples(tuples);
                }
                catch (err) {
                    observability_1.logger.warn('[DAuth:OpenFGA] tuple-sync failed', {
                        eventType: mapper.eventType,
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            },
        });
    }
    observability_1.logger.info('[DAuth:OpenFGA] tuple-sync subscribers registered', {
        count: MAPPERS.length,
        active,
    });
}
function str(v) {
    return typeof v === 'string' && v.length > 0 ? v : undefined;
}
//# sourceMappingURL=openfga-tuple-sync.subscriber.js.map