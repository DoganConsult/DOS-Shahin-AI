import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';

export interface DecisionAuthority {
  authorityId: string;
  userId: string;
  authorityCode: string;
  moduleCode: string | null;
  scopeType: string | null;
  scopeId: string | null;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
}

export async function getUserDecisionAuthorities(
  tenantId: string,
  userId: string,
): Promise<DecisionAuthority[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT authority_id, user_id, authority_code, module_code, scope_type, scope_id,
            is_active, valid_from, valid_to
     FROM "${schema}".decision_authorities
     WHERE user_id = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY authority_code`,
    [userId],
  );
  return rows.map(( r: any) => ({
    authorityId: r.authority_id,
    userId: r.user_id,
    authorityCode: r.authority_code,
    moduleCode: r.module_code,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
    isActive: true,
    validFrom: r.valid_from?.toISOString?.() ?? '',
    validTo: r.valid_to?.toISOString?.() ?? null,
  }));
}

export async function grantDecisionAuthority(
  tenantId: string,
  userId: string,
  authorityCode: string,
  opts: {
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    validTo?: string;
    grantedBy: string;
  },
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".decision_authorities
       (user_id, authority_code, module_code, scope_type, scope_id, is_active, valid_from, valid_to, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), $6, $7)
     ON CONFLICT (user_id, authority_code)
       DO UPDATE SET is_active = TRUE, valid_to = EXCLUDED.valid_to, updated_at = NOW()`,
    [userId, authorityCode, opts.moduleCode ?? null, opts.scopeType ?? null, opts.scopeId ?? null, opts.validTo ?? null, opts.grantedBy],
  );
  await publish('dauth.authority.granted', tenantId, { userId, authorityCode, grantedBy: opts.grantedBy });
}

export async function revokeDecisionAuthority(
  tenantId: string,
  userId: string,
  authorityCode: string,
  revokedBy: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".decision_authorities
     SET is_active = FALSE, valid_to = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND authority_code = $2 AND is_active = TRUE`,
    [userId, authorityCode],
  );
  if ((result.rowCount ?? 0) > 0) {
    await publish('dauth.authority.revoked', tenantId, { userId, authorityCode, revokedBy });
    return true;
  }
  return false;
}

export async function hasDecisionAuthority(
  tenantId: string,
  userId: string,
  authorityCode: string,
  moduleCode?: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const moduleFilter = moduleCode ? `AND (module_code = $3 OR module_code IS NULL)` : '';
  const params: unknown[] = [userId, authorityCode];
  if (moduleCode) params.push(moduleCode);
  const { rows } = await safeQuery(
    `SELECT 1 FROM "${schema}".decision_authorities
     WHERE user_id = $1 AND authority_code = $2 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW()) ${moduleFilter}
     LIMIT 1`,
    params,
  );
  return rows.length > 0;
}
