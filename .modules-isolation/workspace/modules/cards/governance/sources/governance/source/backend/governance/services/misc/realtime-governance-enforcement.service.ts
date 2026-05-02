import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Real-Time Governance Policy Enforcement Service
// Proactive governance checks before agent actions:
// - Policy rule evaluation
// - Risk appetite validation
// - Authority matrix checks
// Called before tool execution to prevent policy violations
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

import { executeRule, type PolicyRule } from '../../../policy/services/policy/policy-code.service';
import { checkRiskAgainstAppetite, getConstitution as _getConstitution } from '../governance/governance-constitution.service';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { ToolGovernanceMeta } from '../../../../ai/tools/tool-base';
import { getFirstRow } from '@dos/db';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface GovernanceEnforcementResult {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
  approverRole?: string;

  triggeredPolicies: Array<{ policyId: string; ruleId: string; ruleName: string; action: PolicyRule['action'] }>;
  riskCheck?: { withinAppetite: boolean; maxAllowed: number; requiredRole: string | null };
  authorityCheck?: { requiredRole: string; timeoutHours: number } | null;
  metadata?: Record<string, unknown>;
}

export interface AgentActionContext {
  tenantId: string;
  userId?: string;
  agentId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  governance: ToolGovernanceMeta;
  actionType: 'read' | 'write' | 'delete' | 'manage' | 'approve';
  estimatedRiskScore?: number;
  riskCategory?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Build tenant context for policy rule evaluation.
 * Includes current state of controls, risks, compliance, etc.
 */
async function buildTenantContext(tenantId: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  
  try {
    // Get key metrics for policy evaluation
    const [controls, risks, compliance, evidence] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS total, 
                        COUNT(*) FILTER (WHERE status = 'implemented')::int AS implemented
                 FROM "${schema}".tenant_controls`),
      safeQuery(`SELECT COUNT(*)::int AS total,
                        AVG(residual_score)::numeric AS avg_residual_score
                 FROM "${schema}".risks WHERE status != 'closed'`),
      safeQuery(`SELECT COUNT(*)::int AS open_gaps
                 FROM "${schema}".compliance_gaps WHERE status != 'resolved'`),
      safeQuery(`SELECT COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE valid_until < NOW())::int AS expired
                 FROM "${schema}".evidence`),
    ]);
    
    return {
      controls: {
        total: getFirstRow(controls)?.total || 0,
        implemented: getFirstRow(controls)?.implemented || 0,
      },
      risks: {
        total: getFirstRow(risks)?.total || 0,
        avgResidualScore: Number(getFirstRow(risks)?.avg_residual_score) || 0,
      },
      compliance: {
        openGaps: getFirstRow(compliance)?.open_gaps || 0,
      },
      evidence: {
        total: getFirstRow(evidence)?.total || 0,
        expired: getFirstRow(evidence)?.expired || 0,
      },
    };
  } catch (err) {
    logger.warn('[realtime-governance] Failed to build tenant context:', (err as Error).message);
    return {};
  }
}

/**
 * Evaluate all active policy rules against the action context.
 * Returns triggered policies that would block or require approval.
 */
async function evaluatePolicyRules(
  tenantId: string,
  context: AgentActionContext,
  tenantState: Record<string, unknown>

): Promise<Array<{ policyId: string; ruleId: string; ruleName: string; action: PolicyRule['action'] }>> {
  const schema = tenantSchema(tenantId);

  const triggered: Array<{ policyId: string; ruleId: string; ruleName: string; action: PolicyRule['action'] }> = [];
  
  try {
    // Get all active policies with rules
    const policiesResult = await safeQuery(
      `SELECT policy_id, policy_code_rules FROM "${schema}".policies
       WHERE policy_code_rules IS NOT NULL 
         AND status = 'approved' 
         AND deleted_at IS NULL`
    );
    
    // Build evaluation context (merge tenant state with action context)
    const evalContext = {
      ...tenantState,
      action: {
        toolName: context.toolName,
        actionType: context.actionType,
        agentId: context.agentId,
        userId: context.userId,
        args: context.toolArgs,
      },
      governance: {
        module: context.governance.module,
        sideEffectLevel: context.governance.sideEffectLevel,
        requiresApproval: context.governance.requiresApproval,
      },
    };
    
    // Evaluate each policy's rules
    for (const policy of policiesResult.rows) {
      const rules = Array.isArray(policy.policy_code_rules)
        ? policy.policy_code_rules
        : JSON.parse(policy.policy_code_rules || '[]');
      
      for (const rule of rules) {
        const result = (executeRule as any)(rule, evalContext);
        if (result.triggered && result.action) {
          // Only include blocking or approval-requiring actions
          if (result.action.type === 'block' || result.action.type === 'require_approval') {
            triggered.push({
              policyId: policy.policy_id,
              ruleId: rule.id,
              ruleName: rule.name,
              action: result.action,
            });
          }
        }
      }
    }
  } catch (err) {
    logger.warn('[realtime-governance] Policy evaluation failed:', (err as Error).message);
  }
  
  return triggered;
}

/**
 * Check risk appetite for the action.
 * Uses estimated risk score if provided, otherwise infers from action type.
 */
async function checkRiskAppetite(
  tenantId: string,
  context: AgentActionContext
): Promise<{ withinAppetite: boolean; maxAllowed: number; requiredRole: string | null }> {
  const category = context.riskCategory || 'operational';
  const riskScore = context.estimatedRiskScore ?? 
    (context.actionType === 'delete' ? 60 :
     context.actionType === 'manage' ? 40 :
     context.actionType === 'write' ? 30 : 10);
  
  return await checkRiskAgainstAppetite(tenantId, category, riskScore);
}

/**
 * Check authority matrix for approval requirements.
 * Determines if the action requires approval based on decision type and criticality.
 */
async function checkAuthorityMatrix(
  tenantId: string,
  context: AgentActionContext
): Promise<{ requiredRole: string; timeoutHours: number } | null> {
  const actionCode = `governance.${context.actionType}`;
  try {
    const { getRequiredApprovers } = await import('../../../../platform/dauth/authority/approval-matrix.service.js');
    const approvers = await getRequiredApprovers(tenantId, actionCode, 'governance');
    if (approvers.length === 0) return null;
    return {
      requiredRole: approvers[0].authorityCode,
      timeoutHours: 24,
    };
  } catch {
    return null;
  }
}

/**
 * Main entry point: enforce governance policies before agent action.
 * Returns comprehensive enforcement result with all checks.
 */
export async function enforceGovernanceBeforeAction(
  context: AgentActionContext
): Promise<GovernanceEnforcementResult> {
  const { tenantId, userId, agentId, toolName } = context;
  
  // Build tenant state for policy evaluation
  const tenantState = await buildTenantContext(tenantId);
  
  // ── 1. Policy Rule Evaluation ───────────────────────────────────────────────
  const triggeredPolicies = await evaluatePolicyRules(tenantId, context, tenantState);
  
  // Check if any policy blocks the action
  const blockingPolicy = triggeredPolicies.find(p => p.action.type === 'block');
  if (blockingPolicy) {
    // Record audit and event
    await recordAudit({
      tenantId,
      userId: userId || SYSTEM_JOB_ACTOR,
      module: 'governance',
      action: 'block',
      entityType: 'agent_action',
      entityId: `${agentId}:${toolName}`,
      beforeState: { toolName, toolArgs: context.toolArgs },
      afterState: { blocked: true, reason: blockingPolicy.action.message },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'governance.action_blocked',
          tenantId,
          sourceService: 'realtime-governance-enforcement',
          entityType: 'agent_action',
          entityId: `${agentId}:${toolName}`,
          severity: (blockingPolicy.action.severity === 'critical' ? 'critical' : blockingPolicy.action.severity === 'high' ? 'warning' : 'info') as 'warning' | 'info' | 'critical',
          payload: {
            policyId: blockingPolicy.policyId,
            ruleId: blockingPolicy.ruleId,
            reason: blockingPolicy.action.message,
          },
        } as any)), { tenantId, operation: 'eventBus:governance.action_blocked' });
    
    return {
      allowed: false,
      reason: `Policy rule "${blockingPolicy.ruleName}" blocked action: ${blockingPolicy.action.message}`,
      requiresApproval: false,
      triggeredPolicies,
      metadata: { blockingPolicyId: blockingPolicy.policyId, blockingRuleId: blockingPolicy.ruleId },
    };
  }
  
  // ── 2. Risk Appetite Check ──────────────────────────────────────────────────
  const riskCheck = await checkRiskAppetite(tenantId, context);
  
  if (!riskCheck.withinAppetite) {
    // Risk exceeds appetite - requires approval
    await recordAudit({
      tenantId,
      userId: userId || SYSTEM_JOB_ACTOR,
      module: 'governance',
      action: 'risk_check',
      entityType: 'agent_action',
      entityId: `${agentId}:${toolName}`,
      beforeState: { estimatedRisk: context.estimatedRiskScore },
      afterState: { withinAppetite: false, maxAllowed: riskCheck.maxAllowed },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    
    return {
      allowed: true, // Allow but require approval
      requiresApproval: true,
      approverRole: riskCheck.requiredRole || undefined,
      triggeredPolicies,
      riskCheck,
      metadata: {
        riskCategory: context.riskCategory || 'operational',
        estimatedRisk: context.estimatedRiskScore,
        maxAllowed: riskCheck.maxAllowed,
      },
    };
  }
  
  // ── 3. Authority Matrix Check ───────────────────────────────────────────────
  const authorityCheck = await checkAuthorityMatrix(tenantId, context);
  
  if (authorityCheck) {
    // Authority matrix requires approval
    await recordAudit({
      tenantId,
      userId: userId || SYSTEM_JOB_ACTOR,
      module: 'governance',
      action: 'authority_check',
      entityType: 'agent_action',
      entityId: `${agentId}:${toolName}`,
      beforeState: { actionType: context.actionType, criticality: context.criticality },
      afterState: { requiresApproval: true, approverRole: authorityCheck.requiredRole },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    
    return {
      allowed: true, // Allow but require approval
      requiresApproval: true,
      approverRole: authorityCheck.requiredRole,
      triggeredPolicies,
      riskCheck,
      authorityCheck,
      metadata: {
        decisionType: context.actionType,
        criticality: context.criticality,
        timeoutHours: authorityCheck.timeoutHours,
      },
    };
  }
  
  // ── 4. Check if any policy requires approval (but doesn't block) ──────────────
  const approvalPolicy = triggeredPolicies.find(p => p.action.type === 'require_approval');
  if (approvalPolicy) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Policy rule "${approvalPolicy.ruleName}" requires approval: ${approvalPolicy.action.message}`,
      triggeredPolicies,
      riskCheck,
      metadata: { approvalPolicyId: approvalPolicy.policyId, approvalRuleId: approvalPolicy.ruleId },
    };
  }
  
  // ── All checks passed ───────────────────────────────────────────────────────
  return {
    allowed: true,
    requiresApproval: false,
    triggeredPolicies,
    riskCheck,
    authorityCheck: null,
  };
}

/**
 * Quick check: determine if action is allowed without full evaluation.
 * Used for fast-path decisions when full governance check is expensive.
 */
export async function quickGovernanceCheck(
  tenantId: string,
  toolName: string,
  actionType: 'read' | 'write' | 'delete' | 'manage' | 'approve',
  governance: ToolGovernanceMeta
): Promise<{ allowed: boolean; reason?: string }> {
  // Quick checks that don't require DB queries:
  // - Destructive actions always require approval
  if (governance.sideEffectLevel === 'destructive' && actionType !== 'read') {
    return { allowed: false, reason: 'Destructive actions require explicit approval' };
  }
  
  // - Explicit approval flag
  if (governance.requiresApproval) {
    return { allowed: true, reason: 'Action requires approval per tool governance' };
  }
  
  // - Read-only actions are generally safe
  if (actionType === 'read' && governance.sideEffectLevel === 'read') {
    return { allowed: true };
  }
  
  // For everything else, need full evaluation
  return { allowed: true };
}
