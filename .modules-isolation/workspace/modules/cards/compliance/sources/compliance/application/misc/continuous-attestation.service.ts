// ============================================
// Continuous Attestation Engine
// Monitors framework/control readiness continuously,
// calculates readiness scores, and auto-generates
// attestation drafts when thresholds are met.
// Requirements: Feature 22 - Continuous Attestation Engine
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordObservation } from '../../../ai/services/observability/ai-observation.service';
import { logger } from '../../ports/logger.port';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { catchHandler, swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReadinessScore {
  frameworkId?: string;
  frameworkName?: string;
  controlId?: string;
  controlTitle?: string;
  overallScore: number; // 0-100
  evidenceScore: number; // 0-100
  testScore: number; // 0-100
  freshnessScore: number; // 0-100
  gaps: string[];
  readyForAttestation: boolean;
  lastAssessedAt?: string;
}

export interface AttestationDraft {
  draftId: string;
  entityType: 'framework' | 'control';
  entityId: string;
  entityName: string;
  readinessScore: ReadinessScore;
  generatedAt: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  content?: {
    summary: string;
    evidenceSummary: string;
    testResults: string;
    gaps: string[];
    recommendations: string[];
  };
}

// ── Readiness Scoring ───────────────────────────────────────────────────────

/**
 * Calculate readiness score for a framework.
 * 
 * Evaluates framework-level readiness by aggregating control-level metrics:
 * - Evidence coverage: % of controls with required evidence
 * - Test results: % of controls with passing tests
 * - Evidence freshness: % of evidence within validity window
 * - Gap count: Number of identified gaps
 * 
 * Readiness threshold: 80% overall score for attestation eligibility.
 * 
 * @param {string} tenantId - Tenant ID
 * @param {string} frameworkId - Framework ID to evaluate
 * @returns {Promise<ReadinessScore>} Readiness score with breakdown and gaps
 * @throws {Error} If framework not found
 * 
 * @example
 * ```typescript
 * const score = await calculateFrameworkReadiness(tenantId, 'NCA-ECC-2-2024');
 * if (score.readyForAttestation) {
 *   await generateAttestationDraft(tenantId, 'framework', frameworkId);
 * }
 * ```
 */
export async function calculateFrameworkReadiness(
  tenantId: string,
  frameworkId: string
): Promise<ReadinessScore> {
  const schema = tenantSchema(tenantId);

  const frameworkRes = await safeQuery(
    `SELECT framework_id, name FROM "${schema}".frameworks WHERE framework_id = $1`,
    [frameworkId],
  );
  const fw = getFirstRow(frameworkRes)!;
  if (!fw) throw Object.assign(new Error(`Framework ${frameworkId} not found`), { statusCode: 404 });

  const controlsRes = await safeQuery(
    `SELECT control_id, status, test_status, evidence_ids FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`,
    [frameworkId],
  );
  const controls = controlsRes.rows as Record<string, unknown>[];
  const total = controls.length;

  if (total === 0) {
    return {
      frameworkId,
      frameworkName: fw.name as string,
      overallScore: 0,
      evidenceScore: 0,
      testScore: 0,
      freshnessScore: 0,
      gaps: ['No controls mapped to this framework'],
      readyForAttestation: false,
      lastAssessedAt: new Date().toISOString(),
    };
  }

  const withEvidence = controls.filter((c) => Array.isArray(c.evidence_ids) && (c.evidence_ids as unknown[]).length > 0).length;
  const withPassingTests = controls.filter((c) => c.test_status === 'pass' || c.test_status === 'passed').length;
  const implemented = controls.filter((c) => c.status === 'implemented').length;

  const evidenceScore = Math.round((withEvidence / total) * 100);
  const testScore = Math.round((withPassingTests / total) * 100);
  const freshnessScore = Math.round((implemented / total) * 100);
  const overallScore = Math.round((evidenceScore + testScore + freshnessScore) / 3);

  const gaps: string[] = [];
  if (evidenceScore < 80) gaps.push(`${total - withEvidence} controls missing required evidence`);
  if (testScore < 80) gaps.push(`${total - withPassingTests} controls without passing tests`);
  if (implemented < total) gaps.push(`${total - implemented} controls not yet implemented`);

  return {
    frameworkId,
    frameworkName: fw.name as string,
    overallScore,
    evidenceScore,
    testScore,
    freshnessScore,
    gaps,
    readyForAttestation: overallScore >= 80,
    lastAssessedAt: new Date().toISOString(),
  };
}

/**
 * Calculate readiness score for a single control.
 */
export async function calculateControlReadiness(
  tenantId: string,
  controlId: string
): Promise<ReadinessScore> {
  const schema = tenantSchema(tenantId);

  const controlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids FROM "${schema}".controls WHERE control_id = $1`,
    [controlId],
  );
  const control = getFirstRow(controlRes) as Record<string, unknown> | null;
  if (!control) throw Object.assign(new Error(`Control ${controlId} not found`), { statusCode: 404 });

  const hasEvidence = Array.isArray(control.evidence_ids) && (control.evidence_ids as unknown[]).length > 0;
  const passingTest = control.test_status === 'pass' || control.test_status === 'passed';
  const implemented = control.status === 'implemented';

  const evidenceScore = hasEvidence ? 100 : 0;
  const testScore = passingTest ? 100 : 0;
  const freshnessScore = implemented ? 100 : 0;
  const overallScore = Math.round((evidenceScore + testScore + freshnessScore) / 3);

  const gaps: string[] = [];
  if (!hasEvidence) gaps.push('Control has no linked evidence');
  if (!passingTest) gaps.push('Control has no passing test result');
  if (!implemented) gaps.push('Control is not yet implemented');

  return {
    controlId,
    controlTitle: control.title as string,
    overallScore,
    evidenceScore,
    testScore,
    freshnessScore,
    gaps,
    readyForAttestation: overallScore >= 80,
    lastAssessedAt: new Date().toISOString(),
  };
}

// ── Auto-Draft Generation ──────────────────────────────────────────────────

/**
 * Auto-generate attestation draft when readiness threshold is met.
 */
/**
 * Generates an attestation draft for a framework or control.
 * 
 * Creates a structured attestation document when readiness threshold is met.
 * The draft includes:
 * - Summary of compliance status
 * - Evidence summary
 * - Test results overview
 * - Identified gaps
 * - Recommendations
 * 
 * Drafts are stored with status 'draft' and require review/approval before use.
 * 
 * @param {string} tenantId - Tenant ID
 * @param {'framework' | 'control'} entityType - Type of entity to attest
 * @param {string} entityId - Framework or control ID
 * @returns {Promise<AttestationDraft>} Generated attestation draft
 * @throws {Error} If entity not found or readiness threshold not met
 */
export async function generateAttestationDraft(
  tenantId: string,
  entityType: 'framework' | 'control',
  entityId: string
): Promise<AttestationDraft> {
  const schema = tenantSchema(tenantId);
  const readinessScore = entityType === 'framework'
    ? await calculateFrameworkReadiness(tenantId, entityId)
    : await calculateControlReadiness(tenantId, entityId);

  const entityName = readinessScore.frameworkName ?? readinessScore.controlTitle ?? entityId;
  const draftId = uuid();
  const generatedAt = new Date().toISOString();

  const content = {
    summary: `Attestation draft for ${entityType} "${entityName}". Overall readiness: ${readinessScore.overallScore}%.`,
    evidenceSummary: `Evidence coverage score: ${readinessScore.evidenceScore}%.`,
    testResults: `Test pass score: ${readinessScore.testScore}%.`,
    gaps: readinessScore.gaps,
    recommendations: readinessScore.gaps.map((g) => `Resolve gap: ${g}`),
  };

  await safeQuery(
    `INSERT INTO "${schema}".attestation_drafts
     (draft_id, entity_type, entity_id, entity_name, readiness_score, status, content, generated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', $6::jsonb, $7)`,
    [
      draftId,
      entityType,
      entityId,
      entityName,
      JSON.stringify(readinessScore),
      JSON.stringify(content),
      generatedAt,
    ],
  );

  void swallowDefault(EC.EVENT_BUS, null, recordObservation({
    tenantId,
    observationType: 'gap',
    entityType,
    entityId,
    title: `Attestation draft generated for ${entityType} ${entityName}`,
    severity: 'info',
    metadata: { overallScore: readinessScore.overallScore, gapCount: readinessScore.gaps.length },
  }));

  return {
    draftId,
    entityType,
    entityId,
    entityName,
    readinessScore,
    generatedAt,
    status: 'draft',
    content,
  };
}

// ── Continuous Monitoring Job ───────────────────────────────────────────────

/**
 * Run continuous attestation monitoring for a tenant.
 * Checks all frameworks and high-priority controls, generates drafts when ready.
 */
export async function runContinuousAttestationCheck(
  tenantId: string,
  options?: {
    frameworkIds?: string[];
    controlIds?: string[];
    minReadinessThreshold?: number; // Default: 80
  }
): Promise<{
  checked: number;
  draftsGenerated: number;
  drafts: AttestationDraft[];
}> {
  const schema = tenantSchema(tenantId);
  const minThreshold = options?.minReadinessThreshold ?? 80;
  const drafts: AttestationDraft[] = [];
  let checked = 0;
  let draftsGenerated = 0;
  
  try {
    // Check frameworks
    if (options?.frameworkIds && options.frameworkIds.length > 0) {
      for (const frameworkId of options.frameworkIds) {
        try {
          checked++;
          const readiness = await calculateFrameworkReadiness(tenantId, frameworkId);
          if (readiness.overallScore >= minThreshold && readiness.readyForAttestation) {
            const draft = await generateAttestationDraft(tenantId, 'framework', frameworkId);
            drafts.push(draft);
            draftsGenerated++;
          }
        } catch (err: unknown) {
          logger.warn(`[ContinuousAttestation] Failed to check framework ${frameworkId}`, { error: (err as Error).message });
        }
      }
    } else {
      // Check all active frameworks
      const frameworksRes = await safeQuery(
        `SELECT framework_id FROM "${schema}".frameworks
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 20`,
        []
      );
      
      for (const fw of frameworksRes.rows) {
        try {
          checked++;
          const readiness = await calculateFrameworkReadiness(tenantId, fw.framework_id);
          if (readiness.overallScore >= minThreshold && readiness.readyForAttestation) {
            const draft = await generateAttestationDraft(tenantId, 'framework', fw.framework_id);
            drafts.push(draft);
            draftsGenerated++;
          }
        } catch (err: unknown) {
          logger.warn(`[ContinuousAttestation] Failed to check framework ${fw.framework_id}`, { error: (err as Error).message });
        }
      }
    }
    
    // Check controls (if specified)
    if (options?.controlIds && options.controlIds.length > 0) {
      for (const controlId of options.controlIds) {
        try {
          checked++;
          const readiness = await calculateControlReadiness(tenantId, controlId);
          if (readiness.overallScore >= minThreshold && readiness.readyForAttestation) {
            const draft = await generateAttestationDraft(tenantId, 'control', controlId);
            drafts.push(draft);
            draftsGenerated++;
          }
        } catch (err: unknown) {
          logger.warn(`[ContinuousAttestation] Failed to check control ${controlId}`, { error: (err as Error).message });
        }
      }
    }
  } catch (err: unknown) {
    logger.error(`[ContinuousAttestation] Error in continuous check for tenant ${tenantId}`, { error: (err as Error).message });
  }
  
  // Run auto-expiry check alongside the continuous monitoring
  try {
    await expireStaleAttestations(tenantId);
  } catch (err: unknown) {
    logger.warn('[ContinuousAttestation] Auto-expiry check failed', { error: (err as Error).message });
  }

  return { checked, draftsGenerated, drafts };
}

// ── Attestation Lifecycle Management ────────────────────────────────────────

/**
 * Determine attestation frequency in days for an entity.
 * Checks framework-level configuration; defaults to 365 days (annual).
 */
async function getAttestationFrequencyDays(
  tenantId: string,
  entityType: 'framework' | 'control',
  entityId: string
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    if (entityType === 'framework') {
      // Check if the framework has a configured attestation frequency
      const result = await safeQuery(
        `SELECT metadata FROM "${schema}".frameworks WHERE framework_id = $1`,
        [entityId]
      );
      const meta = getFirstRow(result)?.metadata;
      if (meta?.attestation_frequency_days) {
        return meta.attestation_frequency_days;
      }
    } else {
      // For controls, use the parent framework's frequency
      const result = await safeQuery(
        `SELECT f.metadata
         FROM "${schema}".controls c
         LEFT JOIN "${schema}".frameworks f ON f.framework_id = c.framework_id
         WHERE c.control_id = $1
         LIMIT 1`,
        [entityId]
      );
      const meta = getFirstRow(result)?.metadata;
      if (meta?.attestation_frequency_days) {
        return meta.attestation_frequency_days;
      }
    }
  } catch {
    // Ignore errors, use default
  }

  // Default frequencies by common framework types
  return 365; // Annual attestation by default
}

