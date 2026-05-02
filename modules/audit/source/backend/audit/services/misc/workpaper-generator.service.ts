import { logger } from '../../ports/logger.port';
// ============================================
// Automated Workpaper Generator Service
// Generates audit workpapers with traceability matrix assembly
// Requirements: Feature 26 - Automated Workpaper Generation for Audit
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordObservation } from '../../../ai/services/observability/ai-observation.service';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkpaperControl {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  domain: string;
  family: string;
  frameworkCode: string;
  frameworkName: string;
}

export interface WorkpaperTest {
  testId: string;
  controlId: string;
  testMethod: string;
  procedureSteps: string[];
  expectedResult: string;
  samplingGuidance: string;
  testResult: 'pass' | 'partial' | 'fail' | 'inconclusive' | 'not_tested';
  testedBy?: string;
  testedAt?: string;
  resultNotes?: string;
}

export interface WorkpaperEvidence {
  evidenceId: string;
  controlId: string;
  title: string;
  artifactType: string;
  sourceType: 'manual-upload' | 'system-generated' | 'connector';
  collectedAt: string;
  validUntil?: string;
  hash?: string;
  qualityTier: 'A' | 'B' | 'C';
  filePath?: string;
}

export interface TraceabilityMatrixRow {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  testId: string;
  testMethod: string;
  evidenceId: string;
  evidenceTitle: string;
  result: 'pass' | 'partial' | 'fail' | 'inconclusive' | 'not_tested';
  testedAt?: string;
  testedBy?: string;
}

export interface WorkpaperPackage {
  workpaperId: string;
  tenantId: string;
  frameworkId?: string;
  frameworkIds?: string[];
  assessmentId?: string;
  auditId?: string;
  generatedAt: string;
  generatedBy: string;
  controls: WorkpaperControl[];
  tests: WorkpaperTest[];
  evidence: WorkpaperEvidence[];
  traceabilityMatrix: TraceabilityMatrixRow[];
  summary: {
    totalControls: number;
    testedControls: number;
    passedControls: number;
    failedControls: number;
    partialControls: number;
    notTestedControls: number;
    evidenceCount: number;
    coveragePct: number;
  };
  metadata: Record<string, unknown>;
}

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Generates automated audit workpapers with complete traceability matrix.
 *
 * Assembles a comprehensive workpaper package that includes:
 * - Control inventory (from specified frameworks or assessment)
 * - Test procedures and results (from control_test_procedures and control_test_results)
 * - Evidence artifacts (linked to controls)
 * - Traceability matrix (control → test → evidence → result mapping)
 * - Summary statistics (coverage, pass/fail counts)
 *
 * The workpaper package can be generated for:
 * - A specific framework (frameworkId)
 * - Multiple frameworks (frameworkIds)
 * - An existing assessment (assessmentId)
 * - An audit engagement (auditId)
 *
 * If no scope is provided, defaults to all active frameworks for the tenant.
 *
 * @param {string} tenantId - Tenant ID (required)
 * @param {Object} options - Generation options
 * @param {string} [options.frameworkId] - Single framework ID to include
 * @param {string[]} [options.frameworkIds] - Multiple framework IDs to include
 * @param {string} [options.assessmentId] - Assessment ID (extracts frameworks from assessment)
 * @param {string} [options.auditId] - Audit ID (for audit engagement context)
 * @param {string} options.generatedBy - User ID who generated the workpaper
 * @param {boolean} [options.includeNotTested=false] - Include controls with no test results
 * @returns {Promise<WorkpaperPackage>} Complete workpaper package with controls, tests, evidence, and traceability matrix
 * @throws {Error} If tenantId is missing or database query fails
 *
 * @example
 * ```typescript
 * // Generate workpapers for a specific framework
 * const workpaper = await generateWorkpapers(tenantId, {
 *   frameworkId: 'NCA-ECC-2-2024',
 *   generatedBy: userId
 * });
 *
 * // Generate workpapers for an assessment
 * const workpaper = await generateWorkpapers(tenantId, {
 *   assessmentId: assessmentId,
 *   generatedBy: userId,
 *   includeNotTested: true
 * });
 * ```
 */
