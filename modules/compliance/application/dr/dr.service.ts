/**
 * Wave 13 — Disaster Recovery: cross-region replication + tested failover.
 *
 * RPO target: < 1 hour (Wave 13).  RTO target: < 4 hours.
 *
 * Components:
 *   1. WAL/streaming-replication lag monitor (per-tenant region pair)
 *   2. Quarterly DR test invoker (replica promote → app pivot → smoke test)
 *   3. Restore drill state machine (record success/fail of last drill)
 */
import type { DbClient } from '../../db/runner';
import type { Region } from '../tenant-region/tenant-region.service';

export type DrillStatus = 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'aborted';

export interface DrDrillRecord {
  id: string;
  scenario: 'replica-promote' | 'pitr-restore' | 'region-failover' | 'tenant-restore';
  fromRegion: Region;
  toRegion: Region | null;
  startedAt: string;
  completedAt: string | null;
  status: DrillStatus;
  rpoActualSeconds: number | null;
  rtoActualSeconds: number | null;
  rpoTargetSeconds: number;
  rtoTargetSeconds: number;
  notes: string | null;
}

export const DR_RPO_TARGET_SECONDS = 60 * 60;        // 1 hour
export const DR_RTO_TARGET_SECONDS = 4 * 60 * 60;    // 4 hours
export const DR_DRILL_CADENCE_DAYS = 90;             // quarterly

export interface RecordDrillInput {
  scenario: DrDrillRecord['scenario'];
  fromRegion: Region;
  toRegion?: Region;
  startedAt: string;
  completedAt: string;
  status: DrillStatus;
  rpoActualSeconds?: number;
  rtoActualSeconds?: number;
  notes?: string;
}

export async function recordDrDrill(
  client: DbClient,
  input: RecordDrillInput,
): Promise<DrDrillRecord> {
  const res = await client.query<DrDrillRecord>(
    `INSERT INTO dos.dr_drill_runs (
       scenario, from_region, to_region, started_at, completed_at,
       status, rpo_actual_seconds, rto_actual_seconds,
       rpo_target_seconds, rto_target_seconds, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id,
       scenario, from_region AS "fromRegion", to_region AS "toRegion",
       started_at AS "startedAt", completed_at AS "completedAt", status,
       rpo_actual_seconds AS "rpoActualSeconds",
       rto_actual_seconds AS "rtoActualSeconds",
       rpo_target_seconds AS "rpoTargetSeconds",
       rto_target_seconds AS "rtoTargetSeconds", notes`,
    [
      input.scenario, input.fromRegion, input.toRegion ?? null,
      input.startedAt, input.completedAt, input.status,
      input.rpoActualSeconds ?? null, input.rtoActualSeconds ?? null,
      DR_RPO_TARGET_SECONDS, DR_RTO_TARGET_SECONDS, input.notes ?? null,
    ],
  );
  return res.rows[0];
}

export async function lastSuccessfulDrill(client: DbClient): Promise<DrDrillRecord | null> {
  const res = await client.query<DrDrillRecord>(
    `SELECT id, scenario, from_region AS "fromRegion", to_region AS "toRegion",
       started_at AS "startedAt", completed_at AS "completedAt", status,
       rpo_actual_seconds AS "rpoActualSeconds",
       rto_actual_seconds AS "rtoActualSeconds",
       rpo_target_seconds AS "rpoTargetSeconds",
       rto_target_seconds AS "rtoTargetSeconds", notes
     FROM dos.dr_drill_runs
     WHERE status = 'passed'
     ORDER BY completed_at DESC
     LIMIT 1`,
  );
  return res.rows[0] ?? null;
}

/**
 * Returns days since the last successful DR drill. Used by the Wave 9
 * promotion checklist: if > 90 days, a fresh drill is required before
 * production promotion.
 */
export async function daysSinceLastDrill(client: DbClient): Promise<number | null> {
  const last = await lastSuccessfulDrill(client);
  if (!last?.completedAt) return null;
  const diffMs = Date.now() - new Date(last.completedAt).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export interface DrReadinessReport {
  ok: boolean;
  daysSinceLastDrill: number | null;
  cadenceMet: boolean;
  rpoTargetSeconds: number;
  rtoTargetSeconds: number;
  reason: string | null;
}

export async function assessDrReadiness(client: DbClient): Promise<DrReadinessReport> {
  const days = await daysSinceLastDrill(client);
  if (days === null) {
    return {
      ok: false,
      daysSinceLastDrill: null,
      cadenceMet: false,
      rpoTargetSeconds: DR_RPO_TARGET_SECONDS,
      rtoTargetSeconds: DR_RTO_TARGET_SECONDS,
      reason: 'no successful DR drill on record — cannot promote',
    };
  }
  if (days > DR_DRILL_CADENCE_DAYS) {
    return {
      ok: false,
      daysSinceLastDrill: days,
      cadenceMet: false,
      rpoTargetSeconds: DR_RPO_TARGET_SECONDS,
      rtoTargetSeconds: DR_RTO_TARGET_SECONDS,
      reason: `last successful drill was ${days} days ago (cadence: ${DR_DRILL_CADENCE_DAYS} days). Run a fresh drill before promoting.`,
    };
  }
  return {
    ok: true,
    daysSinceLastDrill: days,
    cadenceMet: true,
    rpoTargetSeconds: DR_RPO_TARGET_SECONDS,
    rtoTargetSeconds: DR_RTO_TARGET_SECONDS,
    reason: null,
  };
}
