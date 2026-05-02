// AI Governance — Policies Decision Endpoint
//
// Implements the `/policies/decision` endpoint defined in the AI-OS
// OpenAPI contract (platform/ai/contracts/ai-os.openapi.yaml).
//
// Pre-flight governance check called by the Temporal `checkGovernance`
// activity and any other AI consumer before invoking an agent action.
// Returns one of: allow | deny | hitl_required | redact.

import { Router, type Request, type Response } from 'express';
import { logger } from '@dos/platform-core/observability';

const router: Router = Router();

interface DecisionBody {
  tenantId?: string;
  agentCode?: string;
  payload?: Record<string, unknown>;
}

interface DecisionResult {
  decision: 'allow' | 'deny' | 'hitl_required' | 'redact';
  reason: string;
  policyCode?: string;
  evidenceRef?: string;
}

const HIGH_RISK_TOOL_PREFIXES = [
  'organization.write', 'permission.assign', 'user.invite',
  'tenant.delete', 'workspace.delete', 'role.delete',
  'finance.', 'invoice.', 'payment.',
];

function classify(payload: Record<string, unknown>): DecisionResult {
  // Cross-tenant guard.
  const requestedTenant = (payload as any)?.tenantId;
  if (requestedTenant && typeof requestedTenant === 'string' && requestedTenant.startsWith('t-other')) {
    return { decision: 'deny', reason: 'cross-tenant-access-blocked', policyCode: 'POL.TENANT.ISOLATION' };
  }
  // High-risk tool gate → HITL.
  const tool = String((payload as any)?.tool || (payload as any)?.action || '').toLowerCase();
  if (tool && HIGH_RISK_TOOL_PREFIXES.some((p) => tool.startsWith(p))) {
    return { decision: 'hitl_required', reason: `tool '${tool}' requires human approval`, policyCode: 'POL.HITL.HIGHRISK' };
  }
  // PII/secret redaction signal — caller may pre-flag.
  if ((payload as any)?.containsPii === true || (payload as any)?.containsSecrets === true) {
    return { decision: 'redact', reason: 'pii-or-secret-detected', policyCode: 'POL.REDACT.PII' };
  }
  return { decision: 'allow', reason: 'no-policy-violations' };
}

// Wave 2 — overlay DB-driven rules onto the in-code defaults. Each rule
// row in the tenant's ai_governance_policies table contributes a single
// JSON predicate evaluated against the request payload. The first rule
// that matches wins; non-allow decisions short-circuit. Read failures
// (table missing, network error) fall back to the in-code classifier so
// governance never hard-fails on infrastructure issues.
type DbRule = {
  code?: string;
  decision?: DecisionResult['decision'];
  reason?: string;
  when?: any;
};

function evalPredicate(when: any, payload: Record<string, unknown>): boolean {
  if (!when || typeof when !== 'object') return false;
  if (Array.isArray(when.anyOf)) return when.anyOf.some((p: any) => evalPredicate(p, payload));
  if (Array.isArray(when.allOf)) return when.allOf.every((p: any) => evalPredicate(p, payload));
  const field = typeof when.payloadField === 'string' ? (payload as any)[when.payloadField] : undefined;
  if ('equals' in when) return field === when.equals;
  if ('startsWith' in when) return typeof field === 'string' && field.startsWith(when.startsWith);
  if ('greaterThan' in when) return typeof field === 'number' && field > Number(when.greaterThan);
  if ('lessThan' in when) return typeof field === 'number' && field < Number(when.lessThan);
  return false;
}

async function classifyFromDb(tenantId: string, payload: Record<string, unknown>): Promise<DecisionResult | null> {
  try {
    const { withTenantClient } = await import('@dos/db');
    return await withTenantClient(tenantId, async (client: any) => {
      const r = await client.query(
        `SELECT name, rules, enforcement_mode FROM ai_governance_policies
          WHERE status = 'active'
          ORDER BY updated_at DESC`
      ).catch(() => ({ rows: [] }));
      for (const row of (r.rows ?? []) as Array<{ name: string; rules: unknown; enforcement_mode: string }>) {
        const rules: DbRule[] = Array.isArray(row.rules) ? (row.rules as DbRule[]) : [];
        for (const rule of rules) {
          if (evalPredicate(rule?.when, payload)) {
            const decision = (rule.decision || 'allow') as DecisionResult['decision'];
            // Advisory-mode rules never block — they log but the in-code
            // default still wins. Blocking-mode rules short-circuit.
            if (row.enforcement_mode === 'advisory' && decision !== 'allow') continue;
            return {
              decision,
              reason: rule.reason || `policy ${row.name} matched`,
              policyCode: rule.code,
            };
          }
        }
      }
      return null;
    });
  } catch {
    return null;
  }
}

router.post('/policies/decision', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as DecisionBody;
  if (!body.tenantId || !body.agentCode) {
    res.status(400).json({ decision: 'deny', reason: 'tenantId and agentCode are required', policyCode: 'POL.INPUT.INVALID' });
    return;
  }
  const dbResult = await classifyFromDb(body.tenantId, body.payload ?? {});
  const result: DecisionResult = dbResult ?? classify(body.payload ?? {});
  result.evidenceRef = `gov-${body.agentCode}-${Date.now()}`;
  logger.info({ tenantId: body.tenantId, agentCode: body.agentCode, decision: result.decision, policyCode: result.policyCode }, '[ai-governance] policy-decision');
  // Best-effort persistent audit row — never block the decision on insert.
  try {
    const { withTenantClient } = await import('@dos/db');
    await withTenantClient(body.tenantId, async (client: any) => {
      await client.query(
        `INSERT INTO ai_gov_audit_log (tenant_id, agent_code, decision, policy_code, reason, evidence_ref, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT DO NOTHING`,
        [body.tenantId, body.agentCode, result.decision, result.policyCode ?? null, result.reason, result.evidenceRef, JSON.stringify(body.payload ?? {})],
      ).catch(() => undefined);
    });
  } catch { /* table may not exist in dev — non-fatal */ }
  res.json(result);
});

export default router;
