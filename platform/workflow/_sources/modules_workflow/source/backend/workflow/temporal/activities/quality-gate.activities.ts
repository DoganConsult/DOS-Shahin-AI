import { QualityGateResult } from './lm-studio-gate.activities';

/**
 * Quality Gate Activities — STUB implementations (Law 8 compliance).
 *
 * All run*Stage functions return hardcoded `passed: true`. In production these
 * must execute `fetch()` requests against Shahin-AI Cloudflare Containers.
 *
 * @deprecated Stub implementations — replace with production integrations.
 * @removal-date 2026-07-01
 * @owner DOS
 * @replacement Production fetch-based stage runners (Shahin-AI cruiser endpoint)
 */

export interface QualityGateStageResult {
  stageCode: string;
  stageNumber: number;
  passed: boolean;
  score: number | null;
  threshold: number | null;
  durationMs: number;
  blockers: Array<{ code: string; message: string; severity: string }>;
  details: Record<string, unknown>;
}

export interface QualityGateRunOutput {
  runId: string;
  tenantId: string;
  status: 'passed' | 'failed';
  overallScore: number | null;
  stagesTotal: number;
  stagesPassed: number;
  stagesFailed: number;
  stages: QualityGateStageResult[];
  durationMs: number;
}

export interface QualityGateActivities {
  markRunStarted(tenantId: string, runId: string): Promise<void>;
  markStageRunning(tenantId: string, runId: string, stageNumber: number, stageCode: string): Promise<void>;
  markStageCompleted(
    tenantId: string,
    runId: string,
    stageNumber: number,
    stageCode: string,
    result: QualityGateStageResult,
  ): Promise<void>;
  runDevsecopsStage(tenantId: string, runId: string): Promise<QualityGateStageResult>;
  runUnitStage(
    tenantId: string,
    runId: string,
    thresholds: Record<string, Record<string, number>>,
  ): Promise<QualityGateStageResult>;
  runIntegrationStage(tenantId: string, runId: string): Promise<QualityGateStageResult>;
  runAiGuardrailsStage(tenantId: string, runId: string): Promise<QualityGateStageResult>;
  runE2eVisualStage(tenantId: string, runId: string, baseUrl: string): Promise<QualityGateStageResult>;
  runPerformanceStage(tenantId: string, runId: string, baseUrl: string): Promise<QualityGateStageResult>;
  runMutationStage(tenantId: string, runId: string): Promise<QualityGateStageResult>;
  finalizeRun(tenantId: string, runId: string, results: QualityGateStageResult[]): Promise<QualityGateRunOutput>;
}

function buildStageResult(
  stageCode: string,
  stageNumber: number,
  passed = true,
  details: Record<string, unknown> = {},
): QualityGateStageResult {
  return {
    stageCode,
    stageNumber,
    passed,
    score: passed ? 100 : 0,
    threshold: null,
    durationMs: 0,
    blockers: [],
    details,
  };
}

export async function markRunStarted(_tenantId: string, _runId: string): Promise<void> {}

export async function markStageRunning(
  _tenantId: string,
  _runId: string,
  _stageNumber: number,
  _stageCode: string,
): Promise<void> {}

export async function markStageCompleted(
  _tenantId: string,
  _runId: string,
  _stageNumber: number,
  _stageCode: string,
  _result: QualityGateStageResult,
): Promise<void> {}

export async function runDevsecopsStage(_tenantId: string, _runId: string): Promise<QualityGateStageResult> {
  return buildStageResult('devsecops', 0, true, { tools: ['dependency-cruiser', 'tsarch', 'semgrep'] });
}

export async function runUnitStage(
  _tenantId: string,
  _runId: string,
  thresholds: Record<string, Record<string, number>>,
): Promise<QualityGateStageResult> {
  return buildStageResult('unit', 1, true, { thresholds });
}

export async function runIntegrationStage(_tenantId: string, _runId: string): Promise<QualityGateStageResult> {
  return buildStageResult('integration', 2, true, { tools: ['supertest', 'schema-oracle'] });
}

export async function runAiGuardrailsStage(_tenantId: string, _runId: string): Promise<QualityGateStageResult> {
  return buildStageResult('ai-guardrails', 3, true, { model: 'lm-studio-local' });
}

export async function runE2eVisualStage(
  _tenantId: string,
  _runId: string,
  baseUrl: string,
): Promise<QualityGateStageResult> {
  return buildStageResult('e2e-visual', 4, true, { baseUrl });
}

export async function runPerformanceStage(
  _tenantId: string,
  _runId: string,
  baseUrl: string,
): Promise<QualityGateStageResult> {
  return buildStageResult('performance', 5, true, { baseUrl });
}

export async function runMutationStage(_tenantId: string, _runId: string): Promise<QualityGateStageResult> {
  return buildStageResult('mutation', 6, true);
}

export async function finalizeRun(
  tenantId: string,
  runId: string,
  results: QualityGateStageResult[],
): Promise<QualityGateRunOutput> {
  const stagesPassed = results.filter((result) => result.passed).length;
  const stagesFailed = results.length - stagesPassed;
  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, result) => sum + (result.score ?? 0), 0) / results.length)
    : null;

  return {
    runId,
    tenantId,
    status: stagesFailed > 0 ? 'failed' : 'passed',
    overallScore,
    stagesTotal: results.length,
    stagesPassed,
    stagesFailed,
    stages: results,
    durationMs: results.reduce((sum, result) => sum + result.durationMs, 0),
  };
}

// ==== Stage 1: Static ====
/** @deprecated Stub — @removal-date 2026-07-01 @owner DOS @replacement Production cruiser endpoint */
export async function runDependencyCruiserGate(): Promise<QualityGateResult> {
  return { tool: 'dependency-cruiser', passed: true };
}
export async function runTsArchGate(): Promise<QualityGateResult> {
  return { tool: 'tsarch', passed: true };
}
export async function runSemgrepGate(): Promise<QualityGateResult> {
  return { tool: 'semgrep', passed: true };
}

// ==== Stage 2: Logic ====
export async function runVitestEngine(): Promise<QualityGateResult> {
  return { tool: 'vitest', passed: true };
}
export async function runJestContracts(): Promise<QualityGateResult> {
  return { tool: 'jest', passed: true };
}

// ==== Stage 3: Integration & Oracle ====
export async function runSupertestDauthGate(): Promise<QualityGateResult> {
  return { tool: 'supertest', passed: true };
}
export async function runSchemaDriftOracle(): Promise<QualityGateResult> {
  return { tool: 'schema-oracle', passed: true };
}

// ==== Stage 4: Visual ====
export async function runPlaywrightVRTGate(): Promise<QualityGateResult> {
  return { tool: 'playwright-vrt', passed: true };
}
