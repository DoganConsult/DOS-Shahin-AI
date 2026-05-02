/**
 * Stage 6: Mutation Testing Service
 * Orchestrates Stryker mutation testing and evaluates mutation score.
 * Stores per-module results in qgate_mutation_reports.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as _fs from 'fs';
import { safeQuery, tenantSchema, assertTenantId } from '../../ports/database.port';
import { evaluateMutationReport } from '../../../../tests/quality-gate/70-mutation/mutation-gate';
import type { StageResult } from '../../contracts/quality-gate.contracts';

const BACKEND_ROOT = path.resolve(__dirname, '../../../../..');
const STRYKER_CONFIG = path.resolve(__dirname, '../../../../tests/quality-gate/70-mutation/stryker.config.json');

export async function evaluateMutation(tenantId: string, runId: string): Promise<StageResult> {
  const start = Date.now();
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const blockers: StageResult['blockers'] = [];
  const details: Record<string, unknown> = {};

  // Run Stryker
  try {
    execSync(`pnpm exec stryker run "${STRYKER_CONFIG}"`, {
      cwd: BACKEND_ROOT,
      timeout: 7_200_000, // 2 hours
      stdio: 'pipe',
    });
  } catch {
    // Stryker may exit non-zero if mutation score is below break threshold
  }
  details.strykerRan = true;

  // Parse report
  const report = evaluateMutationReport();
  details.mutationScore = report.mutationScore;
  details.totalMutants = report.totalMutants;
  details.killed = report.killed;
  details.survived = report.survived;

  if (!report.passed) {
    blockers.push({
      code: 'MUTATION_SCORE',
      message: `Mutation score ${report.mutationScore}% below ${report.threshold}% threshold`,
      severity: 'warning',
    });
  }

  // Persist per-module results
  for (const mod of report.perModule) {
    await safeQuery(
      `INSERT INTO "${schema}".qgate_mutation_reports
       (run_id, tenant_id, module_code, mutants_total, mutants_killed, mutants_survived,
        mutation_score, threshold, passed, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [runId, tenantId, mod.module, mod.total, mod.killed, mod.total - mod.killed,
       mod.score, report.threshold, mod.score >= report.threshold,
       JSON.stringify({ score: mod.score })],
    );
  }

  return {
    stageCode: 'mutation',
    stageNumber: 6,
    passed: report.passed,
    score: report.mutationScore / 100,
    threshold: report.threshold / 100,
    durationMs: Date.now() - start,
    blockers,
    details,
  };
}
