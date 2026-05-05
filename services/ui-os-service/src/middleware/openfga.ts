/**
 * OpenFGA check helper for ui-os-service (Wave 10b).
 *
 * Lightweight HTTP-only client (no @openfga/sdk dep) — mirrors the pattern
 * used by platform/dauth/packages/shared/src/adapters/openfga-rebac.adapter.ts
 * but trimmed to the single `check()` op needed by UI-OS routes.
 *
 * Configuration:
 *   OPENFGA_API_URL    — base URL, e.g. http://127.0.0.1:8080
 *   OPENFGA_STORE_ID
 *   OPENFGA_MODEL_ID
 *   OPENFGA_API_TOKEN  — optional bearer (or Vault / HTTP secret backend via @dos/service-bootstrap)
 *   OPENFGA_SECRET_CACHE_TTL_MS — optional token cache TTL ms (default 300000; 0 = no cache)
 *   OPENFGA_TIMEOUT_MS — optional, defaults to 250
 *   UI_OS_OPENFGA_ENFORCE — 'true' to deny on unavailable; defaults 'false'
 *
 * If OPENFGA_API_URL is not set, the middleware fails OPEN and logs a
 * single warning. This matches the dual-mode rollout pattern; turn on
 * UI_OS_OPENFGA_ENFORCE=true to fail closed in production.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveOpenFgaApiToken } from '@dos/service-bootstrap';

const API_URL    = (process.env.OPENFGA_API_URL || '').replace(/\/$/, '');
const STORE_ID   = process.env.OPENFGA_STORE_ID || '';
const MODEL_ID   = process.env.OPENFGA_MODEL_ID || '';
const TIMEOUT_MS = Number(process.env.OPENFGA_TIMEOUT_MS || 250);
const ENFORCE    = String(process.env.UI_OS_OPENFGA_ENFORCE || 'false').toLowerCase() === 'true';

let warnedDisabled = false;

export interface FgaTuple {
  user: string;     // e.g. 'user:<sub>'
  relation: string; // e.g. 'viewer', 'editor', 'admin'
  object: string;   // e.g. 'ui_os_app:<tenantId>'
}

export type FgaCheckOutcome = 'allow' | 'deny' | 'unavailable' | 'disabled';

export async function fgaCheck(t: FgaTuple): Promise<FgaCheckOutcome> {
  if (!API_URL || !STORE_ID || !MODEL_ID) {
    if (!warnedDisabled) {
      console.warn('[ui-os/fga] OpenFGA not configured — fga checks return "disabled"');
      warnedDisabled = true;
    }
    return 'disabled';
  }
  const API_TOKEN = (await resolveOpenFgaApiToken(Math.max(TIMEOUT_MS, 8000))) || '';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/stores/${STORE_ID}/check`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(API_TOKEN ? { authorization: `Bearer ${API_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        authorization_model_id: MODEL_ID,
        tuple_key: { user: t.user, relation: t.relation, object: t.object },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return 'unavailable';
    const j = (await res.json()) as { allowed?: boolean };
    return j.allowed ? 'allow' : 'deny';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

export interface RequireFgaOptions {
  /**
   * Build the (user, relation, object) tuple from the request. Receive the
   * verified principal so the user id is never spoofable.
   */
  build: (req: Request) => FgaTuple | null;
}

/**
 * Per-route OpenFGA gate. Requires `req.principal` to be populated
 * (i.e. the gateway-origin middleware ran first).
 *
 * Outcome → response:
 *   'allow'        → next()
 *   'deny'         → 403 FGA_DENIED
 *   'unavailable'  → ENFORCE ? 503 FGA_UNAVAILABLE : next()
 *   'disabled'     → next() (with one-time boot warning above)
 */
export function requireFga(opts: RequireFgaOptions): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.principal) {
      res.status(401).json({ error: 'NO_PRINCIPAL', code: 'PRINCIPAL_REQUIRED' });
      return;
    }
    const tuple = opts.build(req);
    if (!tuple) { next(); return; }
    const outcome = await fgaCheck(tuple);
    if (outcome === 'allow' || outcome === 'disabled') { next(); return; }
    if (outcome === 'deny') {
      res.status(403).json({ error: 'FGA_DENIED', code: 'NOT_AUTHORIZED', tuple });
      return;
    }
    if (ENFORCE) {
      res.status(503).json({ error: 'FGA_UNAVAILABLE', code: 'AUTHZ_BACKEND_DOWN' });
      return;
    }
    next();
  };
}

// ── Standardized tuple builders (mirrors @dos/authz-ids/fga) ────────────────
// Local builders so the ui-os-service does not pull the platform package at
// runtime; the strings MUST match `model.v2.fga` v2026.05.01.0 exactly.

/** Internal factory — produce a per-phase module_lifecycle tuple builder. */
function lifecycleVerbBuilder(relation: string) {
  return (userSub: string, tenantId: string, moduleCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation,
    object: `module_lifecycle:${tenantId}:${moduleCode}`,
  });
}

