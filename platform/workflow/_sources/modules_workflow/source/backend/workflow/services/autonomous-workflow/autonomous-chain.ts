// ============================================================
// Shahin — Autonomous Workflow: Autonomous Chain Execution
// Multi-step autonomous chain with step-by-step governance
// validation. Each step is validated against governance rules
// before proceeding to the next.
// ============================================================

import { tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { getConstitution, resolveApprover, checkRiskAgainstAppetite } from '../../../governance/services/governance/governance-constitution.service';
import { toErrorMessage } from '@dos/module-sdk';
import type { AIStepExecution, AIStepTriggerReason } from "@dos/types";

import { calculateConfidence, AUTONOMY_CONFIDENCE_THRESHOLDS } from "./confidence-decision";
import { getAutonomousConfig } from "./config-state";
import { executeStepWithAgent } from "./agent-execution";
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
import { safeQuery } from "@dos/db";

/** Describes a single step in an autonomous chain. */
export interface AutonomousChainStep {
  stepId: string;
  stepType: string;
  stepSubType: string;
  action: string; // Description of the action to be taken
  expectedOutcome: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
}

/** Result of executing a full autonomous chain. */
export interface AutonomousChainResult {
  chainId: string;
  tenantId: string;
  workflowExecutionId: string;
  steps: Array<{
    stepId: string;
    status: 'pending' | 'validated' | 'executed' | 'blocked' | 'failed';
    confidence: number;
    governanceCheck: {
      passed: boolean;
      reason?: string;
      approverRequired?: string;
    };
    executionResult?: AIStepExecution;
    error?: string;
  }>;
  overallStatus: 'in_progress' | 'completed' | 'blocked' | 'failed';
  completedAt?: string;
}

/**
 * Execute a multi-step autonomous chain with step-by-step governance validation.
 * Each step is validated against governance rules before proceeding to the next.
 */
export async function executeAutonomousChain(
  tenantId: string,
  workflowExecutionId: string,
  chainSteps: AutonomousChainStep[],
  triggerReason: AIStepTriggerReason
): Promise<AutonomousChainResult> {
  const _schema = tenantSchema(tenantId);
  const config = await getAutonomousConfig(tenantId);
  const _constitution = await getConstitution(tenantId);

  const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const results: AutonomousChainResult['steps'] = [];

  let overallStatus: AutonomousChainResult['overallStatus'] = 'in_progress';

  for (let i = 0; i < chainSteps.length; i++) {
    const step = chainSteps[i];

    // Step 1: Calculate confidence for this step
    const confidence = await calculateConfidence(
      tenantId,
      step.stepType,
      step.stepSubType,
      { workflowExecutionId, chainId, stepIndex: i }
    );

    // Step 2: Governance validation before execution
    let governanceCheck = {
      passed: true,
      reason: 'Governance check passed',
      approverRequired: undefined as string | undefined,
    };

    // Check risk appetite if risk level is specified
    if (step.riskLevel) {
      const riskScore = step.riskLevel === 'high' ? 0.8 : step.riskLevel === 'medium' ? 0.5 : 0.2;
      const riskCheck = await checkRiskAgainstAppetite(tenantId, 'operational', riskScore);
      if (!riskCheck.withinAppetite) {
        governanceCheck = {
          passed: false,
          reason: `Risk score ${riskScore} exceeds appetite (max: ${riskCheck.maxAllowed}) for operational category`,
          approverRequired: undefined,
        };
      }
    }

    // Check if approval is required based on authority matrix
    if (step.requiresApproval || step.stepType === 'approval' || step.stepType === 'governance') {
      const approver = await resolveApprover(tenantId, step.stepType, step.riskLevel || 'medium');
      if (approver) {
        const approverStr = approver.requiredRole;
        // For autonomy levels < 4, require human approval
        if ((config as any).autonomyLevel < 4) {
          governanceCheck = {
            passed: false,
            reason: 'Approval required per authority matrix',
            approverRequired: approverStr,
          };
        } else {
          // For high autonomy, log but allow to proceed
          governanceCheck.approverRequired = approverStr;
        }
      }
    }

    // Step 3: Check confidence threshold
    const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
    if (confidence < threshold) {
      governanceCheck = {
        passed: false,
        reason: `Confidence ${confidence.toFixed(2)} below threshold ${threshold.toFixed(2)} for autonomy level ${config.autonomyLevel}`,
        approverRequired: undefined,
      };
    }

    // Step 4: Execute step if governance check passed
    let executionResult: AIStepExecution | undefined;
    let stepStatus: AutonomousChainResult['steps'][0]['status'] = 'pending';
    let error: string | undefined;

    if (governanceCheck.passed) {
      try {
        executionResult = await executeStepWithAgent(
          tenantId,
          workflowExecutionId,
          step.stepId,
          step.stepSubType,
          step.stepType,
          triggerReason,
          {
            chainId,
            stepIndex: i,
            action: step.action,
            expectedOutcome: step.expectedOutcome,
          }
        );
        stepStatus = executionResult.status === 'failed' ? 'failed' : 'executed';
      } catch (err: unknown) {
        stepStatus = 'failed';
        error = toErrorMessage(err) || 'Execution failed';
      }
    } else {
      stepStatus = 'blocked';
      overallStatus = 'blocked';
    }

    results.push({
      stepId: step.stepId,
      status: stepStatus,
      confidence,
      governanceCheck,
      executionResult,
      error,
    });

    // If step was blocked or failed, stop the chain
    if (stepStatus === 'blocked' || stepStatus === 'failed') {
      break;
    }

    // Log step completion
    await recordAudit({
      tenantId,

      userId: executionResult?.agentUserId || SYSTEM_JOB_ACTOR,
      module: 'autonomous_workflow',
      action: stepStatus === 'executed' ? 'execute' : stepStatus,
      entityType: 'autonomous_chain_step',
      entityId: step.stepId,
      afterState: {
        chainId,
        stepIndex: i,
        status: stepStatus,
        confidence,
        governanceCheck,
      },
    });
  }

  // Determine final status
  if (overallStatus === 'in_progress') {
    const allExecuted = results.every(r => r.status === 'executed');
    const anyFailed = results.some(r => r.status === 'failed');
    overallStatus = anyFailed ? 'failed' : allExecuted ? 'completed' : 'in_progress';
  }

  const chainResult: AutonomousChainResult = {
    chainId,
    tenantId,
    workflowExecutionId,
    steps: results,
    overallStatus,
    completedAt: overallStatus !== 'in_progress' ? new Date().toISOString() : undefined,
  };

  // Log chain completion
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'autonomous_workflow',
    action: 'complete_chain',
    entityType: 'autonomous_chain',
    entityId: chainId,
    afterState: {
      workflowExecutionId,
      stepCount: chainSteps.length,
      executedCount: results.filter(r => r.status === 'executed').length,
      blockedCount: results.filter(r => r.status === 'blocked').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      overallStatus,
    },
  });

  return chainResult;
}