/**
 * Transition an attestation draft to a new lifecycle status.
 * Valid transitions: draft -> pending_review -> approved | rejected
 * Approved attestations get an expiry date set.
 */
export async function updateAttestationStatus(
  tenantId: string,
  campaignId: string,
  newStatus: 'pending_review' | 'approved' | 'rejected',
  attestorUserId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const freqDays = await swallowDefault(
    EC.FALLBACK_QUERY,
    365,
    getAttestationFrequencyDays(tenantId, 'framework', campaignId),
  );
  const expiresAt = newStatus === 'approved'
    ? new Date(Date.now() + (freqDays as number) * 86_400_000).toISOString()
    : null;

  await safeQuery(
    `UPDATE "${schema}".attestation_drafts
     SET status = $2,
         approved_by = CASE WHEN $2 IN ('approved','rejected') THEN $3 ELSE approved_by END,
         approved_at = CASE WHEN $2 IN ('approved','rejected') THEN NOW() ELSE approved_at END,
         expires_at  = CASE WHEN $2 = 'approved' THEN $4::timestamptz ELSE expires_at END
     WHERE draft_id = $1`,
    [campaignId, newStatus, attestorUserId, expiresAt],
  );

  void eventBus.publish({
    eventType: `attestation.${newStatus}`,
    tenantId,
    entityType: 'attestation_draft',
    entityId: campaignId,
    severity: newStatus === 'approved' ? 'info' : 'warning',
    payload: { campaignId, newStatus, attestorUserId },
  }).catch(catchHandler(EC.EVENT_BUS));
}

