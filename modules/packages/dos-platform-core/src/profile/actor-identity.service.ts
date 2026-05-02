// @ownership-note: DOS profile service — references auth keywords for profile enrichment, not auth definition
import { swallowDefault, EC } from '../resilience';
import { safeQuery, tenantSchema, emptyResult } from '@dos/db';
import { logger } from '../observability/logger';
import type {
  ActorIdentity,
  ActorType,
  AccessProfile,
  FunctionalRole,
  DecisionAuthority,
  DecisionOutcome,
  AuthorityType,
} from '@dos/types/actor';

export async function createActor(
  tenantId: string,
  input: {
    actorType: ActorType;
    displayName: string;
    displayNameAr?: string;
    email?: string;
    externalRef?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ActorIdentity> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".actor_registry
       (actor_type, display_name, display_name_ar, email, external_ref, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.actorType,
      input.displayName,
      input.displayNameAr || null,
      input.email || null,
      input.externalRef || null,
      JSON.stringify(input.metadata || {}),
    ],
  );
  if (!rows[0]) {
    throw new Error(`[createActor] INSERT returned no rows — actor_registry may not exist in schema "${schema}"`);
  }
  return mapActorRow(rows[0]);
}

export async function getActor(tenantId: string, actorId: string): Promise<ActorIdentity | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE actor_id = $1`,
    [actorId],
  );
  return rows.length > 0 ? mapActorRow(rows[0]) : null;
}

export async function getActorByEmail(tenantId: string, email: string): Promise<ActorIdentity | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE LOWER(email) = LOWER($1) AND is_active = TRUE LIMIT 1`,
    [email],
  );
  return rows.length > 0 ? mapActorRow(rows[0]) : null;
}

export async function listActors(
  tenantId: string,
  filters?: { actorType?: ActorType; isActive?: boolean },
): Promise<ActorIdentity[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".actor_registry WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.actorType) {
    params.push(filters.actorType);
    sql += ` AND actor_type = $${params.length}`;
  }
  if (filters?.isActive !== undefined) {
    params.push(filters.isActive);
    sql += ` AND is_active = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapActorRow);
}

export async function deactivateActor(tenantId: string, actorId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".actor_registry SET is_active = FALSE, updated_at = NOW() WHERE actor_id = $1`,
    [actorId],
  );
}

export async function ensureHumanActor(tenantId: string, userId: string, email: string, displayName: string): Promise<ActorIdentity> {
  const schema = tenantSchema(tenantId);
  const byRef = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE external_ref = $1 AND actor_type = 'human' LIMIT 1`,
    [userId],
  ), { tenantId, operation: 'ensure_human_actor_by_ref' });

  if (byRef.rows.length > 0) return mapActorRow(byRef.rows[0]);

  const byEmail = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE LOWER(email) = LOWER($1) AND actor_type = 'human' LIMIT 1`,
    [email],
  ), { tenantId, operation: 'ensure_human_actor_by_email' });

  if (byEmail.rows.length > 0) return mapActorRow(byEmail.rows[0]);

  try {
    return await createActor(tenantId, {
      actorType: 'human',
      displayName,
      email,
      externalRef: userId,
      metadata: { legacyUserId: userId },
    });
  } catch (err) {
    logger.warn(`[ensureHumanActor] createActor failed for user=${userId} tenant=${tenantId}: ${err instanceof Error ? err.message : err} — returning ephemeral fallback`);
    return buildEphemeralActor('human', userId, email, displayName);
  }
}

export async function ensureAgentActor(tenantId: string, agentCode: string, displayName: string): Promise<ActorIdentity> {
  const schema = tenantSchema(tenantId);
  const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".actor_registry WHERE external_ref = $1 AND actor_type = 'agent' LIMIT 1`,
    [agentCode],
  ), { tenantId, operation: 'ensure_agent_actor' });

  if (existing.rows.length > 0) return mapActorRow(existing.rows[0]);

  try {
    return await createActor(tenantId, {
      actorType: 'agent',
      displayName,
      externalRef: agentCode,
      metadata: { agentCode },
    });
  } catch (err) {
    logger.warn(`[ensureAgentActor] createActor failed for agent=${agentCode} tenant=${tenantId}: ${err instanceof Error ? err.message : err} — returning ephemeral fallback`);
    return buildEphemeralActor('agent', agentCode, undefined, displayName);
  }
}

export async function getAccessProfile(tenantId: string, profileCode: string): Promise<AccessProfile | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".access_profiles WHERE profile_code = $1 AND is_active = TRUE LIMIT 1`,
    [profileCode],
  );
  return rows.length > 0 ? mapAccessProfileRow(rows[0]) : null;
}

export async function listAccessProfiles(tenantId: string): Promise<AccessProfile[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".access_profiles WHERE is_active = TRUE ORDER BY profile_code`,
  );
  return rows.map(mapAccessProfileRow);
}

