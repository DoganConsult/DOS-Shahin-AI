/**
 * Stage 1: Unit Test Coverage Enforcement Service
 * Runs vitest with elevated coverage thresholds and parses results.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { StageResult } from '../../contracts/quality-gate.contracts';

const BACKEND_ROOT = path.resolve(__dirname, '../../../../..');

export async function evaluateUnitCoverage(tenantId: string, runId: string, thresholds: Record<string, number>): Promise<StageResult> {
  const start = Date.now();
  const blockers: StageResult['blockers'] = [];
  const details: Record<string, unknown> = {};

  const lineThreshold = thresholds['coverage.lines'] ?? 0.80;
  const branchThreshold = thresholds['coverage.branches'] ?? 0.70;
  const funcThreshold = thresholds['coverage.functions'] ?? 0.80;

  // Run vitest with coverage
  let testsPassed = true;
  try {
    execSync('pnpm test -- --coverage --coverage.reporter=json-summary 2>/dev/null', {
      cwd: BACKEND_ROOT,
      timeout: 300_000,
      stdio: 'pipe',
    });
  } catch {
    testsPassed = false;
    blockers.push({ code: 'UNIT_TESTS', message: 'Unit tests failed', severity: 'critical' });
  }

  // Parse coverage summary
  const coveragePath = path.join(BACKEND_ROOT, 'coverage', 'coverage-summary.json');
  let coverageScore = 0;

  if (fs.existsSync(coveragePath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
      const total = summary.total ?? {};
      const lines = (total.lines?.pct ?? 0) / 100;
      const branches = (total.branches?.pct ?? 0) / 100;
      const functions = (total.functions?.pct ?? 0) / 100;

      details.coverage = { lines: lines * 100, branches: branches * 100, functions: functions * 100 };

      if (lines < lineThreshold) {
        blockers.push({ code: 'COV_LINES', message: `Line coverage ${(lines * 100).toFixed(1)}% < ${(lineThreshold * 100).toFixed(1)}%`, severity: 'critical' });
      }
      if (branches < branchThreshold) {
        blockers.push({ code: 'COV_BRANCHES', message: `Branch coverage ${(branches * 100).toFixed(1)}% < ${(branchThreshold * 100).toFixed(1)}%`, severity: 'critical' });
      }
      if (functions < funcThreshold) {
        blockers.push({ code: 'COV_FUNCTIONS', message: `Function coverage ${(functions * 100).toFixed(1)}% < ${(funcThreshold * 100).toFixed(1)}%`, severity: 'critical' });
      }

      coverageScore = (lines + branches + functions) / 3;
    } catch {
      blockers.push({ code: 'COV_PARSE', message: 'Failed to parse coverage summary', severity: 'warning' });
    }
  } else {
    blockers.push({ code: 'COV_MISSING', message: 'Coverage summary file not found', severity: 'warning' });
  }

  const passed = testsPassed && blockers.filter(b => b.severity === 'critical').length === 0;

  return {
    stageCode: 'unit',
    stageNumber: 1,
    passed,
    score: coverageScore,
    threshold: lineThreshold,
    durationMs: Date.now() - start,
    blockers,
    details,
  };
}
