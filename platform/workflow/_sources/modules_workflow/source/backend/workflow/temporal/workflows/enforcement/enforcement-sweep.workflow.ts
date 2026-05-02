/**
 * Enforcement Sweep Workflow — Temporal
 *
 * Runs all 8 enforcement checks sequentially, collects results,
 * persists to DB, and emits event bus notification.
 *
 * @owner DOS
 * Maps to: AGENTS.md Patch 0 §4 (Laws enforcement)
 */

import {
  proxyActivities,
  defineQuery,
  setHandler,
  sleep,
} from '@temporalio/workflow';
import type { EnforcementActivities, EnforcementSweepResult, EnforcementCheckResult } from '../../activities/enforcement/enforcement.activities';

const acts = proxyActivities<EnforcementActivities>({
  startToCloseTimeout: '2m',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['UNKNOWN_CHECK'],
  },
});

// Queries for real-time monitoring
const getProgressQuery = defineQuery<{
  completed: number;
  total: number;
  current: string | null;
  results: EnforcementCheckResult[];
}>('getProgress');

export async function enforcementSweep(input: { runId: string; triggeredBy: string }): Promise<EnforcementSweepResult> {
  const { runId, triggeredBy: _triggeredBy } = input;
  const startTime = new Date().toISOString();
  const start = Date.now();

  // Get all check names
  const checkNames = await acts.getCheckNames();
  const results: EnforcementCheckResult[] = [];
  let currentCheck: string | null = null;

  // Set up query handler for real-time progress
  setHandler(getProgressQuery, () => ({
    completed: results.length,
    total: checkNames.length,
    current: currentCheck,
    results: [...results],
  }));

  // Run each check sequentially
  for (const checkName of checkNames) {
    currentCheck = checkName;
    const result = await acts.runEnforcementCheck(checkName);
    results.push(result);
    // Brief pause between checks to avoid resource contention
    await sleep('500ms');
  }

  currentCheck = null;
  const totalDurationMs = Date.now() - start;

  // Determine overall verdict
  const hasFailure = results.some(r => r.status === 'FAIL');
  const hasWarning = results.some(r => r.status === 'CONDITIONAL_PASS');
  const verdict: EnforcementSweepResult['verdict'] = hasFailure
    ? 'FAIL'
    : hasWarning
      ? 'CONDITIONAL_PASS'
      : 'PASS';

  const sweepResult: EnforcementSweepResult = {
    runId,
    verdict,
    checks: results,
    totalDurationMs,
    timestamp: startTime,
  };

  // Persist to database
  await acts.persistEnforcementRun(sweepResult);

  return sweepResult;
}
