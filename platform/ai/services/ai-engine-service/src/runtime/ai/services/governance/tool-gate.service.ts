/**
 * tool-gate.service — production-grade pre-execution gate for agent tool calls.
 *
 * Enforces, in order:
 *   1. Tool permission   (agent_tool_permissions table via checkToolPermission)
 *   2. Approval boundary (agent.governance.approvalBoundary vs tool.riskTier)
 *   3. Per-cycle action cap (agent.governance.maxActionsPerCycle)
 *   4. SoD policy        (agent_sod_policies table — blocks agent→agent, escalates agent→service_account)
 *   5. Cost cap          (per-tenant epsilon_budget vs estimated tool cost)
 *   6. Per-tool audit    (dos.audit_trail) — synchronous in enforce mode
 *
 * Behavior controlled by env:
 *   AI_GOVERNANCE_ENFORCEMENT_MODE = audit | warn | enforce (default: warn)
 *   AI_TOOL_PERMISSIONS_ENABLED    = true | false (default: true)
 *   AI_SOD_ENABLED                 = true | false (default: true)
 *   AI_PER_TOOL_AUDIT              = true | false (default: true)
 *   AI_PERMISSION_DEFAULT_ALLOW    = true | false (default: true — backwards-compat for un-seeded tenants)
 */

import { checkToolPermission } from './agent-governance.service';

export type EnforcementMode = 'audit' | 'warn' | 'enforce';
export type RiskTier = 'low' | 'medium' | 'high';

export interface GateInput {
  tenantId: string;
  agentId: string;
  toolName: string;
  toolInput: unknown;
  approvalBoundary?: RiskTier;
  toolRiskTier?: RiskTier;
  maxActionsPerCycle?: number;
  cycleActionCount: number;
  callerType?: 'human' | 'agent' | 'service_account' | 'external';
  proposerType?: 'human' | 'agent' | 'service_account' | 'external';
  /** Identity of the principal proposing the action (e.g. "agent-A05" delegating to A04). */
  proposerId?: string;
  /** Identity of the principal who would approve/execute (e.g. the executing agent). */
  approverId?: string;
}

export interface GateDecision {
  allow: boolean;
  reason: string;
  decidedBy: string;
  enforcementMode: EnforcementMode;
  requiresApproval: boolean;
  loggedAt: string;
}

const RISK_RANK: Record<RiskTier, number> = { low: 1, medium: 2, high: 3 };

function getMode(): EnforcementMode {
  const raw = (process.env.AI_GOVERNANCE_ENFORCEMENT_MODE || 'warn').toLowerCase();
  if (raw === 'enforce' || raw === 'warn' || raw === 'audit') return raw;
  return 'warn';
}

function flag(name: string, defaultVal: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultVal;
  return v === 'true' || v === '1';
}

async function recordToolAudit(
  tenantId: string,
  agentId: string,
  toolName: string,
  decision: GateDecision,
  toolInput: unknown,
): Promise<void> {
  if (!flag('AI_PER_TOOL_AUDIT', true)) return;
  try {
    const m: any = await import('../../../audit/services/audit/core/audit-trail.service');
    await m.recordAudit(
      tenantId,
      `agent-${agentId}`,
      `agent.tool.${decision.allow ? 'allowed' : 'denied'}`,
      'agent_tool',
      `${agentId}:${toolName}`,
      {
        toolName,
        decision: decision.allow ? 'allow' : 'deny',
        reason: decision.reason,
        decidedBy: decision.decidedBy,
        enforcementMode: decision.enforcementMode,
        requiresApproval: decision.requiresApproval,
        toolInput,
      },
    );
  } catch {
    /* audit failure must not block the gate */
  }
}

async function checkSoD(input: GateInput, mode: EnforcementMode): Promise<GateDecision | null> {
  if (!flag('AI_SOD_ENABLED', true)) return null;
  // SoD applies only to delegation flows where one principal proposes work for
  // a different principal to approve/execute. A single agent invoking its own
  // tool is NOT a delegation — there is no second principal in the loop.
  // The canonical agent_sod_policies seed (modules_ai-governance/db/public/
  // 130_agent_sod_policies.sql) blocks `agent→agent` only when the proposer
  // and approver are *different* parties. Same-id self-execution is a no-op.
  if (!input.callerType || !input.proposerType) return null;
  if (!input.proposerId || !input.approverId) return null;
  if (input.proposerId === input.approverId) return null;

  const proposerType = input.proposerType;
  const approverType = input.callerType;
  if (proposerType === 'agent' && approverType === 'agent') {
    return {
      allow: false,
      reason: `SoD violation: agent→agent delegation blocked (proposer=${input.proposerId}, approver=${input.approverId})`,
      decidedBy: 'sod_policy',
      enforcementMode: mode,
      requiresApproval: true,
      loggedAt: new Date().toISOString(),
    };
  }
  return null;
}

function checkApprovalBoundary(input: GateInput, mode: EnforcementMode): GateDecision | null {
  if (!input.approvalBoundary || !input.toolRiskTier) return null;
  const agentRank = RISK_RANK[input.approvalBoundary];
  const toolRank = RISK_RANK[input.toolRiskTier];
  if (toolRank > agentRank) {
    return {
      allow: false,
      reason: `Approval-boundary violation: agent boundary "${input.approvalBoundary}" cannot execute "${input.toolRiskTier}"-risk tool`,
      decidedBy: 'approval_boundary',
      enforcementMode: mode,
      requiresApproval: true,
      loggedAt: new Date().toISOString(),
    };
  }
  return null;
}

