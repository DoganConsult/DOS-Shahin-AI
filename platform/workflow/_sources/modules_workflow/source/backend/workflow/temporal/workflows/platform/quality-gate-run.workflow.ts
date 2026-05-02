// ============================================
// Quality Gate Run Workflow — Temporal
// Orchestrates 7-stage quality gate evaluation per-tenant.
// Supports cancellation, progress queries, and early-fail.
// ============================================

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
} from '@temporalio/workflow';
import type {
  QualityGateActivities,
  QualityGateStageResult,
  QualityGateRunOutput
} from '../../activities/quality-gate.activities';

// Activity proxies — standard timeout for fast stages
const acts = proxyActivities<QualityGateActivities>({
  startToCloseTimeout: '10m',
  retry: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: '30s',
    nonRetryableErrorTypes: ['VALIDATION_ERROR'],
  },
});

// Long-running activities — for AI guardrails, E2E, load tests, mutation
const longActs = proxyActivities<QualityGateActivities>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 2,
    maximumInterval: '60s',
  },
});

// ── Signals & Queries ──

export const cancelQualityGateSignal = defineSignal('cancelQualityGate');

export interface QualityGateProgress {
  currentStage: string;
  cancelled: boolean;
  stagesCompleted: number;
  stagesTotal: number;
}

export const qualityGateProgressQuery = defineQuery<QualityGateProgress>('qualityGateProgress');

// ── Input / Output Types ──

export interface QualityGateRunInput {
  tenantId: string;
  runId: string;
  commitSha?: string;
  baseUrl?: string;
  stages: string[];
  thresholds: Record<string, Record<string, number>>;
}

// (Removed StageResultWf and QualityGateRunOutput interfaces, importing from activities)
// ── Workflow ──

export async function qualityGateRunWorkflow(input: QualityGateRunInput): Promise<QualityGateRunOutput> {
  let cancelled = false;
  let currentStage = 'initializing';
  let stagesCompleted = 0;
  const results: QualityGateStageResult[] = [];

  setHandler(cancelQualityGateSignal, () => { cancelled = true; });
  setHandler(qualityGateProgressQuery, () => ({
    currentStage,
    cancelled,
    stagesCompleted,
    stagesTotal: input.stages.length,
  }));

  await acts.markRunStarted(input.tenantId, input.runId);

  // Stage 0: DevSecOps Fast-Fail
  if (!cancelled && input.stages.includes('devsecops')) {
    currentStage = 'devsecops';
    await acts.markStageRunning(input.tenantId, input.runId, 0, 'devsecops');
    const r = await acts.runDevsecopsStage(input.tenantId, input.runId);
    await acts.markStageCompleted(input.tenantId, input.runId, 0, 'devsecops', r);
    results.push(r);
    stagesCompleted++;
    if (!r.passed) return await finalize(input, results);
  }

  // Stage 1: Core Logic Matrix
  if (!cancelled && input.stages.includes('unit')) {
    currentStage = 'unit';
    await acts.markStageRunning(input.tenantId, input.runId, 1, 'unit');
    const r = await acts.runUnitStage(input.tenantId, input.runId, input.thresholds);
    await acts.markStageCompleted(input.tenantId, input.runId, 1, 'unit', r);
    results.push(r);
    stagesCompleted++;
    if (!r.passed) return await finalize(input, results);
  }

  // Stage 2: Strict Integration (per-tenant schema drift)
  if (!cancelled && input.stages.includes('integration')) {
    currentStage = 'integration';
    await acts.markStageRunning(input.tenantId, input.runId, 2, 'integration');
    const r = await acts.runIntegrationStage(input.tenantId, input.runId);
    await acts.markStageCompleted(input.tenantId, input.runId, 2, 'integration', r);
    results.push(r);
    stagesCompleted++;
    if (!r.passed) return await finalize(input, results);
  }

  // Stage 3: AI Guardrails (per-tenant agent evaluation)
  if (!cancelled && input.stages.includes('ai-guardrails')) {
    currentStage = 'ai-guardrails';
    await acts.markStageRunning(input.tenantId, input.runId, 3, 'ai-guardrails');
    const r = await longActs.runAiGuardrailsStage(input.tenantId, input.runId);
    await acts.markStageCompleted(input.tenantId, input.runId, 3, 'ai-guardrails', r);
    results.push(r);
    stagesCompleted++;
    // AI guardrails failure is logged but does NOT block subsequent stages
  }

  // Stage 4: E2E + VRT (post-deploy only)
  if (!cancelled && input.stages.includes('e2e-visual') && input.baseUrl) {
    currentStage = 'e2e-visual';
    await acts.markStageRunning(input.tenantId, input.runId, 4, 'e2e-visual');
    const r = await longActs.runE2eVisualStage(input.tenantId, input.runId, input.baseUrl);
    await acts.markStageCompleted(input.tenantId, input.runId, 4, 'e2e-visual', r);
    results.push(r);
    stagesCompleted++;
  }

  // Stage 5: Chaos & Load
  if (!cancelled && input.stages.includes('performance') && input.baseUrl) {
    currentStage = 'performance';
    await acts.markStageRunning(input.tenantId, input.runId, 5, 'performance');
    const r = await longActs.runPerformanceStage(input.tenantId, input.runId, input.baseUrl);
    await acts.markStageCompleted(input.tenantId, input.runId, 5, 'performance', r);
    results.push(r);
    stagesCompleted++;
  }

  // Stage 6: Mutation Testing
  if (!cancelled && input.stages.includes('mutation')) {
    currentStage = 'mutation';
    await acts.markStageRunning(input.tenantId, input.runId, 6, 'mutation');
    const r = await longActs.runMutationStage(input.tenantId, input.runId);
    await acts.markStageCompleted(input.tenantId, input.runId, 6, 'mutation', r);
    results.push(r);
    stagesCompleted++;
  }

  currentStage = 'finalizing';
  return await finalize(input, results);
}

async function finalize(input: QualityGateRunInput, results: QualityGateStageResult[]): Promise<QualityGateRunOutput> {
  return await acts.finalizeRun(input.tenantId, input.runId, results);
}
