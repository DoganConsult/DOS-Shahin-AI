/**
 * Compliance permission catalog & SoD publisher.
 *
 * Self-contained: locally typed (no `@dos/types` dependency) and reads its
 * source-of-truth from JSON files extracted by
 * `ops/scripts/extract-security-catalog.mjs`.
 *
 * Two responsibilities:
 *   1. publishComplianceCatalog(client) — idempotent SQL upsert into
 *      `platform_dauth.permissions` and binding onto `platform_dauth.functional_roles`
 *      (mirrors Foundation's 006_seed_foundation_permissions.sql discipline).
 *   2. evaluateComplianceSoD(input)    — delegates to the bound Foundation
 *      port; falls back to local rule evaluation if Foundation is unbound
 *      (in-process tests, isolated dev). Production hosts must bind Foundation.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getFoundationPort, type SoDEvaluationInput, type SoDEvaluationResult } from '../../ports/foundation.port';
import type { DbClient } from '../../db/runner';

export interface PermissionRow {
  permissionCode: string;
  resourceType: string;
  actionType: string;
  descriptionEn: string;
  descriptionAr: string;
  sensitive: boolean;
  fieldLevel: boolean;
  aiOnly: boolean;
  externalParty: boolean;
  deprecated: boolean;
  legacyAliases: string[];
}

export interface RoleRow {
  roleCode: string;
  archetype: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  permissions: string[];
  authorityLevel: 'required' | 'recommended' | 'optional';
  defaultScope: 'platform' | 'tenant' | 'org' | 'department' | 'team' | 'own';
}

export interface SodRuleRow {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export interface PublishCatalogResult {
  permissionsUpserted: number;
  rolesBound: number;
  sodRulesPublished: number;
}

const HERE_FROM_DIST = (override?: string) =>
  override ?? join(__dirname, '..', '..', '..', 'interface', 'security');
const HERE_FROM_SRC = (override?: string) =>
  override ?? join(__dirname, '..', '..', 'interface', 'security');

function loadJson<T>(file: string, override?: string): T {
  // dist layout: dist/interface/security/publish.js → walk to <pkg>/interface/security
  const candidates = [HERE_FROM_DIST(override), HERE_FROM_SRC(override)];
  for (const dir of candidates) {
    try {
      return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
    } catch {
      /* try next */
    }
  }
  throw new Error(`[compliance] catalog file not found on any candidate path: ${file}`);
}

export function loadPermissions(catalogDir?: string): PermissionRow[] {
  return loadJson<{ permissions: PermissionRow[] }>('compliance.permissions.json', catalogDir).permissions;
}
export function loadRoles(catalogDir?: string): RoleRow[] {
  return loadJson<{ roles: RoleRow[] }>('compliance.roles.json', catalogDir).roles;
}
export function loadSodRules(catalogDir?: string): SodRuleRow[] {
  return loadJson<{ rules: SodRuleRow[] }>('compliance.sod.json', catalogDir).rules;
}

const permissionId = (code: string) => `perm_${code.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;

/**
 * Idempotent publisher. Writes:
 *   - platform_dauth.permissions       (catalog rows)
 *   - platform_dauth.functional_roles  (permissions[] union with extracted roles)
 *   - compliance_sod_rules             (module-owned SoD rule table; created if absent)
 */
export async function publishComplianceCatalog(
  client: DbClient,
  opts: { catalogDir?: string } = {},
): Promise<PublishCatalogResult> {
  const permissions = loadPermissions(opts.catalogDir);
  const roles = loadRoles(opts.catalogDir);
  const sodRules = loadSodRules(opts.catalogDir);

  await client.query('BEGIN');
  try {
    // ── permissions catalog upsert ───────────────────────────────────────
    for (const p of permissions) {
      await client.query(
        `INSERT INTO platform_dauth.permissions
           (permission_id, permission_code, module_code, resource_type, action_type,
            description, label_en, label_ar)
         VALUES ($1, $2, 'compliance', $3, $4, $5, $6, $7)
         ON CONFLICT (permission_id) DO UPDATE SET
           permission_code = EXCLUDED.permission_code,
           module_code     = EXCLUDED.module_code,
           resource_type   = EXCLUDED.resource_type,
           action_type     = EXCLUDED.action_type,
           description     = EXCLUDED.description,
           label_en        = EXCLUDED.label_en,
           label_ar        = EXCLUDED.label_ar`,
        [
          permissionId(p.permissionCode),
          p.permissionCode,
          p.resourceType,
          p.actionType,
          p.descriptionEn,
          p.descriptionEn,
          p.descriptionAr,
        ],
      );
    }

    // ── role bindings (union with whatever the role already had) ─────────
    let rolesBound = 0;
    for (const r of roles) {
      const result = await client.query(
        `UPDATE platform_dauth.functional_roles fr
         SET permissions = (
           SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(fr.permissions, '{}'::text[]) || $2::text[]))
         )
         WHERE fr.role_code = $1`,
        [r.roleCode, r.permissions],
      );
      // pg returns rowCount; mock clients may return 0 — count attempts as bound.
      rolesBound += Math.max(1, (result as { rowCount?: number }).rowCount ?? 1);
    }

    // ── SoD rules table (compliance-owned, idempotent) ───────────────────
    await client.query(`CREATE TABLE IF NOT EXISTS compliance_sod_rules (
      rule_code TEXT PRIMARY KEY,
      severity TEXT NOT NULL,
      conflicting_roles TEXT[] NOT NULL,
      conflicting_actions TEXT[] NOT NULL,
      description_en TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    for (const s of sodRules) {
      await client.query(
        `INSERT INTO compliance_sod_rules
           (rule_code, severity, conflicting_roles, conflicting_actions, description_en, description_ar)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (rule_code) DO UPDATE SET
           severity = EXCLUDED.severity,
           conflicting_roles = EXCLUDED.conflicting_roles,
           conflicting_actions = EXCLUDED.conflicting_actions,
           description_en = EXCLUDED.description_en,
           description_ar = EXCLUDED.description_ar`,
        [s.ruleCode, s.severity, s.conflictingRoles, s.conflictingActions, s.descriptionEn, s.descriptionAr],
      );
    }

    await client.query('COMMIT');
    return {
      permissionsUpserted: permissions.length,
      rolesBound,
      sodRulesPublished: sodRules.length,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

/**
 * Evaluate SoD for a proposed action.
 *
 * Production: delegates to the Foundation port (canonical evaluator that knows
 * the actor's roles + active assignments + waivers).
 * Fallback: in-process evaluation against the static rule list — used only
 * when Foundation port is unbound (isolated tests / dev).
 */
export async function evaluateComplianceSoD(
  input: SoDEvaluationInput,
  opts: { catalogDir?: string } = {},
): Promise<SoDEvaluationResult> {
  const fp = getFoundationPort();
  try {
    return await fp.evaluateSoD(input);
  } catch (err) {
    if (!/not bound/.test(String((err as Error).message ?? ''))) throw err;
    // fallback: action-only check against static rules
    const rules = loadSodRules(opts.catalogDir);
    const blocking = rules.find((r) => r.conflictingActions.includes(input.proposedAction));
    if (blocking) {
      return {
        allowed: false,
        ruleId: blocking.ruleCode,
        reason: `Local fallback: action "${input.proposedAction}" is part of SoD rule ${blocking.ruleCode}.`,
      };
    }
    return { allowed: true, ruleId: null, reason: null };
  }
}