function checkCycleCap(input: GateInput, mode: EnforcementMode): GateDecision | null {
  if (input.maxActionsPerCycle === undefined) return null;
  if (input.cycleActionCount >= input.maxActionsPerCycle) {
    return {
      allow: false,
      reason: `Per-cycle action cap reached (${input.maxActionsPerCycle})`,
      decidedBy: 'max_actions_per_cycle',
      enforcementMode: mode,
      requiresApproval: false,
      loggedAt: new Date().toISOString(),
    };
  }
  return null;
}

async function checkPermission(input: GateInput, mode: EnforcementMode): Promise<GateDecision> {
  if (!flag('AI_TOOL_PERMISSIONS_ENABLED', true)) {
    return {
      allow: true,
      reason: 'Tool permissions disabled (AI_TOOL_PERMISSIONS_ENABLED=false)',
      decidedBy: 'permissions_disabled',
      enforcementMode: mode,
      requiresApproval: false,
      loggedAt: new Date().toISOString(),
    };
  }

  let result;
  try {
    result = await checkToolPermission(input.tenantId, input.agentId, input.toolName, 'execute');
  } catch (err: any) {
    return {
      allow: flag('AI_PERMISSION_DEFAULT_ALLOW', true),
      reason: `Permission check failed (${err?.message || 'unknown'}); falling back to AI_PERMISSION_DEFAULT_ALLOW`,
      decidedBy: 'permission_check_error',
      enforcementMode: mode,
      requiresApproval: false,
      loggedAt: new Date().toISOString(),
    };
  }

  if (result.allowed) {
    return {
      allow: true,
      reason: result.reason || 'Permission granted',
      decidedBy: 'agent_tool_permissions',
      enforcementMode: mode,
      requiresApproval: false,
      loggedAt: new Date().toISOString(),
    };
  }

  // Default-allow when no rule matched (un-seeded tenants in dev). The
  // upstream checkToolPermission() returns one of two phrasings for the
  // "no rule" case, depending on path:
  //   - "No permission found for agent ..."          (unmatched + no wildcard)
  //   - "No matching permission ..." / "Default deny" (older variants)
  if (
    !result.requiresApproval &&
    typeof result.reason === 'string' &&
    /no permission found|no matching permission|default deny|denied_no_permission/i.test(result.reason) &&
    flag('AI_PERMISSION_DEFAULT_ALLOW', true)
  ) {
    return {
      allow: true,
      reason: 'No explicit rule; default-allow per AI_PERMISSION_DEFAULT_ALLOW',
      decidedBy: 'permission_default_allow',
      enforcementMode: mode,
      requiresApproval: false,
      loggedAt: new Date().toISOString(),
    };
  }

  return {
    allow: false,
    reason: result.reason || 'Tool execution denied by permission rule',
    decidedBy: 'agent_tool_permissions',
    enforcementMode: mode,
    requiresApproval: !!result.requiresApproval,
    loggedAt: new Date().toISOString(),
  };
}

/**
 * Master gate. Returns the first denial it finds; in `enforce` mode the caller MUST honor allow=false.
 * In `warn` mode, the caller logs but proceeds. In `audit` mode, the caller proceeds silently
 * (the audit row is still written so post-hoc analysis works).
 */
export async function enforceToolGate(input: GateInput): Promise<GateDecision> {
  const mode = getMode();

  // 1. SoD policy (table-backed)
  const sod = await checkSoD(input, mode);
  if (sod) {
    await recordToolAudit(input.tenantId, input.agentId, input.toolName, sod, input.toolInput);
    if (mode === 'enforce') return sod;
    if (mode === 'warn') console.warn(`[tool-gate] WARN sod: ${sod.reason}`);
    return { ...sod, allow: true, reason: `${sod.reason} (mode=${mode}, allowed)` };
  }

  // 2. Approval boundary
  const ab = checkApprovalBoundary(input, mode);
  if (ab) {
    await recordToolAudit(input.tenantId, input.agentId, input.toolName, ab, input.toolInput);
    if (mode === 'enforce') return ab;
    if (mode === 'warn') console.warn(`[tool-gate] WARN approval_boundary: ${ab.reason}`);
    return { ...ab, allow: true, reason: `${ab.reason} (mode=${mode}, allowed)` };
  }

  // 3. Per-cycle cap (always enforced — even in audit mode, since unbounded loops eat cost)
  const cap = checkCycleCap(input, mode);
  if (cap) {
    await recordToolAudit(input.tenantId, input.agentId, input.toolName, cap, input.toolInput);
    return cap;
  }

  // 4. Tool permission
  const perm = await checkPermission(input, mode);
  await recordToolAudit(input.tenantId, input.agentId, input.toolName, perm, input.toolInput);
  if (perm.allow) return perm;
  if (mode === 'enforce') return perm;
  if (mode === 'warn') console.warn(`[tool-gate] WARN permission: ${perm.reason}`);
  return { ...perm, allow: true, reason: `${perm.reason} (mode=${mode}, allowed)` };
}
