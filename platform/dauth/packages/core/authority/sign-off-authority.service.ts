import { safeQuery, tenantSchema } from '@dos/db';
import { hasDecisionAuthority } from './decision-authority.service';
import { logAuthDecision } from '../audit/decision-log.service';

export interface SignOffRequirement {
  entityType: string;
  transitionAction: string;
  requiredAuthorityCode: string;
  minSignOffs: number;
  requiresDifferentActors: boolean;
}

export async function getSignOffRequirements(
  tenantId: string,
  entityType: string,
  transitionAction: string,
): Promise<SignOffRequirement | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT entity_type, transition_action, required_authority_code,
            min_sign_offs, requires_different_actors
     FROM "${schema}".sign_off_requirements
     WHERE entity_type = $1 AND transition_action = $2 AND is_active = TRUE LIMIT 1`,
    [entityType, transitionAction],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    entityType: r.entity_type,
    transitionAction: r.transition_action,
    requiredAuthorityCode: r.required_authority_code,
    minSignOffs: r.min_sign_offs ?? 1,
    requiresDifferentActors: r.requires_different_actors === true,
  };
}

export async function canSignOff(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
  transitionAction: string,
): Promise<{ allowed: boolean; reason: string }> {
  const req = await getSignOffRequirements(tenantId, entityType, transitionAction);
  if (!req) return { allowed: true, reason: 'no_sign_off_required' };

  const hasAuth = await hasDecisionAuthority(tenantId, userId, req.requiredAuthorityCode);
  if (!hasAuth) {
    await logAuthDecision(tenantId, {
      userId,
      permissionCode: `sign_off:${req.requiredAuthorityCode}`,
      decision: 'deny',
      reason: 'insufficient_authority',
    });
    return { allowed: false, reason: `requires_authority:${req.requiredAuthorityCode}` };
  }

  if (req.requiresDifferentActors) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT signer_id FROM "${schema}".sign_off_log
       WHERE entity_type = $1 AND entity_id = $2 AND transition_action = $3
         AND signer_id = $4`,
      [entityType, entityId, transitionAction, userId],
    );
    if (rows.length > 0) {
      return { allowed: false, reason: 'already_signed_off_requires_different_actor' };
    }
  }

  return { allowed: true, reason: 'authority_confirmed' };
}

export async function recordSignOff(
  tenantId: string,
  userId: string,
  entityType: string,
  entityId: string,
  transitionAction: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".sign_off_log (entity_type, entity_id, transition_action, signer_id, signed_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [entityType, entityId, transitionAction, userId],
  );
}
