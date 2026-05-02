/**
 * requireSodClearance — HTTP middleware that gates a request on SoD evaluation.
 *
 * Reuses the canonical engine in services/auth-service/src/domain/sod/sod-engine.ts
 * via a thin in-process query (we cannot import the auth-service from a
 * platform package, so we duplicate the minimal SQL — same schema as
 * tenant migrations 131_sod_rules.sql / 132_sod_waivers.sql + the
 * module_sod_rules table seeded by the module-security-seeder).
 *
 * Behaviour matrix:
 *   - role-pair conflict in sod_rules            → consult waiver, else block/escalate/warn per rule
 *   - action-pair conflict in module_sod_rules   → resolution_strategy decides
 *   - active waiver covers blocking rule         → allow with audit reason
 *   - any DB / config error                      → fail-closed when DAUTH_SOD_FAIL_CLOSED=true,
 *                                                   otherwise log + allow (current rollout default)
 *
 * The middleware is a thin gate. The deeper decision-engine path that
 * writes to the ledger still runs; this is only the HTTP front edge.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type {} from '../express-augment';

export interface SodClearanceOptions {
  /** Module code for module-level SoD lookup (module_sod_rules.module_code). */
  moduleCode: string;
  /**
   * The action(s) the route would perform. When two are supplied we look
   * for an action-pair conflict. When one is supplied we still evaluate
   * role-pair conflicts on the user's roles + waivers.
   */
  action: string;
  conflictingAction?: string;
  /**
   * When true (default) any blocking outcome returns 403. When false the
   * middleware annotates `req` with the SoD result and lets downstream
   * handlers decide.
   */
  enforce?: boolean;
}

interface SqlClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

let dbModule:
  | {
      withTenantClient: <T>(tenantId: string, fn: (c: SqlClient) => Promise<T>) => Promise<T>;
    }
  | null = null;
async function loadDb() {
  if (dbModule) return dbModule;
  // Lazy-import so the package can be bundled into contexts without @dos/db.
  const mod = (await import('@dos/db')) as unknown as typeof dbModule;
  dbModule = mod;
  return dbModule!;
}

function failClosed(): boolean {
  const v = (process.env.DAUTH_SOD_FAIL_CLOSED || '').toLowerCase();
  return v === '1' || v === 'true';
}

export interface SodClearanceVerdict {
  passed: boolean;
  outcome: 'allow' | 'warn' | 'escalate' | 'block' | 'allow-with-audit';
  reason?: string;
  ruleCode?: string;
  waiverId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sodClearance?: SodClearanceVerdict;
    }
  }
}

export function requireSodClearance(opts: SodClearanceOptions): RequestHandler {
  if (!opts.moduleCode || !opts.action) {
    throw new Error('[DAuth] requireSodClearance requires { moduleCode, action }');
  }
  const enforce = opts.enforce !== false;

  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.id || req.userId;
    if (!tenantId || !userId) {
      // Auth gate already ran upstream; if either is missing here the
      // request is malformed — fail closed.
      res.status(401).json({ error: 'Unauthenticated', code: 'DAUTH_SOD_NO_PRINCIPAL' });
      return;
    }

    const userRoles = collectRoles(req);
    const userActions = collectPermissions(req);

    try {
      const verdict = await evaluate({
        tenantId,
        userId,
        userRoles,
        userActions,
        moduleCode: opts.moduleCode,
        action: opts.action,
        conflictingAction: opts.conflictingAction,
      });

      req.sodClearance = verdict;

      if (verdict.outcome === 'block' && enforce) {
        res.status(403).json({
          error: 'SoD violation',
          code: 'DAUTH_SOD_BLOCK',
          ruleCode: verdict.ruleCode,
          reason: verdict.reason,
        });
        return;
      }
      if (verdict.outcome === 'escalate' && enforce) {
        res.status(409).json({
          error: 'SoD escalation required',
          code: 'DAUTH_SOD_ESCALATE',
          ruleCode: verdict.ruleCode,
          reason: verdict.reason,
        });
        return;
      }
      next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (failClosed()) {
        res.status(503).json({
          error: 'SoD evaluation unavailable',
          code: 'DAUTH_SOD_UNAVAILABLE',
          detail: msg,
        });
        return;
      }
      // Degrade open during shadow rollout. Annotate so the audit
      // ledger sees the failure.
      req.sodClearance = {
        passed: true,
        outcome: 'allow',
        reason: `sod-eval failed (degraded open): ${msg}`,
      };
      next();
    }
  };
}

