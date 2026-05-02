"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActor = createActor;
exports.getActor = getActor;
exports.getActorByEmail = getActorByEmail;
exports.listActors = listActors;
exports.deactivateActor = deactivateActor;
exports.ensureHumanActor = ensureHumanActor;
exports.ensureAgentActor = ensureAgentActor;
exports.getAccessProfile = getAccessProfile;
exports.listAccessProfiles = listAccessProfiles;
exports.getFunctionalRole = getFunctionalRole;
exports.listFunctionalRoles = listFunctionalRoles;
exports.getActorEffectivePermissions = getActorEffectivePermissions;
exports.checkDecisionAuthority = checkDecisionAuthority;
exports.recordActorAudit = recordActorAudit;
// @ownership-note: DOS profile service — references auth keywords for profile enrichment, not auth definition
const resilience_1 = require("../resilience");
const db_1 = require("@dos/db");
const logger_1 = require("../observability/logger");
async function createActor(tenantId, input) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_registry
       (actor_type, display_name, display_name_ar, email, external_ref, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [
        input.actorType,
        input.displayName,
        input.displayNameAr || null,
        input.email || null,
        input.externalRef || null,
        JSON.stringify(input.metadata || {}),
    ]);
    if (!rows[0]) {
        throw new Error(`[createActor] INSERT returned no rows — actor_registry may not exist in schema "${schema}"`);
    }
    return mapActorRow(rows[0]);
}
async function getActor(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE actor_id = $1`, [actorId]);
    return rows.length > 0 ? mapActorRow(rows[0]) : null;
}
async function getActorByEmail(tenantId, email) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE LOWER(email) = LOWER($1) AND is_active = TRUE LIMIT 1`, [email]);
    return rows.length > 0 ? mapActorRow(rows[0]) : null;
}
async function listActors(tenantId, filters) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".actor_registry WHERE 1=1`;
    const params = [];
    if (filters?.actorType) {
        params.push(filters.actorType);
        sql += ` AND actor_type = $${params.length}`;
    }
    if (filters?.isActive !== undefined) {
        params.push(filters.isActive);
        sql += ` AND is_active = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await (0, db_1.safeQuery)(sql, params);
    return rows.map(mapActorRow);
}
async function deactivateActor(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".actor_registry SET is_active = FALSE, updated_at = NOW() WHERE actor_id = $1`, [actorId]);
}
async function ensureHumanActor(tenantId, userId, email, displayName) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const byRef = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE external_ref = $1 AND actor_type = 'human' LIMIT 1`, [userId]), { tenantId, operation: 'ensure_human_actor_by_ref' });
    if (byRef.rows.length > 0)
        return mapActorRow(byRef.rows[0]);
    const byEmail = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE LOWER(email) = LOWER($1) AND actor_type = 'human' LIMIT 1`, [email]), { tenantId, operation: 'ensure_human_actor_by_email' });
    if (byEmail.rows.length > 0)
        return mapActorRow(byEmail.rows[0]);
    try {
        return await createActor(tenantId, {
            actorType: 'human',
            displayName,
            email,
            externalRef: userId,
            metadata: { legacyUserId: userId },
        });
    }
    catch (err) {
        logger_1.logger.warn(`[ensureHumanActor] createActor failed for user=${userId} tenant=${tenantId}: ${err instanceof Error ? err.message : err} — returning ephemeral fallback`);
        return buildEphemeralActor('human', userId, email, displayName);
    }
}
async function ensureAgentActor(tenantId, agentCode, displayName) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const existing = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT * FROM "${schema}".actor_registry WHERE external_ref = $1 AND actor_type = 'agent' LIMIT 1`, [agentCode]), { tenantId, operation: 'ensure_agent_actor' });
    if (existing.rows.length > 0)
        return mapActorRow(existing.rows[0]);
    try {
        return await createActor(tenantId, {
            actorType: 'agent',
            displayName,
            externalRef: agentCode,
            metadata: { agentCode },
        });
    }
    catch (err) {
        logger_1.logger.warn(`[ensureAgentActor] createActor failed for agent=${agentCode} tenant=${tenantId}: ${err instanceof Error ? err.message : err} — returning ephemeral fallback`);
        return buildEphemeralActor('agent', agentCode, undefined, displayName);
    }
}
async function getAccessProfile(tenantId, profileCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".access_profiles WHERE profile_code = $1 AND is_active = TRUE LIMIT 1`, [profileCode]);
    return rows.length > 0 ? mapAccessProfileRow(rows[0]) : null;
}
async function listAccessProfiles(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".access_profiles WHERE is_active = TRUE ORDER BY profile_code`);
    return rows.map(mapAccessProfileRow);
}
async function getFunctionalRole(tenantId, roleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".functional_roles WHERE role_code = $1 AND is_active = TRUE LIMIT 1`, [roleCode]);
    return rows.length > 0 ? mapFunctionalRoleRow(rows[0]) : null;
}
async function listFunctionalRoles(tenantId, category) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".functional_roles WHERE is_active = TRUE`;
    const params = [];
    if (category) {
        params.push(category);
        sql += ` AND category = $${params.length}`;
    }
    sql += ' ORDER BY role_code';
    const { rows } = await (0, db_1.safeQuery)(sql, params);
    return rows.map(mapFunctionalRoleRow);
}
async function getActorEffectivePermissions(tenantId, actorId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const actorRes = await (0, db_1.safeQuery)(`SELECT is_active FROM "${schema}".actor_registry WHERE actor_id = $1 LIMIT 1`, [actorId]);
    if (actorRes.rows.length === 0 || !actorRes.rows[0].is_active)
        return [];
    const permSet = new Set();
    const profileRes = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT ap.base_permissions
     FROM "${schema}".actor_access_assignments aaa
     JOIN "${schema}".access_profiles ap ON ap.profile_code = aaa.profile_code AND ap.is_active = TRUE
     WHERE aaa.actor_id = $1 AND aaa.is_active = TRUE
       AND (aaa.valid_to IS NULL OR aaa.valid_to > NOW())`, [actorId]), { tenantId, operation: 'get_actor_profile_perms' });
    for (const row of profileRes.rows) {
        const perms = row.base_permissions;
        if (Array.isArray(perms))
            perms.forEach((p) => permSet.add(p));
    }
    const roleRes = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT fr.permissions
     FROM "${schema}".actor_role_assignments ara
     JOIN "${schema}".functional_roles fr ON fr.role_code = ara.role_code AND fr.is_active = TRUE
     WHERE ara.actor_id = $1 AND ara.is_active = TRUE
       AND (ara.valid_to IS NULL OR ara.valid_to > NOW())`, [actorId]), { tenantId, operation: 'get_actor_role_perms' });
    for (const row of roleRes.rows) {
        const perms = row.permissions;
        if (Array.isArray(perms))
            perms.forEach((p) => permSet.add(p));
    }
    return [...permSet];
}
async function checkDecisionAuthority(tenantId, actorId, authorityType, resourceType) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const authRes = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".decision_authorities
     WHERE authority_type = $1 AND resource_type = $2 AND is_active = TRUE
     LIMIT 1`, [authorityType, resourceType]);
    if (authRes.rows.length === 0) {
        return { authorized: false, reason: 'No authority rule defined; default deny' };
    }
    const authority = mapDecisionAuthorityRow(authRes.rows[0]);
    const roleRes = await (0, db_1.safeQuery)(`SELECT role_code FROM "${schema}".actor_role_assignments
     WHERE actor_id = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())`, [actorId]);
    const actorRoles = roleRes.rows.map((r) => r.role_code);
    const requiredRoleCodes = authority.requiredRoleCodes || [];
    const sodConflictRoles = authority.sodConflictRoles || [];
    const hasRequiredRole = requiredRoleCodes.length === 0 ||
        requiredRoleCodes.some((rc) => actorRoles.includes(rc));
    if (!hasRequiredRole) {
        return {
            authorized: false,
            authority,
            reason: `Actor lacks required role. Needs one of: ${requiredRoleCodes.join(', ')}`,
        };
    }
    // SoD check — inline until platform/dauth/sod/sod-policy.service is available (Phase 3 migration)
    if (authority.requiresSodSeparation && sodConflictRoles.length > 0) {
        const hasConflict = sodConflictRoles.some((rc) => actorRoles.includes(rc));
        if (hasConflict) {
            return {
                authorized: false,
                authority,
                reason: `SoD conflict: actor holds conflicting role from ${sodConflictRoles.join(', ')}`,
            };
        }
    }
    return { authorized: true, authority, reason: 'Authority check passed' };
}
async function recordActorAudit(tenantId, input) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".actor_audit_log
       (actor_id, actor_type, action, resource_type, resource_id, decision, authority_code, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
        input.actorId, input.actorType, input.action,
        input.resourceType || null, input.resourceId || null,
        input.decision, input.authorityCode || null,
        JSON.stringify(input.metadata || {}),
        input.ipAddress || null, input.userAgent || null,
    ]);
}
function buildEphemeralActor(actorType, externalRef, email, displayName) {
    const now = new Date().toISOString();
    return {
        actorId: `ephemeral-${externalRef}`,
        actorType,
        displayName,
        email,
        externalRef,
        isActive: true,
        metadata: { ephemeral: true },
        createdAt: now,
        updatedAt: now,
    };
}
function mapActorRow(row) {
    return {
        actorId: row.actor_id,
        actorType: row.actor_type,
        displayName: row.display_name,
        displayNameAr: row.display_name_ar || undefined,
        email: row.email || undefined,
        externalRef: row.external_ref || undefined,
        isActive: row.is_active,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapAccessProfileRow(row) {
    return {
        profileId: row.profile_id,
        profileCode: row.profile_code,
        profileNameEn: row.profile_name_en,
        profileNameAr: row.profile_name_ar || undefined,
        descriptionEn: row.description_en || undefined,
        descriptionAr: row.description_ar || undefined,
        tier: row.tier,
        basePermissions: row.base_permissions || [],
        maxDelegationDepth: row.max_delegation_depth,
        canImpersonate: row.can_impersonate,
        isActive: row.is_active,
    };
}
function mapFunctionalRoleRow(row) {
    return {
        roleId: row.role_id,
        roleCode: row.role_code,
        roleNameEn: row.role_name_en,
        roleNameAr: row.role_name_ar || undefined,
        descriptionEn: row.description_en || undefined,
        descriptionAr: row.description_ar || undefined,
        category: row.category,
        moduleScopes: row.module_scopes || [],
        permissions: row.permissions || [],
        workflowAssignments: row.workflow_assignments || [],
        responsibilityMatrix: row.responsibility_matrix || [],
        isActive: row.is_active,
    };
}
function mapDecisionAuthorityRow(row) {
    return {
        id: row.id,
        authorityCode: row.authority_code,
        authorityType: row.authority_type,
        resourceType: row.resource_type,
        requiredRoleCodes: row.required_role_codes || [],
        requiredAccessTier: row.required_access_tier || undefined,
        minApprovalCount: row.min_approval_count,
        requiresSodSeparation: row.requires_sod_separation,
        sodConflictRoles: row.sod_conflict_roles || [],
        maxRiskLevel: row.max_risk_level || undefined,
        conditions: row.conditions || {},
        isActive: row.is_active,
    };
}
//# sourceMappingURL=actor-identity.service.js.map