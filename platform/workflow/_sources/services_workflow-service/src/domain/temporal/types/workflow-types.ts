import { defineSignal, defineQuery } from '@temporalio/workflow';

// ── Provisioning ───────────────────────────────────────────────────────────
export interface ProvisioningInput { jobId: string; sessionId: string; userId: string; }
export interface ProvisioningResult { tenantId: string; workspaceId: string; schemaName: string; stepsCompleted: number; totalSteps: number; }
export interface ProvisioningProgress { currentStep: string; completedSteps: number; totalSteps: number; percentComplete: number; }

export const cancelProvisioningSignal = defineSignal('cancelProvisioning');
export const skipStepSignal = defineSignal<[string]>('skipStep');
export const pauseProvisioningSignal = defineSignal('pauseProvisioning');
export const resumeProvisioningSignal = defineSignal('resumeProvisioning');
export const getProgressQuery = defineQuery<ProvisioningProgress>('getProgress');

// ── Agent Cycle ────────────────────────────────────────────────────────────
export interface AgentCycleInput { tenantId: string; triggerType: 'scheduled' | 'event_driven' | 'manual'; specificAgentIds?: string[]; platformMode?: string; }
export interface AgentCycleResult { cycleId: string; tenantId: string; waveCount: number; totalAgentsRun: number; totalDiscoveries: number; totalCorrelations: number; durationMs: number; }

// ── Governance AI Pipeline ─────────────────────────────────────────────────
export interface GovernanceAiInput { tenantId: string; runId?: string; }
export interface GovernanceAiResult { tenantId: string; runId: string; signalsCreated: number; issuesInterpreted: number; recommendationsGenerated: number; escalationsCreated: number; healthScore: number; narrative: string; durationMs: number; }

// ── Periodic Job Dispatcher ────────────────────────────────────────────────
export interface PeriodicJobInput { jobName: string; }
export interface PeriodicJobResult { jobName: string; tenantsProcessed: number; errors: number; durationMs: number; }

// ── CCM Cycle ──────────────────────────────────────────────────────────────
export interface CcmCycleInput { tenantId: string; }
export interface CcmCycleResult { tenantId: string; controlsChecked: number; failuresDetected: number; durationMs: number; }

// ── SLA Timer ──────────────────────────────────────────────────────────────
export interface SlaTimerInput { tenantId: string; taskId: string; assignedUserId: string; teamId: string; slaHours: number; }
export interface SlaTimerResult { taskId: string; outcome: 'completed' | 'warned' | 'breached' | 'escalated'; }
export const taskCompletedSignal = defineSignal('taskCompleted');

// ── Evidence Lifecycle ──────────────────────────────────────────────────────
export interface EvidenceLifecycleInput { tenantId: string; controlId: string; scheduleId: string; assignedUserId: string; controlName: string; slaHours: number; cycleCount?: number; }
export interface EvidenceCycleResult { tenantId: string; controlId: string; outcome: 'submitted' | 'expired' | 'overdue_escalated'; cycleCount: number; }
export const evidenceSubmittedSignal = defineSignal('evidenceSubmitted');

// ── Shared ─────────────────────────────────────────────────────────────────
export interface TenantJobActivity { tenantId: string; jobName: string; durationMs: number; success: boolean; error?: string; }
