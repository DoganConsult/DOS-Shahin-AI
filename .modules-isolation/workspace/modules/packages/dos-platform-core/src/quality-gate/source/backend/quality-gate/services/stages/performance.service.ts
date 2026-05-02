/**
 * Stage 5: Chaos & Load Testing Service
 * Orchestrates K6 load tests and chaos engineering validation.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { StageResult } from '../../contracts/quality-gate.contracts';

const ROOT_DIR = path.resolve(__dirname, '../../../../../..');
const K6_DIR = path.join(ROOT_DIR, 'k6');

export async function evaluatePerformance(tenantId: string, runId: string, baseUrl: string): Promise<StageResult> {
  const start = Date.now();
  const blockers: StageResult['blockers'] = [];
  const details: Record<string, unknown> = { baseUrl };

  // 1. K6 Auth load test
  const authTestPath = path.join(K6_DIR, 'load-test-auth.js');
  if (fs.existsSync(authTestPath)) {
    try {
      const _output = execSync(`k6 run "${authTestPath}" --env BASE_URL="${baseUrl}" --summary-export=/tmp/k6-auth.json --quiet`, {
        timeout: 300_000,
        stdio: 'pipe',
      });
      details.authLoadTest = 'passed';
    } catch {
      blockers.push({ code: 'LOAD_AUTH', message: 'Auth load test exceeded thresholds', severity: 'warning' });
      details.authLoadTest = 'failed';
    }
  } else {
    details.authLoadTest = 'skipped (no k6 script)';
  }

  // 2. K6 Dashboard load test
  const dashTestPath = path.join(K6_DIR, 'load-test-dashboards.js');
  if (fs.existsSync(dashTestPath)) {
    try {
      execSync(`k6 run "${dashTestPath}" --env BASE_URL="${baseUrl}" --summary-export=/tmp/k6-dashboard.json --quiet`, {
        timeout: 300_000,
        stdio: 'pipe',
      });
      details.dashboardLoadTest = 'passed';
    } catch {
      blockers.push({ code: 'LOAD_DASHBOARD', message: 'Dashboard load test exceeded thresholds', severity: 'warning' });
      details.dashboardLoadTest = 'failed';
    }
  } else {
    details.dashboardLoadTest = 'skipped (no k6 script)';
  }

  // 3. Chaos engineering tests
  try {
    execSync('pnpm exec vitest run src/tests/chaos/ --reporter=json 2>/dev/null', {
      cwd: path.resolve(ROOT_DIR, 'backend'),
      timeout: 120_000,
      stdio: 'pipe',
    });
    details.chaosTests = 'passed';
  } catch {
    blockers.push({ code: 'CHAOS', message: 'Chaos engineering tests failed', severity: 'warning' });
    details.chaosTests = 'failed';
  }

  // Performance stage is non-blocking (warnings only)
  const passed = true;
  const score = blockers.length === 0 ? 1.0 : 0.7;

  return {
    stageCode: 'performance',
    stageNumber: 5,
    passed,
    score,
    threshold: 1.0,
    durationMs: Date.now() - start,
    blockers,
    details,
  };
}
