// ============================================================================
// Shahin-Ai -- Evidence Provenance Service
//
// Chain-of-custody tracking for evidence items. Records every significant
// event in the lifecycle of an evidence artefact (creation, upload, review,
// status change, export, etc.) and provides queryable provenance chains.
//
// Tables:
//   evidence_provenance_records  -- chronological event log per evidence item
//   evidence_verification_events -- verification/validation results
// ============================================================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault as _swallowDefault, EC as _EC } from '@dos/platform-core/resilience';
import { eventBus } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProvenanceRecord {
  id: string;
  evidenceId: string;
  eventType: string;
  actor: string;
  actorRole: string | null;
  eventData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ProvenanceStats {
  totalEvents: number;
  byType: Record<string, number>;
  uniqueActors: number;
  actors: string[];
}

export interface VerificationEvent {
  id: string;
  evidenceId: string;
  verificationType: string;
  result: string;
  verifier: string;
  details: Record<string, unknown> | null;
  verifiedAt: string;
}

// ── 1. recordProvenanceEvent ───────────────────────────────────────────────

/**
 * Record a provenance event for an evidence item.
 * Captures who did what, when, from where, and any additional context.
 *
 * @param tenantId   - Tenant identifier
 * @param evidenceId - Evidence item this event relates to
 * @param eventType  - Type of event (e.g. 'created', 'uploaded', 'reviewed', 'status_changed', 'exported')
 * @param actor      - User ID of the actor
 * @param actorRole  - Optional role of the actor at time of event
 * @param eventData  - Optional structured metadata about the event
 * @param ipAddress  - Optional IP address of the actor
 */
export async function recordProvenanceEvent(
  tenantId: string,
  evidenceId: string,
  eventType: string,
  actor: string,
  actorRole?: string,
  eventData?: Record<string, unknown>,
  ipAddress?: string,
): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const recordId = uuid();

  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_provenance_records
       (id, evidence_id, event_type, actor, actor_role, event_data, ip_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
     RETURNING *`,
    [
      recordId,
      evidenceId,
      eventType,
      actor,
      actorRole || null,
      eventData ? JSON.stringify(eventData) : null,
      ipAddress || null,
    ],
  );

  const row = getFirstRow(result)!;

  // Publish event (best-effort)
  try {
    await eventBus.publish('evidence.provenance_recorded', tenantId, {
      evidenceId,
      eventType,
      actor,
      recordId,
    });
  } catch { /* best-effort */ }

  logger.info(
    `[evidence-provenance] Recorded provenance event: ${eventType} for evidence ${evidenceId} by ${actor}`,
  );

  return row;
}

// ── 2. getProvenanceChain ──────────────────────────────────────────────────

/**
 * Retrieve the full provenance chain for an evidence item.
 * Returns all provenance records ordered by created_at descending
 * (most recent first).
 *
 * @param tenantId   - Tenant identifier
 * @param evidenceId - Evidence item to trace
 */
export async function getProvenanceChain(
  tenantId: string,
  evidenceId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT id, evidence_id, event_type, actor, actor_role,
            event_data, ip_address, created_at
     FROM "${schema}".evidence_provenance_records
     WHERE evidence_id = $1
     ORDER BY created_at DESC`,
    [evidenceId],
  );

  return result.rows;
}

// ── 3. getProvenanceStats ──────────────────────────────────────────────────

/**
 * Aggregate provenance statistics across all evidence items for a tenant.
 * Returns total events, breakdown by event type, and unique actor information.
 *
 * @param tenantId - Tenant identifier
 */
export async function getProvenanceStats(
  tenantId: string,
): Promise<ProvenanceStats> {
  const schema = tenantSchema(tenantId);

  // Total count
  const totalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total
     FROM "${schema}".evidence_provenance_records`,
    [],
  );
  const totalEvents: number = getFirstRow(totalResult)?.total ?? 0;

  // Breakdown by event type
  const byTypeResult = await safeQuery(
    `SELECT event_type, COUNT(*)::int AS cnt
     FROM "${schema}".evidence_provenance_records
     GROUP BY event_type
     ORDER BY cnt DESC`,
    [],
  );
  const byType: Record<string, number> = {};
  for (const row of byTypeResult.rows) {
    byType[row.event_type] = row.cnt;
  }

  // Unique actors
  const actorsResult = await safeQuery(
    `SELECT DISTINCT actor
     FROM "${schema}".evidence_provenance_records
     WHERE actor IS NOT NULL
     ORDER BY actor`,
    [],
  );
  const actors: string[] = actorsResult.rows.map((r: GenericRow) => r.actor);

  return {
    totalEvents,
    byType,
    uniqueActors: actors.length,
    actors,
  };
}

// ── 4. recordVerificationEvent ─────────────────────────────────────────────

/**
 * Record a verification event for an evidence item.
 * Captures integrity checks, format validations, completeness assessments,
 * or any other verification activity.
 *
 * @param tenantId         - Tenant identifier
 * @param evidenceId       - Evidence item being verified
 * @param verificationType - Type of verification (e.g. 'integrity_check', 'format_validation', 'completeness_review')
 * @param result           - Outcome of verification (e.g. 'pass', 'fail', 'warning')
 * @param verifier         - User ID or system identifier performing verification
 * @param details          - Optional structured details about the verification
 */
export async function recordVerificationEvent(
  tenantId: string,
  evidenceId: string,
  verificationType: string,
  result: string,
  verifier: string,
  details?: Record<string, unknown>,
): Promise<GenericRow> {
  const schema = tenantSchema(tenantId);
  const eventId = uuid();

  const insertResult = await safeQuery(
    `INSERT INTO "${schema}".evidence_verification_events
       (id, evidence_id, verification_type, result, verifier, details, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
     RETURNING *`,
    [
      eventId,
      evidenceId,
      verificationType,
      result,
      verifier,
      details ? JSON.stringify(details) : null,
    ],
  );

  const row = getFirstRow(insertResult)!;

  // Also record in provenance chain for full traceability
  try {
    await recordProvenanceEvent(
      tenantId,
      evidenceId,
      `verification_${verificationType}`,
      verifier,
      undefined,
      { verificationType, result, details: details || null },
    );
  } catch { /* best-effort: provenance is supplementary */ }

  logger.info(
    `[evidence-provenance] Verification event recorded: ${verificationType} = ${result} for evidence ${evidenceId}`,
  );

  return row;
}

// ── 5. getVerificationHistory ──────────────────────────────────────────────

/**
 * Retrieve the full verification history for an evidence item.
 * Returns all verification events ordered by verified_at descending.
 *
 * @param tenantId   - Tenant identifier
 * @param evidenceId - Evidence item to query
 */
export async function getVerificationHistory(
  tenantId: string,
  evidenceId: string,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT id, evidence_id, verification_type, result, verifier,
            details, verified_at
     FROM "${schema}".evidence_verification_events
     WHERE evidence_id = $1
     ORDER BY verified_at DESC`,
    [evidenceId],
  );

  return result.rows;
}
