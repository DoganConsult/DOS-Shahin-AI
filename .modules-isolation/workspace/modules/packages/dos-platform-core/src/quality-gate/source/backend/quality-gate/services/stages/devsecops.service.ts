/**
 * Stage 0: DevSecOps Fast-Fail Service
 * Orchestrates dependency-cruiser, semgrep, trufflehog, checkov.
 * Spawns external tools as child processes and parses their output.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import type { StageResult } from '../../contracts/quality-gate.contracts';

const SCRIPTS_DIR = path.resolve(__dirname, '../../../../tests/quality-gate/00-devsecops');

export async function evaluateDevsecops(_tenantId: string, _runId: string): Promise<StageResult> {
  const start = Date.now();
  const blockers: StageResult['blockers'] = [];
  const details: Record<string, unknown> = {};
  let allPassed = true;

  // 1. Architecture rules (vitest test)
  try {
    execSync('pnpm exec vitest run src/tests/quality-gate/00-devsecops/architecture-rules.test.ts --reporter=json 2>/dev/null', {
      cwd: path.resolve(__dirname, '../../../../..'),
      timeout: 60_000,
      stdio: 'pipe',
    });
    details.architectureRules = 'passed';
  } catch (_err) {
    allPassed = false;
    blockers.push({ code: 'ARCH_RULES', message: 'Architecture rule violations detected', severity: 'critical' });
    details.architectureRules = 'failed';
  }

  // 2. Semgrep SAST
  try {
    execSync(`bash "${path.join(SCRIPTS_DIR, 'run-semgrep.sh')}"`, { timeout: 120_000, stdio: 'pipe' });
    details.semgrep = 'passed';
  } catch {
    allPassed = false;
    blockers.push({ code: 'SEMGREP', message: 'Semgrep SAST findings detected', severity: 'critical' });
    details.semgrep = 'failed';
  }

  // 3. TruffleHog secrets
  try {
    execSync(`bash "${path.join(SCRIPTS_DIR, 'run-trufflehog.sh')}"`, { timeout: 120_000, stdio: 'pipe' });
    details.trufflehog = 'passed';
  } catch {
    allPassed = false;
    blockers.push({ code: 'TRUFFLEHOG', message: 'Secrets detected in codebase', severity: 'critical' });
    details.trufflehog = 'failed';
  }

  // 4. Checkov IaC
  try {
    execSync(`bash "${path.join(SCRIPTS_DIR, 'run-checkov.sh')}"`, { timeout: 120_000, stdio: 'pipe' });
    details.checkov = 'passed';
  } catch {
    // Checkov runs in soft-fail mode, so failures are warnings not blockers
    details.checkov = 'soft-fail';
  }

  return {
    stageCode: 'devsecops',
    stageNumber: 0,
    passed: allPassed,
    score: allPassed ? 1.0 : 0.0,
    threshold: 1.0,
    durationMs: Date.now() - start,
    blockers,
    details,
  };
}