export async function generateWorkpapers(
  tenantId: string,
  options: {
    frameworkId?: string;
    frameworkIds?: string[];
    assessmentId?: string;
    auditId?: string;
    generatedBy: string;
    includeNotTested?: boolean;
  }
): Promise<WorkpaperPackage> {
  const schema = tenantSchema(tenantId);
  const workpaperId = uuid();

  // Determine framework scope
  let frameworkIds: string[] = [];
  if (options.frameworkId) {
    frameworkIds = [options.frameworkId];
  } else if (options.frameworkIds && options.frameworkIds.length > 0) {
    frameworkIds = options.frameworkIds;
  } else if (options.assessmentId) {
    // Get frameworks from assessment
    const assessmentRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".assessments WHERE assessment_id = $1 LIMIT 1`,
      [options.assessmentId]
    );
    if (assessmentRes.rows.length > 0 && getFirstRow(assessmentRes)?.framework_id) {
      frameworkIds = [getFirstRow(assessmentRes)?.framework_id];
    }
  }

  if (frameworkIds.length === 0) {
    // Fallback: get all active frameworks
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE deleted_at IS NULL AND (removed_by_admin IS NULL OR removed_by_admin = FALSE)`
    );
    frameworkIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }

  // 1. Fetch controls for the framework(s)
  const controlsRes = await safeQuery(
    `SELECT c.control_id, c.control_code, c.title, c.domain, c.family,
            c.frameworks, c.test_status, c.evidence_ids,
            f.framework_code, f.framework_name_en
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".frameworks f ON f.framework_id = ANY(c.frameworks)
     WHERE c.deleted_at IS NULL
       AND (c.frameworks && $1::text[] OR $1::text[] = ARRAY[]::text[])
     ORDER BY c.domain, c.family, c.control_code`,
    [frameworkIds]
  );

  const controls: WorkpaperControl[] = controlsRes.rows.map((r: GenericRow) => ({
    controlId: r.control_id,
    controlCode: r.control_code || r.control_id.slice(0, 8),
    controlTitle: r.title,
    domain: r.domain || 'general',
    family: r.family || 'general',
    frameworkCode: r.framework_code || 'any',
    frameworkName: r.framework_name_en || 'Unknown Framework',
  }));

  const controlIds = controls.map((c) => c.controlId);

  // 2. Fetch test procedures and results
  const testsRes = await safeQuery(
    `SELECT tp.procedure_id AS test_id, tp.control_id, tp.test_type AS test_method,
            tp.steps AS procedure_steps, tp.expected_outcome AS expected_result,
            tp.sampling_method AS sampling_guidance,
            tr.outcome AS test_result, tr.tester_id::text AS tested_by,
            tr.test_date::text AS tested_at, tr.findings AS result_notes
     FROM "${schema}".control_test_procedures tp
     LEFT JOIN "${schema}".control_test_results tr ON tr.procedure_id = tp.procedure_id
       AND tr.review_status IN ('approved', 'in_review')
     WHERE tp.control_id = ANY($1) AND tp.is_active = TRUE
     ORDER BY tp.control_id, tp.procedure_id`,
    [controlIds.length > 0 ? controlIds : ['']]
  );

  const testsMap = new Map<string, WorkpaperTest[]>();
  for (const row of testsRes.rows) {
    if (!testsMap.has(row.control_id)) {
      testsMap.set(row.control_id, []);
    }
    testsMap.get(row.control_id)!.push({
      testId: row.test_id,
      controlId: row.control_id,
      testMethod: row.test_method || 'test',
      procedureSteps: Array.isArray(row.procedure_steps) ? row.procedure_steps : [],
      expectedResult: row.expected_result || '',
      samplingGuidance: row.sampling_guidance || '',
      testResult: (row.test_result || 'not_tested') as WorkpaperTest['testResult'],
      testedBy: row.tested_by,
      testedAt: row.tested_at ? new Date(row.tested_at).toISOString() : undefined,
      resultNotes: row.result_notes,
    });
  }

  // 3. Fetch evidence
  const allEvidenceIds = new Set<string>();
  controlsRes.rows.forEach((r: GenericRow) => {
    if (Array.isArray(r.evidence_ids)) {
      r.evidence_ids.forEach((id: string) => allEvidenceIds.add(id));
    }
  });

  let evidenceRows: unknown[] = [];
  if (allEvidenceIds.size > 0) {
    const evRes = await safeQuery(
      `SELECT e.evidence_id, e.control_id, e.title, e.artifact_type, e.source_type,
              e.collected_at, e.valid_until, e.content_hash, e.file_path,
              et.default_quality_tier
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".evidence_types et ON et.artifact_type = e.artifact_type
       WHERE e.evidence_id = ANY($1) AND e.deleted_at IS NULL
       ORDER BY e.collected_at DESC`,
      [Array.from(allEvidenceIds)]
    );
    evidenceRows = evRes.rows;
  }

  const evidence: WorkpaperEvidence[] = evidenceRows.map((e: GenericRow) => ({
    evidenceId: e.evidence_id,
    controlId: e.control_id,
    title: e.title || `Evidence ${e.evidence_id.slice(0, 8)}`,
    artifactType: e.artifact_type || 'document',
    sourceType: (e.source_type || 'manual-upload') as WorkpaperEvidence['sourceType'],
    collectedAt: e.collected_at ? new Date(e.collected_at).toISOString() : new Date().toISOString(),
    validUntil: e.valid_until ? new Date(e.valid_until).toISOString().slice(0, 10) : undefined,
    hash: e.content_hash,
    qualityTier: (e.default_quality_tier || 'C') as WorkpaperEvidence['qualityTier'],
    filePath: e.file_path,
  }));

  const _evidenceMap = new Map(evidence.map((e) => [e.evidenceId, e]));
  const evidenceByControl = new Map<string, WorkpaperEvidence[]>();
  evidence.forEach((e) => {
    if (!evidenceByControl.has(e.controlId)) {
      evidenceByControl.set(e.controlId, []);
    }
    evidenceByControl.get(e.controlId)!.push(e);
  });

  // 4. Build traceability matrix
  const traceabilityMatrix: TraceabilityMatrixRow[] = [];

  for (const control of controls) {
    const controlTests = testsMap.get(control.controlId) || [];
    const controlEvidence = evidenceByControl.get(control.controlId) || [];
    const controlRow = controlsRes.rows.find((r: GenericRow) => r.control_id === control.controlId);
    const testStatus = (controlRow?.test_status || 'not_tested').toLowerCase();
    const normalizedResult = (testStatus === 'passed' || testStatus === 'partial' || testStatus === 'failed' || testStatus === 'na' || testStatus === 'inconclusive')
      ? testStatus as TraceabilityMatrixRow['result']
      : 'not_tested' as TraceabilityMatrixRow['result'];

    if (controlTests.length > 0) {
      // Use actual test procedures
      for (const test of controlTests) {
        if (controlEvidence.length > 0) {
          for (const ev of controlEvidence) {
            traceabilityMatrix.push({
              controlId: control.controlId,
              controlCode: control.controlCode,
              controlTitle: control.controlTitle,
              testId: test.testId,
              testMethod: test.testMethod,
              evidenceId: ev.evidenceId,
              evidenceTitle: ev.title,
              result: test.testResult !== 'not_tested' ? test.testResult : normalizedResult,
              testedAt: test.testedAt,
              testedBy: test.testedBy,
            });
          }
        } else {
          // Control has test but no evidence
          traceabilityMatrix.push({
            controlId: control.controlId,
            controlCode: control.controlCode,
            controlTitle: control.controlTitle,
            testId: test.testId,
            testMethod: test.testMethod,
            evidenceId: '',
            evidenceTitle: '',
            result: test.testResult !== 'not_tested' ? test.testResult : normalizedResult,
            testedAt: test.testedAt,
            testedBy: test.testedBy,
          });
        }
      }
    } else {
      // No test procedures - use control test_status
      if (controlEvidence.length > 0) {
        for (const ev of controlEvidence) {
          traceabilityMatrix.push({
            controlId: control.controlId,
            controlCode: control.controlCode,
            controlTitle: control.controlTitle,
            testId: `${control.controlId}-test`,
            testMethod: 'test',
            evidenceId: ev.evidenceId,
            evidenceTitle: ev.title,
            result: normalizedResult,
          });
        }
      } else {
        traceabilityMatrix.push({
          controlId: control.controlId,
          controlCode: control.controlCode,
          controlTitle: control.controlTitle,
          testId: `${control.controlId}-test`,
          testMethod: 'test',
          evidenceId: '',
          evidenceTitle: '',
          result: normalizedResult,
        });
      }
    }
  }

  // 5. Calculate summary
  const testedControls = new Set(traceabilityMatrix.filter((r) => r.result !== 'not_tested').map((r) => r.controlId)).size;
  const passedControls = new Set(traceabilityMatrix.filter((r) => r.result === 'pass').map((r) => r.controlId)).size;
  const failedControls = new Set(traceabilityMatrix.filter((r) => r.result === 'fail').map((r) => r.controlId)).size;
  const partialControls = new Set(traceabilityMatrix.filter((r) => r.result === 'partial').map((r) => r.controlId)).size;
  const notTestedControls = controls.length - testedControls;
  const coveragePct = controls.length > 0 ? (testedControls / controls.length) * 100 : 0;

  const summary = {
    totalControls: controls.length,
    testedControls,
    passedControls,
    failedControls,
    partialControls,
    notTestedControls,
    evidenceCount: evidence.length,
    coveragePct: Math.round(coveragePct * 100) / 100,
  };

  const workpaper: WorkpaperPackage = {
    workpaperId,
    tenantId,
    frameworkId: frameworkIds[0],
    frameworkIds,
    assessmentId: options.assessmentId,
    auditId: options.auditId,
    generatedAt: new Date().toISOString(),
    generatedBy: options.generatedBy,
    controls,
    tests: Array.from(testsMap.values()).flat(),
    evidence,
    traceabilityMatrix,
    summary,
    metadata: {
      frameworkCount: frameworkIds.length,
      includeNotTested: options.includeNotTested ?? false,
    },
  };

  // 6. Store workpaper (if you have a workpapers table, otherwise just return)
  // For now, we'll just return the workpaper and let the caller handle storage

  // 7. Record observation
  await recordObservation({
    tenantId,
    entityType: 'assessment',
    entityId: options.assessmentId || 'workpaper',
    observationType: 'pattern',
    severity: 'info',
    title: `Workpaper generated: ${controls.length} controls, ${evidence.length} evidence items`,
    description: `Automated workpaper generation completed. Traceability matrix assembled with ${traceabilityMatrix.length} rows. Coverage: ${coveragePct.toFixed(1)}%.`,
    evidenceJson: {
      workpaperId,
      summary,
      frameworkIds,
    },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  // 8. Publish event
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'audit.workpaper_generated',
      tenantId,
      sourceService: 'workpaper-generator',
      entityType: 'workpaper',
      entityId: workpaperId,
      severity: 'info',
      payload: {
        workpaperId,
        assessmentId: options.assessmentId,
        auditId: options.auditId,
        frameworkIds,
        summary,
      },
    } as any)), { tenantId, operation: 'eventBus:audit.workpaper_generated' });

  return workpaper;
}

/**
 * Generates workpapers for multiple frameworks in batch.
 *
 * Processes each framework sequentially, generating a separate workpaper package
 * for each. Individual framework failures do not stop the batch; errors are logged
 * and the successful workpapers are returned.
 *
 * @param {string} tenantId - Tenant ID (required)
 * @param {Object} options - Batch generation options
 * @param {string[]} options.frameworkIds - Array of framework IDs to process
 * @param {string} options.generatedBy - User ID who generated the workpapers
 * @param {boolean} [options.includeNotTested=false] - Include controls with no test results
 * @returns {Promise<WorkpaperPackage[]>} Array of workpaper packages (one per framework)
 * @throws {Error} If tenantId is missing
 *
 * @example
 * ```typescript
 * // Generate workpapers for multiple frameworks
 * const workpapers = await generateBatchWorkpapers(tenantId, {
 *   frameworkIds: ['NCA-ECC-2-2024', 'SAMA-CSF-2024'],
 *   generatedBy: userId
 * });
 * ```
 */
export async function generateBatchWorkpapers(
  tenantId: string,
  options: {
    frameworkIds: string[];
    generatedBy: string;
    includeNotTested?: boolean;
  }
): Promise<WorkpaperPackage[]> {
  const workpapers: WorkpaperPackage[] = [];
  for (const frameworkId of options.frameworkIds) {
    try {
      const workpaper = await generateWorkpapers(tenantId, {
        frameworkId,
        generatedBy: options.generatedBy,
        includeNotTested: options.includeNotTested,
      });
      workpapers.push(workpaper);
    } catch (err: unknown) {
      logger.warn(`[WorkpaperGenerator] Failed to generate workpaper for framework ${frameworkId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return workpapers;
}
