/**
 * Enforcement Activities — Temporal
 *
 * Each activity wraps one enforcement check from tools/enforcement/.
 * Called by enforcement-sweep.workflow.ts.
 * Results are stored in enforcement_check_results table.
 *
 * @owner DOS
 * Maps to: AGENTS.md Patch 0 §4 (Laws), §14 (File budgets)
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { safeQuery, tenantSchema as _tenantSchema } from '@dos/db';
import { v4 as uuid } from 'uuid';

// ── Types ──

export interface EnforcementCheckResult {
  checkName: string;
  lawRef: string;
  status: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  findings: string[];
  durationMs: number;
}

export interface EnforcementSweepResult {
  runId: string;
  verdict: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  checks: EnforcementCheckResult[];
  totalDurationMs: number;
  timestamp: string;
}

// ── Helpers ──

const ENFORCEMENT_DIR = resolve(__dirname, '../../../../tools/enforcement');

function runBashCheck(scriptName: string): { exitCode: number; output: string } {
  const script = resolve(ENFORCEMENT_DIR, scriptName);
  const root = resolve(__dirname, '../../../..');
  try {
    const output = execSync(`bash "${script}" "${root}"`, {
      encoding: 'utf-8',
      timeout: 60_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, output };
  } catch (err: unknown) {
    return { exitCode: (err as any).status ?? 1, output: ((err as any).stdout ?? '') + ((err as any).stderr ?? '') };
  }
}

function parseFindings(output: string): string[] {
  return output
    .split('\n')
    .filter(line => line.includes('FAIL') || line.includes('WARN'))
    .map(line => line.trim())
    .filter(Boolean);
}

function determineStatus(exitCode: number, output: string): EnforcementCheckResult['status'] {
  if (exitCode === 0) {
    return output.includes('WARN') ? 'CONDITIONAL_PASS' : 'PASS';
  }
  return 'FAIL';
}

// ── Activities ──

const CHECK_MAP: Record<string, { script: string; lawRef: string }> = {
  noStubs:              { script: 'check-no-stubs.sh',               lawRef: 'Law 7' },
  dirBudget:            { script: 'check-dir-budget.sh',             lawRef: 'Patch 0 §14' },
  deprecatedDeathDates: { script: 'check-deprecated-death-dates.sh', lawRef: 'Law 8' },
  wrongLayerImports:    { script: 'check-wrong-layer-imports.sh',    lawRef: 'Law 9' },
  noFrontendAuthTruth:  { script: 'check-no-frontend-auth-truth.sh', lawRef: 'Law 4' },
  forbiddenNames:       { script: 'check-forbidden-names.sh',        lawRef: 'Patch 0 §1.5' },
  v2Files:              { script: 'check-v2-files.sh',               lawRef: 'Law 10' },
  ownershipBoundaries:  { script: 'check-ownership-boundaries.sh',   lawRef: 'Patch 0 §5' },
};

export async function runEnforcementCheck(checkName: string): Promise<EnforcementCheckResult> {
  const config = CHECK_MAP[checkName];
  if (!config) throw new Error(`Unknown enforcement check: ${checkName}`);

  const start = Date.now();
  const { exitCode, output } = runBashCheck(config.script);
  const durationMs = Date.now() - start;

  return {
    checkName,
    lawRef: config.lawRef,
    status: determineStatus(exitCode, output),
    findings: parseFindings(output),
    durationMs,
  };
}

export async function getCheckNames(): Promise<string[]> {
  return Object.keys(CHECK_MAP);
}

export async function persistEnforcementRun(result: EnforcementSweepResult): Promise<void> {
  await safeQuery(
    `INSERT INTO public.enforcement_runs (run_id, started_at, completed_at, verdict, total_duration_ms, check_count, fail_count)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6)`,
    [
      result.runId,
      result.timestamp,
      result.verdict,
      result.totalDurationMs,
      result.checks.length,
      result.checks.filter(c => c.status === 'FAIL').length,
    ],
  );

  for (const check of result.checks) {
    await safeQuery(
      `INSERT INTO public.enforcement_check_results (id, run_id, check_name, law_ref, status, findings, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuid(), result.runId, check.checkName, check.lawRef, check.status, JSON.stringify(check.findings), check.durationMs],
    );
  }
}

// Re-export for Temporal proxyActivities
export type EnforcementActivities = {
  runEnforcementCheck: typeof runEnforcementCheck;
  getCheckNames: typeof getCheckNames;
  persistEnforcementRun: typeof persistEnforcementRun;
};