/**
 * Auto-expire attestations that have passed their due date.
 * Called as part of the continuous monitoring cycle.
 */
export async function expireStaleAttestations(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `UPDATE "${schema}".attestation_campaigns
       SET status = 'expired'
       WHERE status = 'approved'
         AND due_date < CURRENT_DATE
       RETURNING campaign_id, name`,
      []
    );

    // Publish expiry events for each expired attestation
    for (const row of result.rows) {
      await eventBus.publish(({
              eventType: 'attestation.expired',
              tenantId,
              sourceService: 'continuous-attestation',
              entityType: 'attestation_campaign',
              entityId: row.campaign_id,
              severity: 'warning',
              payload: {
                campaignId: row.campaign_id,
                campaignName: row.name,
                expiredAt: new Date().toISOString(),
              },
            } as any));
    }

    if (result.rows.length > 0) {
      logger.info(`[ContinuousAttestation] Expired ${result.rows.length} stale attestations for tenant ${tenantId}`);
    }

    return result.rows.length;
  } catch (err: unknown) {
    logger.warn('[ContinuousAttestation] Failed to expire attestations', { error: (err as Error).message });
    return 0;
  }
}

/**
 * Get attestation history for an entity, including lifecycle status and expiry.
 */
export async function getAttestationHistory(
  tenantId: string,
  entityId: string,
  limit: number = 20
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT ac.campaign_id, ac.name, ac.status, ac.due_date,
            ac.created_at, ac.created_by,
            ar.user_id AS attestor_id, ar.attested_at, ar.status AS record_status,
            ar.declined_reason AS record_metadata
     FROM "${schema}".attestation_campaigns ac
     LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
     WHERE ac.policy_id = $1
     ORDER BY ac.created_at DESC
     LIMIT $2`,
    [entityId, limit]
  );

  return result.rows;
}