function collectRoles(req: Request): string[] {
  const acc: string[] = [];
  const u: any = req.user;
  if (u?.role && typeof u.role === 'string') acc.push(u.role);
  if (Array.isArray(u?.roles)) acc.push(...u.roles.filter((r: unknown) => typeof r === 'string'));
  if (typeof req.userRole === 'string') acc.push(req.userRole);
  return Array.from(new Set(acc));
}
function collectPermissions(req: Request): string[] {
  if (Array.isArray(req.permissions)) return Array.from(new Set(req.permissions));
  const fromUser = (req.user as any)?.permissions;
  if (Array.isArray(fromUser)) return Array.from(new Set(fromUser));
  return [];
}

async function evaluate(input: {
  tenantId: string;
  userId: string;
  userRoles: string[];
  userActions: string[];
  moduleCode: string;
  action: string;
  conflictingAction?: string;
}): Promise<SodClearanceVerdict> {
  const db = await loadDb();
  return db.withTenantClient(input.tenantId, async (client): Promise<SodClearanceVerdict> => {
    // ── 1. Role-pair conflicts in sod_rules ────────────────────────
    if (input.userRoles.length >= 2) {
      const { rows } = await client.query(
        `SELECT rule_code, role_code_a, role_code_b, conflict_level, enforcement,
                temporary_waiver_allowed, description
         FROM sod_rules
         WHERE is_active = TRUE
           AND role_code_a = ANY($1::text[])
           AND role_code_b = ANY($1::text[])
           AND (module_code IS NULL OR module_code = $2)
         ORDER BY conflict_level DESC
         LIMIT 1`,
        [input.userRoles, input.moduleCode],
      );
      if (rows.length > 0) {
        const r = rows[0];
        const blockingLevel = r.conflict_level as string;
        if (blockingLevel === 'block' || blockingLevel === 'escalate') {
          if (r.temporary_waiver_allowed) {
            const waiver = await activeWaiver(client, input.userId, r.rule_code);
            if (waiver) {
              return {
                passed: true,
                outcome: 'allow-with-audit',
                ruleCode: r.rule_code,
                waiverId: waiver.waiver_id,
                reason: `Waiver ${waiver.waiver_id} active until ${waiver.expires_at}`,
              };
            }
          }
          return {
            passed: false,
            outcome: blockingLevel === 'block' ? 'block' : 'escalate',
            ruleCode: r.rule_code,
            reason: r.description || `SoD ${blockingLevel}: ${r.role_code_a} ↔ ${r.role_code_b}`,
          };
        }
        if (blockingLevel === 'warn') {
          return {
            passed: true,
            outcome: 'warn',
            ruleCode: r.rule_code,
            reason: r.description || `SoD warn: ${r.role_code_a} ↔ ${r.role_code_b}`,
          };
        }
      }
    }

    // ── 2. Action-pair conflicts in module_sod_rules ──────────────
    const candidateActions = new Set<string>([input.action]);
    if (input.conflictingAction) candidateActions.add(input.conflictingAction);
    for (const p of input.userActions) candidateActions.add(p);
    if (candidateActions.size >= 2) {
      const arr = Array.from(candidateActions);
      const { rows } = await client.query(
        `SELECT action_a, action_b, conflict_type, resolution_strategy, description_en
         FROM module_sod_rules
         WHERE active = TRUE
           AND module_code = $1
           AND action_a = ANY($2::text[])
           AND action_b = ANY($2::text[])
         ORDER BY conflict_type ASC
         LIMIT 1`,
        [input.moduleCode, arr],
      );
      if (rows.length > 0) {
        const r = rows[0];
        const outcome = (r.resolution_strategy as SodClearanceVerdict['outcome']) || 'block';
        if (outcome === 'block' || outcome === 'escalate') {
          return {
            passed: false,
            outcome,
            reason: r.description_en || `SoD ${outcome}: ${r.action_a} ↔ ${r.action_b}`,
          };
        }
        return {
          passed: true,
          outcome: outcome === 'warn' ? 'warn' : 'allow',
          reason: r.description_en,
        };
      }
    }

    return { passed: true, outcome: 'allow' };
  });
}

async function activeWaiver(
  client: SqlClient,
  userId: string,
  ruleCode: string,
): Promise<{ waiver_id: string; expires_at: string } | null> {
  try {
    const { rows } = await client.query(
      `SELECT waiver_id, expires_at FROM sod_waivers
       WHERE user_id = $1 AND rule_code = $2
         AND is_active = TRUE
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId, ruleCode],
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
