import { safeQuery as _safeQuery, tenantSchema as _tenantSchema } from '../../ports/database.port';
import { MODULE_WORKFLOW_MAP, type CanonicalModuleCode as _CanonicalModuleCode, isCanonicalModuleCode } from '../../ports/config.port';
import { logger } from '../../ports/logger.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import {
  getAgentForModule,
  getModuleSLAConfig,
  runAIGateChecks,
  resolveModuleAIPolicy,
  getModuleWorkflowHealth,
  type AIGateCheckResult,
  type ModuleAIPolicyResult,
  type ModuleWorkflowHealthResult,
} from '../chains/module-workflow-integration.service';
import { createAINote, type NoteType, type TrustLevel } from './workflow-ai-notes.service';
import { createDraftAction, type DraftType } from '../approvals/workflow-draft-actions.service';
import { logIntervention as _logIntervention } from '../ops/workflow-kill-switch.service';
import { recordExecution } from './workflow-ai-budget.service';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface ModuleAIContext {
  tenantId: string;
  userId: string;
  moduleCode: string;
  entityType: string;
  entityId?: string;
  instanceId?: string;
  stepId?: string;
  workflowId?: string;
}

export interface AIOperationResult {
  allowed: boolean;
  gateResult: AIGateCheckResult;
  policy: ModuleAIPolicyResult;
  agentId: string | null;
}

export async function preflightAIOperation(
  ctx: ModuleAIContext,
  stepType: string,
): Promise<AIOperationResult> {
  const agentId = getAgentForModule(ctx.moduleCode);
  const policy = await resolveModuleAIPolicy(ctx.tenantId, ctx.moduleCode);

  if (!policy.aiEnabled) {
    return {
      allowed: false,
      gateResult: {
        allowed: false, killSwitchBlocked: false, budgetExhausted: false,
        boundaryViolation: false, autonomyDenied: false, reviewRequired: true,
        reasons: ['AI disabled for module'], maxAutonomyLevel: 0, allowedActions: [],
      },
      policy,
      agentId,
    };
  }

  const gateResult = await runAIGateChecks(
    { tenantId: ctx.tenantId, moduleCode: ctx.moduleCode, userId: ctx.userId, workflowId: ctx.workflowId, instanceId: ctx.instanceId, stepId: ctx.stepId, entityType: ctx.entityType, entityId: ctx.entityId },
    stepType,
  );

  return { allowed: gateResult.allowed, gateResult, policy, agentId };
}

