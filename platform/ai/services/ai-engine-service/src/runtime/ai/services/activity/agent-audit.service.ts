// @ts-nocheck
import { logger } from '../../ports/logger.port';
// ============================================
// Agent Audit Service
// Comprehensive audit entries for all agent operations
// Extends the base audit-trail.service.ts with agent-specific
// metadata and structured audit entries
// ============================================

import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { v4 as uuid } from 'uuid';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery } from "@dos/db";

export interface AgentAuditMetadata {
  agentId: string;
  runId?: string;
  correlationId?: string;
  temporalWorkflowId?: string;
  langsmithRunId?: string;
  userProfile?: {
    userId?: string;
    role?: string;
    department?: string;
    orgUnit?: string;
  };
  scopeBoundaries?: {
    features?: string[];
    responsibilityAreas?: string[];
  };
  tenantIsolationVerified?: boolean;
}

export interface ToolCallAudit {
  toolName: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown> | string | number | boolean | null;
  durationMs?: number;
  error?: string;
}

export interface PredictionAudit {
  signalType: string;
  predictedValue?: number;
  confidence?: number;
  actualValue?: number;
  accuracy?: number;
}

export interface ActionAudit {
  actionType: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  result?: 'success' | 'failure';
  error?: string;
}

export interface DecisionAudit {
  reasoning: string;
  alternativesConsidered?: string[];
  chosenAction?: string;
  confidence?: number;
}

export interface HandoffAudit {
  toAgent?: string;
  fromAgent?: string;
  payload: Record<string, unknown>;
  processed?: boolean;
  result?: 'success' | 'failure';
}

export interface MemoryAudit {
  memoryType: 'fact' | 'pattern' | 'lesson' | 'preference';
  content: string;
  importance?: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Record agent run started audit entry
 */
export async function auditAgentRunStarted(
  tenantId: string,
  metadata: AgentAuditMetadata,
  trigger: string,
  contextHash?: string,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.run_started',
      entityType: 'agent_run',
      entityId: metadata.runId || `run_${Date.now()}`,
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        trigger,
        contextHash,
        correlationId: metadata.correlationId,
        temporalWorkflowId: metadata.temporalWorkflowId,
        langsmithRunId: metadata.langsmithRunId,
        userProfile: metadata.userProfile,
        scopeBoundaries: metadata.scopeBoundaries,
        tenantIsolationVerified: metadata.tenantIsolationVerified,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record run_started: ${toErrorMessage(err)}`);
  }
}

/**
 * Record tool call audit entry
 */
export async function auditToolCalled(
  tenantId: string,
  metadata: AgentAuditMetadata,
  toolCall: ToolCallAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.tool_called',
      entityType: 'tool_call',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        toolName: toolCall.toolName,
        params: toolCall.params,
        result: toolCall.result,
        durationMs: toolCall.durationMs,
        error: toolCall.error,
        correlationId: metadata.correlationId,
        langsmithRunId: metadata.langsmithRunId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record tool_called: ${toErrorMessage(err)}`);
  }
}

/**
 * Record prediction made audit entry
 */
export async function auditPredictionMade(
  tenantId: string,
  metadata: AgentAuditMetadata,
  prediction: PredictionAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.prediction_made',
      entityType: 'prediction',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        signalType: prediction.signalType,
        predictedValue: prediction.predictedValue,
        confidence: prediction.confidence,
        actualValue: prediction.actualValue,
        accuracy: prediction.accuracy,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record prediction_made: ${toErrorMessage(err)}`);
  }
}

/**
 * Record action proposed audit entry
 */
export async function auditActionProposed(
  tenantId: string,
  metadata: AgentAuditMetadata,
  action: ActionAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.action_proposed',
      entityType: action.entityType || 'action',
      entityId: action.entityId || uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        actionType: action.actionType,
        entityType: action.entityType,
        entityId: action.entityId,
        payload: action.payload,
        userProfile: metadata.userProfile,
        scopeBoundaries: metadata.scopeBoundaries,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record action_proposed: ${toErrorMessage(err)}`);
  }
}

/**
 * Record action executed audit entry
 */
