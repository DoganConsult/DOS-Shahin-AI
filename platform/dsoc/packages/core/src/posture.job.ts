/**
 * DSOC posture-computation job.
 *
 * Scores each tenant's security posture based on the last 24h of audit
 * events + currently open alerts. The result is an integer 0..100 + a
 * list of findings that drove the deductions.
 *
 * Deliberately simple: the goal is to have SOMETHING durable in
 * platform_dsoc.posture_snapshots so the getLatestPosture() endpoint
 * returns real data. Operators tune the weights in a later iteration.
 */

import type { DSOCPortDependencies } from './dsoc-port.impl';
import type { PostureRepository } from './posture.repository';
import type { AuditLogRepository } from './audit-log.repository';
import type { AlertsRepository } from './alerts.repository';
import type { DSOCPostureSnapshot } from '@dos/ports/dsoc';

interface Finding {
  code: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  info: 0,
  low: 2,
  medium: 5,
  high: 12,
  critical: 25,
};

export interface PostureJobDeps {
  readonly auditLog: AuditLogRepository;
  readonly alerts: AlertsRepository;
  readonly posture: PostureRepository;
}

/**
 * Compute a posture snapshot for a single tenant and persist it.
 * Returns the computed snapshot.
 */
export async function computePostureSnapshot(
  deps: PostureJobDeps,
  tenantId: string,
  opts: { lookbackEvents?: number } = {},
): Promise<DSOCPostureSnapshot> {
  const findings: Finding[] = [];
  let score = 100;

  // 1. Open alerts dent the score in proportion to their severity.
  const openAlerts = await deps.alerts.listOpen(tenantId);
  for (const alert of openAlerts) {
    const weight = SEVERITY_WEIGHT[alert.severity] ?? 0;
    score -= weight;
    findings.push({
      code: `OPEN_ALERT_${alert.severity.toUpperCase()}`,
      severity: alert.severity as Finding['severity'],
      summary: `Open alert: ${alert.action} (${alert.category})`,
    });
  }

  // 2. Recent denied-outcome events also lower the score.
  const recent = await deps.auditLog.recentByTenant(tenantId, opts.lookbackEvents ?? 200);
  const denied = recent.filter((e) => e.outcome === 'denied' || e.outcome === 'failure');
  if (denied.length >= 10) {
    score -= 10;
    findings.push({
      code: 'HIGH_FAILURE_RATE',
      severity: 'medium',
      summary: `${denied.length} denied/failed events in the recent window`,
    });
  }

  // 3. Check for any high/critical event in the window.
  const criticalInWindow = recent.filter((e) => e.severity === 'critical').length;
  if (criticalInWindow > 0) {
    score -= 15;
    findings.push({
      code: 'CRITICAL_EVENT_PRESENT',
      severity: 'critical',
      summary: `${criticalInWindow} critical event(s) in the recent window`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  const snapshot: DSOCPostureSnapshot = {
    tenantId,
    capturedAt: new Date().toISOString(),
    score,
    findings,
  };

  await deps.posture.insert(snapshot);
  return snapshot;
}

export interface StartPostureLoopOptions {
  readonly tenantSource: () => Promise<readonly string[]>;
  readonly intervalMs?: number;
  readonly lookbackEvents?: number;
}

/**
 * Start a repeating posture-computation loop. Fetches the tenant list
 * from tenantSource() on each tick; computes + persists a snapshot per
 * tenant. Returns a dispose function.
 */
export function startPostureLoop(
  deps: PostureJobDeps,
  opts: StartPostureLoopOptions,
): () => void {
  const intervalMs = opts.intervalMs ?? 60 * 60 * 1000; // hourly by default
  const tick = async () => {
    try {
      const tenants = await opts.tenantSource();
      let ok = 0;
      let failed = 0;
      for (const t of tenants) {
        try {
          await computePostureSnapshot(deps, t, { lookbackEvents: opts.lookbackEvents });
          ok++;
        } catch {
          failed++;
        }
      }
      if (ok > 0 || failed > 0) {
        console.log(`[dsoc-posture] computed=${ok} failed=${failed} for ${tenants.length} tenants`);
      }
    } catch (err) {
      console.error('[dsoc-posture] tick failed', err);
    }
  };
  const handle = setInterval(() => void tick(), intervalMs);
  void tick();
  return () => clearInterval(handle);
}