export const fgaTuples = {
  /** Page render gate — used by the page-shell route on entry. */
  pageCanRender: (userSub: string, pageId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_render',
    object: `page:${pageId}`,
  }),
  /** Component render gate — used by *dosCanRender SSR pre-check. */
  componentCanRender: (userSub: string, componentId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_render',
    object: `component:${componentId}`,
  }),
  /** Component invocation gate — used by widget actions / quick-tiles. */
  componentCanInvoke: (userSub: string, componentId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_invoke',
    object: `component:${componentId}`,
  }),
  /** Service invocation gate — used by gateway/proxy when calling a service. */
  serviceCanInvoke: (userSub: string, serviceCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_invoke',
    object: `service:${serviceCode}`,
  }),
  /** Profile read gate — used by user-service /profiles/:id. */
  profileCanView: (userSub: string, subjectUserId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_view',
    object: `user_profile:${subjectUserId}`,
  }),
  /** Profile write gate — used by user-service preferences/MFA endpoints. */
  profileCanEdit: (userSub: string, subjectUserId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_edit',
    object: `user_profile:${subjectUserId}`,
  }),
  /** Permission verb check — for verb-grained checks in product code. */
  permissionCanExercise: (userSub: string, permissionCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_exercise',
    object: `permission:${permissionCode}`,
  }),

  /** Foundation-DNA capability gate. DNA is unconditional — `can_consume`
   *  is true by default unless DSOC writes a deny tuple. */
  dnaCanConsume: (userSub: string, dnaCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_consume',
    object: `foundation_dna:${dnaCode}`,
  }),

  /** AI workspace per-user scope (conversations / threads / Langfuse). */
  aiCanInvokeTool: (userSub: string, tenantId: string, ownerUserId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_invoke_tool',
    object: `ai_workspace:${tenantId}:${ownerUserId}`,
  }),

  /** Tenant admin settings surface. */
  tenantSettingCanEdit: (userSub: string, tenantId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_edit',
    object: `tenant_setting:${tenantId}`,
  }),

  /** Profile settings surface (Foundation profile page). */
  profileSettingCanEdit: (userSub: string, subjectUserId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_edit',
    object: `profile_setting:${subjectUserId}`,
  }),

  /** Module lifecycle umbrella check (any transition). Prefer the per-phase
   *  builders below — this exists only for legacy/back-compat callers. */
  lifecycleCanTransition: (userSub: string, tenantId: string, moduleCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_transition',
    object: `module_lifecycle:${tenantId}:${moduleCode}`,
  }),

  /**
   * Per-phase module-lifecycle gates. Each verb is enforced on
   * `module_lifecycle:<tenantId>:<moduleCode>` and matches the
   * `MODULE_LIFECYCLE_VERBS` catalogue in @dos/authz-ids.
   */
  lifecycleCanRequest:       lifecycleVerbBuilder('can_request'),
  lifecycleCanCancelRequest: lifecycleVerbBuilder('can_cancel_request'),
  lifecycleCanProvision:     lifecycleVerbBuilder('can_provision'),
  lifecycleCanOnboard:       lifecycleVerbBuilder('can_onboard'),
  lifecycleCanConfigure:     lifecycleVerbBuilder('can_configure'),
  lifecycleCanActivate:      lifecycleVerbBuilder('can_activate'),
  lifecycleCanSuspend:       lifecycleVerbBuilder('can_suspend'),
  lifecycleCanResume:        lifecycleVerbBuilder('can_resume'),
  lifecycleCanArchive:       lifecycleVerbBuilder('can_archive'),
  lifecycleCanUnarchive:     lifecycleVerbBuilder('can_unarchive'),
  lifecycleCanDeprovision:   lifecycleVerbBuilder('can_deprovision'),
  lifecycleCanPurge:         lifecycleVerbBuilder('can_purge'),
  lifecycleCanMigrate:       lifecycleVerbBuilder('can_migrate'),
  lifecycleCanAudit:         lifecycleVerbBuilder('can_audit'),
  lifecycleCanView:          lifecycleVerbBuilder('can_view'),

  /** SoD rule management (DAuth/Foundation administrators). */
  sodCanManage: (userSub: string, tenantId: string, ruleCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_manage',
    object: `sod_rule:${tenantId}:${ruleCode}`,
  }),

  /** Org-unit visibility — used by the org chart, hierarchical inheritance. */
  orgUnitCanView: (userSub: string, orgUnitId: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_view',
    object: `org_unit:${orgUnitId}`,
  }),

  /** Org-team visibility — used by org-chart pages and Foundation team
   *  roster components. Object id = `team:<tenantId>:<teamCode>`. */
  teamCanView: (userSub: string, tenantId: string, teamCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_view',
    object: `team:${tenantId}:${teamCode}`,
  }),
  /** Team edit gate — head, deputy, or admin. */
  teamCanEdit: (userSub: string, tenantId: string, teamCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_edit',
    object: `team:${tenantId}:${teamCode}`,
  }),
  /** Roster management — only the team head (or admin) may add/remove
   *  members. Used by Foundation roster CRUD endpoints. */
  teamCanManageRoster: (userSub: string, tenantId: string, teamCode: string): FgaTuple => ({
    user: `user:${userSub}`,
    relation: 'can_manage_roster',
    object: `team:${tenantId}:${teamCode}`,
  }),
} as const;