export async function auditActionExecuted(
  tenantId: string,
  metadata: AgentAuditMetadata,
  action: ActionAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.action_executed',
      entityType: action.entityType || 'action',
      entityId: action.entityId || uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        actionType: action.actionType,
        entityType: action.entityType,
        entityId: action.entityId,
        payload: action.payload,
        result: action.result,
        error: action.error,
        userProfile: metadata.userProfile,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record action_executed: ${toErrorMessage(err)}`);
  }
}

/**
 * Record action verified audit entry
 */
export async function auditActionVerified(
  tenantId: string,
  metadata: AgentAuditMetadata,
  action: ActionAudit,
  verificationResult: boolean,
  evidence?: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.action_verified',
      entityType: action.entityType || 'action',
      entityId: action.entityId || uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        actionType: action.actionType,
        entityType: action.entityType,
        entityId: action.entityId,
        verificationResult,
        evidence,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record action_verified: ${toErrorMessage(err)}`);
  }
}

/**
 * Record decision made audit entry (LLM reasoning)
 */
export async function auditDecisionMade(
  tenantId: string,
  metadata: AgentAuditMetadata,
  decision: DecisionAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.decision_made',
      entityType: 'decision',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        reasoning: decision.reasoning,
        alternativesConsidered: decision.alternativesConsidered,
        chosenAction: decision.chosenAction,
        confidence: decision.confidence,
        langsmithRunId: metadata.langsmithRunId,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record decision_made: ${toErrorMessage(err)}`);
  }
}

/**
 * Record handoff sent audit entry
 */
export async function auditHandoffSent(
  tenantId: string,
  metadata: AgentAuditMetadata,
  handoff: HandoffAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.handoff_sent',
      entityType: 'handoff',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        toAgent: handoff.toAgent,
        payload: handoff.payload,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record handoff_sent: ${toErrorMessage(err)}`);
  }
}

/**
 * Record handoff received audit entry
 */
export async function auditHandoffReceived(
  tenantId: string,
  metadata: AgentAuditMetadata,
  handoff: HandoffAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.handoff_received',
      entityType: 'handoff',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        fromAgent: handoff.fromAgent,
        payload: handoff.payload,
        processed: handoff.processed,
        result: handoff.result,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record handoff_received: ${toErrorMessage(err)}`);
  }
}

/**
 * Record memory committed audit entry
 */
export async function auditMemoryCommitted(
  tenantId: string,
  metadata: AgentAuditMetadata,
  memory: MemoryAudit,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: `agent-${metadata.agentId}`,
      module: 'agent_runner',
      action: 'agent.memory_committed',
      entityType: 'memory',
      entityId: uuid(),
      afterState: {
        agentId: metadata.agentId,
        runId: metadata.runId,
        memoryType: memory.memoryType,
        content: memory.content,
        importance: memory.importance,
        relatedEntityType: memory.relatedEntityType,
        relatedEntityId: memory.relatedEntityId,
        correlationId: metadata.correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    logger.warn(`[AgentAudit] Failed to record memory_committed: ${toErrorMessage(err)}`);
  }
}

/**
 * Helper to create metadata object from state
 */
export function createAuditMetadata(
  tenantId: string,
  agentId: string,
  runId?: string,
  state?: {
    correlationId?: string;
    temporalWorkflowId?: string;
    langsmithRunId?: string;
    userProfile?: AgentAuditMetadata['userProfile'];
    scopeBoundaries?: AgentAuditMetadata['scopeBoundaries'];
    tenantIsolationVerified?: boolean;
  },
): AgentAuditMetadata {
  return {
    agentId,
    runId,
    correlationId: state?.correlationId,
    temporalWorkflowId: state?.temporalWorkflowId,
    langsmithRunId: state?.langsmithRunId,
    userProfile: state?.userProfile
      ? {
          userId: state.userProfile.userId,
          role: state.userProfile.role,
          department: state.userProfile.department,
          orgUnit: state.userProfile.orgUnit,
        }
      : undefined,
    scopeBoundaries: state?.scopeBoundaries
      ? {
          features: state.scopeBoundaries.features,
          responsibilityAreas: state.scopeBoundaries.responsibilityAreas,
        }
      : undefined,
    tenantIsolationVerified: state?.tenantIsolationVerified,
  };
}