export async function emitModuleEvent(
  ctx: ModuleAIContext,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await (emitWorkflowEvent as any)({
      tenantId: ctx.tenantId,
      instanceId: ctx.instanceId,
      eventType: `module.${ctx.moduleCode}.${eventType}` as any,
      triggeredBy: ctx.userId,
      payload: { ...payload, moduleCode: ctx.moduleCode, entityType: ctx.entityType, entityId: ctx.entityId },
      previousState: payload.previousState ?? 'active',
      newState: payload.newState ?? 'active',
    });
  } catch (err) {
    logger.warn(`[ModuleAI] Failed to emit event for ${ctx.moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function recordModuleAudit(
  ctx: ModuleAIContext,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAudit({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      module: ctx.moduleCode,
      action,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      afterState: details,
    });
  } catch (err) {
    logger.warn(`[ModuleAI] Audit record failed for ${ctx.moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function createModuleNote(
  ctx: ModuleAIContext,
  stepType: string,
  input: {
    noteType: NoteType;
    content: Record<string, unknown>;
    confidence?: number;
    trustLevel?: TrustLevel;
    contextSources?: string[];
  },
): Promise<{ noteId: string; reviewRequired: boolean } | null> {
  const preflight = await preflightAIOperation(ctx, stepType);
  if (!preflight.allowed || !preflight.agentId) return null;

  try {
    const note = await createAINote(ctx.tenantId, {
      instanceId: ctx.instanceId ?? '00000000-0000-0000-0000-000000000000',
      stepId: ctx.stepId,
      agentId: preflight.agentId,
      noteType: input.noteType,
      content: { ...input.content, moduleCode: ctx.moduleCode, entityType: ctx.entityType, entityId: ctx.entityId },
      confidence: input.confidence,
      trustLevel: input.trustLevel,
      contextSources: input.contextSources,
    });

    await recordExecution(ctx.tenantId, 1).catch(catchHandler(EC.EVENT_BUS));

    return { noteId: note.note_id, reviewRequired: preflight.gateResult.reviewRequired };
  } catch (err) {
    logger.warn(`[ModuleAI] Note creation failed for ${ctx.moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function createModuleDraft(
  ctx: ModuleAIContext,
  stepType: string,
  input: {
    draftType: DraftType;
    title: string;
    draftContent: Record<string, unknown>;
    confidence?: number;
  },
): Promise<{ draftId: string; status: string } | null> {
  const preflight = await preflightAIOperation(ctx, stepType);
  if (!preflight.allowed || !preflight.agentId) return null;

  try {
    const draft = await createDraftAction(ctx.tenantId, {
      instanceId: ctx.instanceId ?? '00000000-0000-0000-0000-000000000000',
      stepId: ctx.stepId,
      agentId: preflight.agentId,
      draftType: input.draftType,
      title: input.title,
      draftContent: { ...input.draftContent, moduleCode: ctx.moduleCode, entityType: ctx.entityType, entityId: ctx.entityId },
      confidence: input.confidence,
    });

    await recordExecution(ctx.tenantId, 1).catch(catchHandler(EC.EVENT_BUS));

    return { draftId: draft.draft_id, status: draft.status };
  } catch (err) {
    logger.warn(`[ModuleAI] Draft creation failed for ${ctx.moduleCode}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function getModuleAIStatus(
  tenantId: string,
  moduleCode: string,
): Promise<{ health: ModuleWorkflowHealthResult; policy: ModuleAIPolicyResult; agentId: string | null; sla: ReturnType<typeof getModuleSLAConfig> }> {
  const [health, policy] = await Promise.all([
    getModuleWorkflowHealth(tenantId, moduleCode),
    resolveModuleAIPolicy(tenantId, moduleCode),
  ]);
  return {
    health,
    policy,
    agentId: getAgentForModule(moduleCode),
    sla: getModuleSLAConfig(moduleCode),
  };
}

export async function onModuleEntityCreate(
  ctx: ModuleAIContext,
  entityData: Record<string, unknown>,
): Promise<void> {
  await Promise.all([
    recordModuleAudit(ctx, 'create', entityData),
    emitModuleEvent(ctx, 'entity_created', { entityData, newState: 'created' }),
  ]);
}

export async function onModuleEntityUpdate(
  ctx: ModuleAIContext,
  changes: Record<string, unknown>,
  previousState?: Record<string, unknown>,
): Promise<void> {
  await Promise.all([
    recordModuleAudit(ctx, 'update', changes),
    emitModuleEvent(ctx, 'entity_updated', { changes, previousState, newState: 'updated' }),
  ]);
}

export async function onModuleEntityDelete(
  ctx: ModuleAIContext,
): Promise<void> {
  await Promise.all([
    recordModuleAudit(ctx, 'delete'),
    emitModuleEvent(ctx, 'entity_deleted', { newState: 'deleted' }),
  ]);
}

export async function onModuleStatusChange(
  ctx: ModuleAIContext,
  previousStatus: string,
  newStatus: string,
  reason?: string,
): Promise<void> {
  await Promise.all([
    recordModuleAudit(ctx, 'status_change', { previousStatus, newStatus, reason }),
    emitModuleEvent(ctx, 'status_changed', { previousState: previousStatus, newState: newStatus, reason }),
  ]);
}

export async function suggestAIAction(
  ctx: ModuleAIContext,
  stepType: string,
  actionDescription: string,
  confidence: number,
): Promise<{ noteId: string; reviewRequired: boolean } | null> {
  return createModuleNote(ctx, stepType, {
    noteType: 'recommendation',
    content: { action: actionDescription, module: ctx.moduleCode },
    confidence,
    trustLevel: confidence >= 0.9 ? 'authoritative' : confidence >= 0.7 ? 'advisory' : 'assistive',
  });
}

export interface ModuleAICapabilities {
  moduleCode: string;
  aiEnabled: boolean;
  agentId: string | null;
  automationLevel: string | null;
  tier: string;
  maxAutonomyLevel: number;
  supportedOperations: string[];
}

export function getModuleAICapabilities(moduleCode: string): ModuleAICapabilities {
  if (!isCanonicalModuleCode(moduleCode)) {
    return { moduleCode, aiEnabled: false, agentId: null, automationLevel: null, tier: 'unknown', maxAutonomyLevel: 0, supportedOperations: [] };
  }

  const agentId = getAgentForModule(moduleCode);

  const supportedOps: string[] = ['audit_trail', 'event_emission'];
  const tier = 'product';
  const aiEnabled = !!agentId;
  const automationLevel = aiEnabled ? 'semi' : 'manual';
  const maxAutonomyLevel = aiEnabled ? 2 : 0;
  supportedOps.push('ai_gate_check', 'health_monitor', 'sla_enforcement');
  if (aiEnabled) {
    supportedOps.push('ai_notes', 'ai_drafts', 'ai_recommendations', 'budget_tracking');
  }

  return {
    moduleCode,
    aiEnabled,
    agentId,
    automationLevel,
    tier,
    maxAutonomyLevel,
    supportedOperations: supportedOps,
  };
}

export function getAllModuleAICapabilities(): ModuleAICapabilities[] {
  const operational = ['risk','compliance','policy','evidence','audit','incident',
    'exception','governance','vendor','bcp','asset','remediation','action',
    'training','qiyas','ai-governance'];
  return operational.map(getModuleAICapabilities);
}