export async function getFunctionalRole(tenantId: string, roleCode: string): Promise<FunctionalRole | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".functional_roles WHERE role_code = $1 AND is_active = TRUE LIMIT 1`,
    [roleCode],
  );
  return rows.length > 0 ? mapFunctionalRoleRow(rows[0]) : null;
}

export async function listFunctionalRoles(tenantId: string, category?: string): Promise<FunctionalRole[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".functional_roles WHERE is_active = TRUE`;
  const params: unknown[] = [];
  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }
  sql += ' ORDER BY role_code';
  const { rows } = await safeQuery(sql, params);
  return rows.map(mapFunctionalRoleRow);
}

export async function getActorEffectivePermissions(tenantId: string, actorId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);

  const actorRes = await safeQuery(
    `SELECT is_active FROM "${schema}".actor_registry WHERE actor_id = $1 LIMIT 1`,
    [actorId],
  );
  if (actorRes.rows.length === 0 || !actorRes.rows[0].is_active) return [];

  const permSet = new Set<string>();

  const profileRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT ap.base_permissions
     FROM "${schema}".actor_access_assignments aaa
     JOIN "${schema}".access_profiles ap ON ap.profile_code = aaa.profile_code AND ap.is_active = TRUE
     WHERE aaa.actor_id = $1 AND aaa.is_active = TRUE
       AND (aaa.valid_to IS NULL OR aaa.valid_to > NOW())`,
    [actorId],
  ), { tenantId, operation: 'get_actor_profile_perms' });

  for (const row of profileRes.rows) {
    const perms = row.base_permissions;
    if (Array.isArray(perms)) perms.forEach((p: string) => permSet.add(p));
  }

  const roleRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT fr.permissions
     FROM "${schema}".actor_role_assignments ara
     JOIN "${schema}".functional_roles fr ON fr.role_code = ara.role_code AND fr.is_active = TRUE
     WHERE ara.actor_id = $1 AND ara.is_active = TRUE
       AND (ara.valid_to IS NULL OR ara.valid_to > NOW())`,
    [actorId],
  ), { tenantId, operation: 'get_actor_role_perms' });

  for (const row of roleRes.rows) {
    const perms = row.permissions;
    if (Array.isArray(perms)) perms.forEach((p: string) => permSet.add(p));
  }

  return [...permSet];
}

export async function checkDecisionAuthority(
  tenantId: string,
  actorId: string,
  authorityType: AuthorityType,
  resourceType: string,
): Promise<{ authorized: boolean; authority?: DecisionAuthority; reason: string }> {
  const schema = tenantSchema(tenantId);

  const authRes = await safeQuery(
    `SELECT * FROM "${schema}".decision_authorities
     WHERE authority_type = $1 AND resource_type = $2 AND is_active = TRUE
     LIMIT 1`,
    [authorityType, resourceType],
  );

  if (authRes.rows.length === 0) {
    return { authorized: false, reason: 'No authority rule defined; default deny' };
  }

  const authority = mapDecisionAuthorityRow(authRes.rows[0]);

  const roleRes = await safeQuery(
    `SELECT role_code FROM "${schema}".actor_role_assignments
     WHERE actor_id = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())`,
    [actorId],
  );
  const actorRoles = roleRes.rows.map(( r: Record<string, any>) => r.role_code as string);

  const requiredRoleCodes = (authority.requiredRoleCodes as string[]) || [];
  const sodConflictRoles = (authority.sodConflictRoles as string[]) || [];
  const hasRequiredRole = requiredRoleCodes.length === 0 ||
    requiredRoleCodes.some((rc: string) => actorRoles.includes(rc));

  if (!hasRequiredRole) {
    return {
      authorized: false,
      authority,
      reason: `Actor lacks required role. Needs one of: ${requiredRoleCodes.join(', ')}`,
    };
  }

  // SoD check — inline until platform/dauth/sod/sod-policy.service is available (Phase 3 migration)
  if (authority.requiresSodSeparation && sodConflictRoles.length > 0) {
    const hasConflict = sodConflictRoles.some((rc: string) => actorRoles.includes(rc));
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

export async function recordActorAudit(
  tenantId: string,
  input: {
    actorId: string;
    actorType: ActorType;
    action: string;
    resourceType?: string;
    resourceId?: string;
    decision: DecisionOutcome;
    authorityCode?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".actor_audit_log
       (actor_id, actor_type, action, resource_type, resource_id, decision, authority_code, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      input.actorId, input.actorType, input.action,
      input.resourceType || null, input.resourceId || null,
      input.decision, input.authorityCode || null,
      JSON.stringify(input.metadata || {}),
      input.ipAddress || null, input.userAgent || null,
    ],
  );
}

function buildEphemeralActor(
  actorType: ActorType,
  externalRef: string,
  email: string | undefined,
  displayName: string,
): ActorIdentity {
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

function mapActorRow(row: Record<string, any>): ActorIdentity {
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

function mapAccessProfileRow(row: Record<string, any>): AccessProfile {
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

function mapFunctionalRoleRow(row: Record<string, any>): FunctionalRole {
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

function mapDecisionAuthorityRow(row: Record<string, any>): DecisionAuthority {
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
