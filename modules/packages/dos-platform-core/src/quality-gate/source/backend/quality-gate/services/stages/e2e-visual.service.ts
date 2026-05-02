/**
 * Stage 4: E2E & Visual Regression Testing Service
 * Orchestrates Playwright E2E tests, BackstopJS VRT, and axe-core a11y audits.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import type { StageResult } from '../../contracts/quality-gate.contracts';

const ROOT_DIR = path.resolve(__dirname, '../../../../../..');

export async function evaluateE2eVisual(tenantId: string, runId: string, baseUrl: string): Promise<StageResult> {
  const start = Date.now();
  const blockers: StageResult['blockers'] = [];
  const details: Record<string, unknown> = { baseUrl };

  // 1. Playwright E2E smoke tests
  try {
    execSync(`pnpm exec playwright test e2e/tests/smoke/ --project=chromium --reporter=json`, {
      cwd: ROOT_DIR,
      timeout: 300_000,
      stdio: 'pipe',
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    });
    details.e2eSmoke = 'passed';
  } catch {
    blockers.push({ code: 'E2E_SMOKE', message: 'Playwright E2E smoke tests failed', severity: 'critical' });
    details.e2eSmoke = 'failed';
  }

  // 2. BackstopJS Visual Regression
  const backstopConfig = path.resolve(__dirname, '../../../../tests/quality-gate/50-e2e-visual/backstop.config.cjs');
  try {
    execSync(`npx backstop test --config="${backstopConfig}"`, {
      cwd: ROOT_DIR,
      timeout: 180_000,
      stdio: 'pipe',
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    });
    details.vrt = 'passed';
  } catch {
    blockers.push({ code: 'VRT', message: 'Visual regression differences detected', severity: 'warning' });
    details.vrt = 'failed';
  }

  // 3. Accessibility audit (Playwright + axe-core)
  try {
    execSync(`pnpm exec playwright test src/tests/quality-gate/50-e2e-visual/a11y-audit.spec.ts --reporter=json`, {
      cwd: path.resolve(ROOT_DIR, 'backend'),
      timeout: 120_000,
      stdio: 'pipe',
      env: { ...process.env, E2E_BASE_URL: baseUrl },
    });
    details.a11y = 'passed';
  } catch {
    blockers.push({ code: 'A11Y', message: 'Critical accessibility violations detected', severity: 'warning' });
    details.a11y = 'failed';
  }

  const criticalBlockers = blockers.filter(b => b.severity === 'critical');
  const passed = criticalBlockers.length === 0;
  const score = passed ? (blockers.length === 0 ? 1.0 : 0.8) : 0.0;

  return {
    stageCode: 'e2e-visual',
    stageNumber: 4,
    passed,
    score,
    threshold: 1.0,
    durationMs: Date.now() - start,
    blockers,
    details,
  };
}
