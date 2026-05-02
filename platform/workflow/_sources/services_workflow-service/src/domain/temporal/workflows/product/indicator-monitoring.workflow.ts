// ============================================
// Indicator Monitoring Workflow — spec section 19, Workflow 3
// Collect Value → Compare to Threshold → Mark Breach →
//   Notify Owner → Open Issue/Treatment if Required →
//   Track Closure
// Queue: agrc-risk
// Uses continueAsNew for infinite lifecycle.
// ============================================

import {
  defineSignal,
  defineQuery,
  setHandler,
  proxyActivities,
  condition,
  sleep as _sleep,
  continueAsNew,
} from '@temporalio/workflow';
import type { IndicatorMonitoringActivities } from '../../activities/indicator-monitoring.activities';

const acts = proxyActivities<IndicatorMonitoringActivities>({
  startToCloseTimeout: '10m',
  retry: { maximumAttempts: 3, initialInterval: '3s', backoffCoefficient: 2, maximumInterval: '30s' },
});

// ── Signals ──────────────────────────────────────────────────────────
export const manualCollectionSignal = defineSignal<[{ kriId: string; value: number; collectedBy: string }]>('manualCollection');
export const stopMonitoringSignal = defineSignal('stopMonitoring');

// ── Queries ──────────────────────────────────────────────────────────
export const monitoringStatusQuery = defineQuery<MonitoringStatus>('monitoringStatus');

// ── Types ────────────────────────────────────────────────────────────
export interface IndicatorMonitoringInput {
  tenantId: string;
  kriId: string;
  collectionFrequencyMs: number; // e.g., 86400000 for daily
  cycleCount?: number; // for continueAsNew tracking
}

interface MonitoringStatus {
  kriId: string;
  lastCollectedAt: string | null;
  lastValue: number | null;
  breachActive: boolean;
  cycleCount: number;
  stopped: boolean;
}

// ── Workflow ─────────────────────────────────────────────────────────
export async function indicatorMonitoringWorkflow(input: IndicatorMonitoringInput): Promise<MonitoringStatus> {
  let status: MonitoringStatus = {
    kriId: input.kriId,
    lastCollectedAt: null,
    lastValue: null,
    breachActive: false,
    cycleCount: input.cycleCount || 0,
    stopped: false,
  };
  let stopped = false;
  let manualValue: { kriId: string; value: number; collectedBy: string } | null = null;

  setHandler(monitoringStatusQuery, () => status);
  setHandler(stopMonitoringSignal, () => { stopped = true; status.stopped = true; });
  setHandler(manualCollectionSignal, (data: { kriId: string; value: number; collectedBy: string }) => {
    manualValue = data;
  });

  // Run monitoring cycles (up to 50 before continueAsNew)
  const maxCycles = 50;
  for (let i = 0; i < maxCycles; i++) {
    if (stopped) break;

    // Wait for collection interval or manual trigger
    const _triggered = await condition(
      () => manualValue !== null || stopped,
      `${input.collectionFrequencyMs}ms`,
    );

    if (stopped) break;

    // Step 1: Collect value (manual or scheduled)
    let collectedValue: number;
    let collectedBy: string;

    type ManualReading = { kriId: string; value: number; collectedBy: string };
    const pendingManual = manualValue as ManualReading | null;
    if (pendingManual) {
      collectedValue = pendingManual.value;
      collectedBy = pendingManual.collectedBy;
      manualValue = null; // reset for next cycle
    } else {
      // Scheduled collection — fetch from configured source
      const collected = await acts.collectIndicatorValue(input.tenantId, input.kriId);
      collectedValue = collected.value;
      collectedBy = collected.collectedBy;
    }

    // Record data point
    await acts.recordDataPoint(input.tenantId, input.kriId, collectedValue, collectedBy);
    status.lastValue = collectedValue;
    status.lastCollectedAt = new Date().toISOString();

    // Step 2: Compare to threshold
    const thresholdResult = await acts.compareToThreshold(input.tenantId, input.kriId, collectedValue);

    if (thresholdResult.breached) {
      // Step 3: Mark breach
      const breachId = await acts.markBreach(
        input.tenantId, input.kriId, collectedValue,
        thresholdResult.breachLevel, thresholdResult.thresholdValue,
      );
      status.breachActive = true;

      // Step 4: Notify owner
      await acts.notifyBreachOwner(input.tenantId, input.kriId, breachId, thresholdResult.breachLevel);

      // Step 5: Open issue/treatment if required (red = always, amber = if persistent)
      if (thresholdResult.breachLevel === 'red' || thresholdResult.persistentBreach) {
        await acts.openIssueForBreach(input.tenantId, input.kriId, breachId);
      }
    } else {
      // Check if previous breach can be resolved
      if (status.breachActive) {
        const resolved = await acts.checkBreachResolution(input.tenantId, input.kriId);
        if (resolved) {
          status.breachActive = false;
          // Step 6: Track closure
          await acts.notifyBreachResolved(input.tenantId, input.kriId);
        }
      }
    }

    status.cycleCount++;
  }

  // continueAsNew for infinite lifecycle
  if (!stopped) {
    await continueAsNew<typeof indicatorMonitoringWorkflow>({
      ...input,
      cycleCount: status.cycleCount,
    });
  }

  return status;
}
