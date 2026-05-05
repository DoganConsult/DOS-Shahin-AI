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
/**
 * Record agent run started audit entry
 */
export async function auditAgentRunStarted(tenantId, metadata, trigger, contextHash) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record run_started: ${toErrorMessage(err)}`);
    }
}
/**
 * Record tool call audit entry
 */
export async function auditToolCalled(tenantId, metadata, toolCall) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record tool_called: ${toErrorMessage(err)}`);
    }
}
/**
 * Record prediction made audit entry
 */
export async function auditPredictionMade(tenantId, metadata, prediction) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record prediction_made: ${toErrorMessage(err)}`);
    }
}
/**
 * Record action proposed audit entry
 */
export async function auditActionProposed(tenantId, metadata, action) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record action_proposed: ${toErrorMessage(err)}`);
    }
}
/**
 * Record action executed audit entry
 */
export async function auditActionExecuted(tenantId, metadata, action) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record action_executed: ${toErrorMessage(err)}`);
    }
}
/**
 * Record action verified audit entry
 */
export async function auditActionVerified(tenantId, metadata, action, verificationResult, evidence) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record action_verified: ${toErrorMessage(err)}`);
    }
}
/**
 * Record decision made audit entry (LLM reasoning)
 */
export async function auditDecisionMade(tenantId, metadata, decision) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record decision_made: ${toErrorMessage(err)}`);
    }
}
/**
 * Record handoff sent audit entry
 */
export async function auditHandoffSent(tenantId, metadata, handoff) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record handoff_sent: ${toErrorMessage(err)}`);
    }
}
/**
 * Record handoff received audit entry
 */
export async function auditHandoffReceived(tenantId, metadata, handoff) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record handoff_received: ${toErrorMessage(err)}`);
    }
}
/**
 * Record memory committed audit entry
 */
export async function auditMemoryCommitted(tenantId, metadata, memory) {
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
    }
    catch (err) {
        logger.warn(`[AgentAudit] Failed to record memory_committed: ${toErrorMessage(err)}`);
    }
}
/**
 * Helper to create metadata object from state
 */
export function createAuditMetadata(tenantId, agentId, runId, state) {
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
//# sourceMappingURL=agent-audit.service.js.map