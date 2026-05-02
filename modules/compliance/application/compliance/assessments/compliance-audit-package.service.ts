/**
 * Compliance Audit Package — audit package assembly, traceability matrix,
 * and multi-format export (PDF / XLSX / ZIP).
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import { safeQuery } from '../../../ports/database.port';
import { ctx } from "../../misc/compliance.utils.js";
import { getComplianceOverview } from "../reporting/compliance-workspace-overview.service";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import archiver from "archiver";
import type { GenericRow } from '@dos/types';
import { getFile, SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

// ═══════════════════════════════════════════════════════════════════
// 13. EXPORT COMPLIANCE REPORT
// ═══════════════════════════════════════════════════════════════════

export async function exportComplianceReport(tenantId: string) {
  const { getFrameworksRegister } = await import("../core/compliance-frameworks-obligations.service.js");
  const { getGapsRegister, getComplianceRoadmap } = await import("../reporting/compliance-gaps-roadmap.service.js");
  const { getAuditReadiness } = await import("../reporting/compliance-workspace-overview.service.js");
  const overview = await getComplianceOverview(tenantId);
  const frameworks = await getFrameworksRegister(tenantId);
  const { items: gaps } = await getGapsRegister(tenantId, undefined, undefined, { limit: 10000, offset: 0 });
  const roadmap = await getComplianceRoadmap(tenantId);
  const auditReadiness = await getAuditReadiness(tenantId);

  return {
    exportedAt: new Date().toISOString(),
    tenantId,
    overview: overview.summary,
    frameworks,
    gaps,
    roadmap,
    auditReadiness,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 13b. AUDIT PACKAGE (control → test → evidence → result + manifest)
// ═══════════════════════════════════════════════════════════════════

export interface AuditPackageOptions {
  frameworkId?: string;
  frameworkIds?: string[];
}

export interface AuditPackageResult {
  generatedAt: string;
  tenantId: string;
  frameworkIds: string[];
  controlList: Array<{
    controlId: string;
    title: string;
    testProcedure: { testId: string; method: string; result: string };
    evidenceIds: string[];
    result: string;
  }>;
  evidenceManifest: Array<{
    evidenceId: string;
    controlId: string;
    type: string;
    hash?: string;
    collectedAt: string | null;
    validUntil: string | null;
  }>;
  traceabilityMatrix: Array<{
    controlId: string;
    testId: string;
    evidenceId: string;
    result: string;
  }>;
  hashManifest: Array<{
    evidenceId: string;
    hash: string;
    algorithm: string;
    computedAt: string;
  }>;
  custodyEvents: Array<{
    evidenceId: string;
    eventType: string;
    actorUserId?: string;
    actorRole?: string;
    timestamp: string;
    notes?: string;
  }>;
}

export async function getAuditPackage(tenantId: string, options?: AuditPackageOptions): Promise<AuditPackageResult> {
  const { schema } = ctx(tenantId);

  let frameworkIds: string[];
  if (options?.frameworkId) {
    frameworkIds = [options.frameworkId];
  } else if (options?.frameworkIds && options.frameworkIds.length > 0) {
    frameworkIds = options.frameworkIds;
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`
    );
    frameworkIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }
  if (frameworkIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      frameworkIds: [],
      controlList: [],
      evidenceManifest: [],
      traceabilityMatrix: [],
      hashManifest: [],
      custodyEvents: [],
    };
  }

  // Get controls with their test procedures (real test procedures from test_procedures table)
  const ctrlRes = await safeQuery(
    `SELECT c.control_id, c.title, c.test_status, c.evidence_ids,
            COALESCE(
              (SELECT json_agg(json_build_object('test_id', test_id, 'method', test_method))
               FROM "${schema}".test_procedures tp
               WHERE tp.control_id = c.control_id AND tp.deleted_at IS NULL),
              json_build_array(json_build_object('test_id', c.control_id || '-test', 'method', 'test'))
            ) as test_procedures
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL AND (c.frameworks && $1::text[])
     ORDER BY c.title`,
    [frameworkIds]
  );
  const controls = ctrlRes.rows as Array<{
    control_id: string;
    title: string;
    test_status: string;
    evidence_ids: string[];
    test_procedures: Array<{ test_id: string; method: string }>;
  }>;

  const controlIds = controls.map((c) => c.control_id);
  const allEvidenceIds = new Set<string>();
  controls.forEach((c) => ((c.evidence_ids || []) as string[]).forEach((id) => allEvidenceIds.add(id)));

  // Get evidence details with hash information
  let evidenceRows: unknown[] = [];
  if (controlIds.length > 0 && allEvidenceIds.size > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, content_hash, submitted_at, expiry_date,
              artifact_type, source_type, quality_tier, version, previous_hash
       FROM "${schema}".evidence
       WHERE evidence_id = ANY($1) AND deleted_at IS NULL`,
      [Array.from(allEvidenceIds)]
    );
    evidenceRows = evRes.rows;
  }

  const evidenceMap = new Map(evidenceRows.map((e: GenericRow) => [e.evidence_id, e]));

  // Build control list with real test procedures
  const controlList = controls.map((c) => {
    const evidenceIds = (c.evidence_ids || []).filter((id) => evidenceMap.has(id));
    const result = (c.test_status || "not_tested").toLowerCase();
    const normalizedResult = result === "passed" || result === "partial" || result === "failed" || result === "na" ? result : "not_tested";
    const testProcedures = (c.test_procedures || []) as Array<{ test_id: string; method: string }>;
    const primaryTest = testProcedures.length > 0 ? testProcedures[0] : { test_id: `${c.control_id}-test`, method: "test" };

    return {
      controlId: c.control_id,
      title: c.title,
      testProcedure: {
        testId: primaryTest.test_id,
        method: primaryTest.method,
        result: normalizedResult,
      },
      evidenceIds,
      result: normalizedResult,
    };
  });

  // Build evidence manifest
  const evidenceManifest = evidenceRows.map((e: GenericRow) => ({
    evidenceId: e.evidence_id,
    controlId: e.control_id,
    type: e.artifact_type || "document",
    hash: e.content_hash || undefined,
    collectedAt: e.submitted_at ? new Date(e.submitted_at).toISOString() : null,
    validUntil: e.expiry_date ? new Date(e.expiry_date).toISOString().slice(0, 10) : null,
  }));

  // Build hash manifest (structured hash list for all evidence)
  const hashManifest = evidenceRows
    .filter((e: GenericRow) => e.content_hash)
    .map((e: GenericRow) => ({
      evidenceId: e.evidence_id,
      hash: e.content_hash,
      algorithm: "sha256", // Assuming SHA-256 based on evidence.service.ts patterns
      computedAt: e.submitted_at ? new Date(e.submitted_at).toISOString() : new Date().toISOString(),
    }));

  // Build traceability matrix with real test procedures
  const traceabilityMatrix: Array<{ controlId: string; testId: string; evidenceId: string; result: string }> = [];
  for (const ctrl of controls) {
    const result = (ctrl.test_status || "not_tested").toLowerCase();
    const normalizedResult = result === "passed" || result === "partial" || result === "failed" || result === "na" ? result : "not_tested";
    const evidenceIds = (ctrl.evidence_ids || []).filter((id) => evidenceMap.has(id));
    const testProcedures = (ctrl.test_procedures || []) as Array<{ test_id: string; method: string }>;

    if (testProcedures.length > 0) {
      // Use actual test procedures if available
      for (const testProc of testProcedures) {
        if (evidenceIds.length > 0) {
          for (const evidenceId of evidenceIds) {
            traceabilityMatrix.push({
              controlId: ctrl.control_id,
              testId: testProc.test_id,
              evidenceId,
              result: normalizedResult,
            });
          }
        } else {
          // Control has test but no evidence
          traceabilityMatrix.push({
            controlId: ctrl.control_id,
            testId: testProc.test_id,
            evidenceId: "",
            result: normalizedResult,
          });
        }
      }
    } else {
      // Fallback: use default test ID
      if (evidenceIds.length > 0) {
        for (const evidenceId of evidenceIds) {
          traceabilityMatrix.push({
            controlId: ctrl.control_id,
            testId: `${ctrl.control_id}-test`,
            evidenceId,
            result: normalizedResult,
          });
        }
      } else {
        traceabilityMatrix.push({
          controlId: ctrl.control_id,
          testId: `${ctrl.control_id}-test`,
          evidenceId: "",
          result: normalizedResult,
        });
      }
    }
  }

  // Build chain-of-custody events from audit_trail
  const custodyEvents: Array<{
    evidenceId: string;
    eventType: string;
    actorUserId?: string;
    actorRole?: string;
    timestamp: string;
    notes?: string;
  }> = [];

  if (allEvidenceIds.size > 0) {
    const custodyRes = await safeQuery(
      `SELECT entity_id as evidence_id, action, user_id, created_at,
              (after_state->>'reviewer_user_id')::text as reviewer_user_id,
              (after_state->>'status')::text as status,
              (after_state->>'notes')::text as notes
       FROM "${schema}".audit_trail
       WHERE entity_type = 'evidence'
         AND entity_id = ANY($1)
         AND action IN ('create', 'update', 'approve', 'reject', 'review', 'submit')
       ORDER BY created_at ASC`,
      [Array.from(allEvidenceIds)]
    );

    for (const event of custodyRes.rows) {
      let eventType = event.action;
      // Map audit_trail actions to custody event types
      if (event.action === 'create' || event.action === 'submit') {
        eventType = 'upload';
      } else if (event.action === 'approve') {
        eventType = 'approve';
      } else if (event.action === 'reject') {
        eventType = 'reject';
      } else if (event.action === 'review') {
        eventType = 'review';
      } else if (event.action === 'update') {
        // Determine if it's a supersede based on version change
        eventType = 'supersede'; // Could be enhanced to check version field
      }

      custodyEvents.push({
        evidenceId: event.evidence_id,
        eventType,
        actorUserId: event.user_id || event.reviewer_user_id || undefined,
        actorRole: undefined, // Could be enhanced to look up user role
        timestamp: new Date(event.created_at).toISOString(),
        notes: event.notes || undefined,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    frameworkIds,
    controlList,
    evidenceManifest,
    traceabilityMatrix,
    hashManifest,
    custodyEvents,
  };
}

// ============================================
// P3.3: Traceability Matrix (dedicated endpoint)
// ============================================

export interface TraceabilityMatrixResult {
  generatedAt: string;
  tenantId: string;
  frameworkIds: string[];
  matrix: Array<{
    controlId: string;
    controlTitle: string;
    testId: string;
    testMethod: string;
    evidenceId: string;
    evidenceTitle: string;
    result: string;
  }>;
}

/**
 * Get traceability matrix -- control -> test -> evidence -> result mapping.
 * Dedicated endpoint for traceability matrix only.
 */

// ============================================
// P4.2: Auditor Dashboard
// ============================================

export interface AuditorDashboardData {
  overview: {
    totalFrameworks: number;
    totalControls: number;
    totalFindings: number;
    openFindings: number;
    overdueFindings: number;
    evidenceItems: number;
    expiringEvidence: number;
    complianceScore: number;
    auditReadiness: number;
  };
  frameworks: Array<{
    frameworkId: string;
    frameworkCode: string;
    frameworkName: string;
    controlCount: number;
    implementedCount: number;
    gapCount: number;
    lastAssessmentDate: string | null;
  }>;
  topGaps: Array<{
    gapId: string;
    controlId: string;
    controlTitle: string;
    frameworkCode: string;
    severity: string;
    status: string;
    dueDate: string | null;
    daysOverdue: number | null;
  }>;
  evidenceStatus: {
    total: number;
    approved: number;
    pendingReview: number;
    expired: number;
    expiringSoon: number;
  };
  recentActivities: Array<{
    activityId: string;
    type: string;
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    timestamp: string;
  }>;
}

export async function getAuditorDashboard(tenantId: string): Promise<AuditorDashboardData> {
  const { schema } = ctx(tenantId);

  const { getFirstRow } = await import("@dos/db");
  const { getEvidencePort } = await import("../../../ports/evidence.port");
  const { getFindingsPort } = await import("../../../ports/findings.port");

  // Cross-module aggregates routed through ports (Patch 06 §2.5: do not query
  // evidence/findings tables directly — they live in adjacent module domains).
  const [findingsStats, evidenceStats] = await Promise.all([
    getFindingsPort().getStats({ tenantId }),
    getEvidencePort().getStats({ tenantId }),
  ]);

  // Overview metrics — only compliance-owned tables (frameworks, controls).
  // secrets-scan-allow: schema tenantSchema()-validated; remaining interpolation is literal table names
  const overviewRes = await safeQuery(
    `SELECT
      (SELECT COUNT(DISTINCT framework_code) FROM ${schema}.frameworks WHERE deleted_at IS NULL)::int AS total_frameworks,
      (SELECT COUNT(*) FROM ${schema}.controls WHERE deleted_at IS NULL)::int AS total_controls
    `
  );
  const baseRow = getFirstRow(overviewRes) || {};
  const ov = {
    ...baseRow,
    total_findings: findingsStats.totalFindings,
    open_findings: findingsStats.openFindings,
    overdue_findings: findingsStats.overdueFindings,
    evidence_items: evidenceStats.totalEvidence,
    expiring_evidence: evidenceStats.expiringEvidence,
  };

  // Compliance score (from latest snapshot or compute)
  const scoreRes = await safeQuery(
    `SELECT compliance_score
     FROM ${schema}.compliance_overview_snapshots
     WHERE tenant_id = $1
     ORDER BY captured_at DESC
     LIMIT 1`,
    [tenantId]
  );
  const complianceScore = getFirstRow(scoreRes)?.compliance_score || 0;

  // Audit readiness — sourced from evidence port (computes controls-with-approved-
  // evidence / total controls × 100). Direct cross-module SQL is forbidden by
  // Patch 06 §2.5; host adapter binds the real implementation.
  const { readiness: auditReadinessVal } = await getEvidencePort().getAuditReadiness({ tenantId });

  // Frameworks summary
  // secrets-scan-allow: schema tenantSchema()-validated; remaining interpolation is literal table names
  const frameworksRes = await safeQuery(
    `SELECT
      f.framework_id,
      f.framework_code,
      f.framework_name,
      COUNT(DISTINCT c.control_id)::int AS control_count,
      COUNT(DISTINCT CASE WHEN c.status = 'Implemented' THEN c.control_id END)::int AS implemented_count,
      COUNT(DISTINCT g.gap_id)::int AS gap_count,
      MAX(a.assessment_date)::text AS last_assessment_date
    FROM ${schema}.frameworks f
    LEFT JOIN ${schema}.controls c ON c.framework_code = f.framework_code AND c.deleted_at IS NULL
    LEFT JOIN ${schema}.gaps g ON g.control_id = c.control_id AND g.deleted_at IS NULL AND g.status != 'Closed'
    LEFT JOIN ${schema}.assessments a ON a.framework_code = f.framework_code AND a.deleted_at IS NULL
    WHERE f.deleted_at IS NULL
    GROUP BY f.framework_id, f.framework_code, f.framework_name
    ORDER BY f.framework_name
    `
  );

  // Top gaps (overdue or high severity)
  // secrets-scan-allow: schema tenantSchema()-validated; remaining interpolation is literal table names
  const gapsRes = await safeQuery(
    `SELECT
      g.gap_id,
      g.control_id,
      c.control_title,
      c.framework_code,
      g.severity,
      g.status,
      g.due_date::text,
      CASE
        WHEN g.due_date < NOW() AND g.status NOT IN ('Closed', 'Resolved')
        THEN EXTRACT(DAY FROM NOW() - g.due_date)::int
        ELSE NULL
      END AS days_overdue
    FROM ${schema}.gaps g
    JOIN ${schema}.controls c ON c.control_id = g.control_id
    WHERE g.deleted_at IS NULL
      AND c.deleted_at IS NULL
      AND g.status NOT IN ('Closed', 'Resolved')
    ORDER BY
      CASE g.severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        ELSE 4
      END,
      g.due_date NULLS LAST
    LIMIT 20
    `
  );

  // Evidence breakdown — routed through evidence port (Patch 06 §2.5).
  const ev = {
    total: evidenceStats.totalEvidence,
    approved: evidenceStats.approved ?? 0,
    pending_review: evidenceStats.pendingReview ?? 0,
    expired: evidenceStats.expired ?? 0,
    expiring_soon: evidenceStats.expiringEvidence,
  };

  // Recent activities (from audit log)
  const activitiesRes = await safeQuery(
    `SELECT
      audit_log_id AS activity_id,
      'audit_log' AS type,
      entity_type,
      entity_id,
      action,
      user_id AS actor,
      created_at::text AS timestamp
    FROM ${schema}.audit_log
    WHERE tenant_id = $1
      AND entity_type IN ('control', 'finding', 'evidence', 'gap', 'assessment', 'framework')
    ORDER BY created_at DESC
    LIMIT 50
    `,
    [tenantId]
  );

  return {
    overview: {
      totalFrameworks: ov.total_frameworks || 0,
      totalControls: ov.total_controls || 0,
      totalFindings: ov.total_findings || 0,
      openFindings: ov.open_findings || 0,
      overdueFindings: ov.overdue_findings || 0,
      evidenceItems: ov.evidence_items || 0,
      expiringEvidence: ov.expiring_evidence || 0,
      complianceScore: Number(complianceScore),
      auditReadiness: Number(auditReadinessVal),
    },
    frameworks: frameworksRes.rows.map((r) => ({
      frameworkId: r.framework_id,
      frameworkCode: r.framework_code,
      frameworkName: r.framework_name,
      controlCount: r.control_count || 0,
      implementedCount: r.implemented_count || 0,
      gapCount: r.gap_count || 0,
      lastAssessmentDate: r.last_assessment_date || null,
    })),
    topGaps: gapsRes.rows.map((r) => ({
      gapId: r.gap_id,
      controlId: r.control_id,
      controlTitle: r.control_title,
      frameworkCode: r.framework_code,
      severity: r.severity,
      status: r.status,
      dueDate: r.due_date || null,
      daysOverdue: r.days_overdue || null,
    })),
    evidenceStatus: {
      total: ev.total || 0,
      approved: ev.approved || 0,
      pendingReview: ev.pending_review || 0,
      expired: ev.expired || 0,
      expiringSoon: ev.expiring_soon || 0,
    },
    recentActivities: activitiesRes.rows.map((r) => ({
      activityId: r.activity_id,
      type: r.type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      actor: r.actor,
      timestamp: r.timestamp,
    })),
  };
}

export async function getTraceabilityMatrix(tenantId: string, options?: AuditPackageOptions): Promise<TraceabilityMatrixResult> {
  const { schema } = ctx(tenantId);

  let frameworkIds: string[];
  if (options?.frameworkId) {
    frameworkIds = [options.frameworkId];
  } else if (options?.frameworkIds && options.frameworkIds.length > 0) {
    frameworkIds = options.frameworkIds;
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`
    );
    frameworkIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }

  if (frameworkIds.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      tenantId,
      frameworkIds: [],
      matrix: [],
    };
  }

  // Get controls with their test status and evidence
  const ctrlRes = await safeQuery(
    `SELECT c.control_id, c.title, c.test_status, c.evidence_ids,
            COALESCE(
              (SELECT json_agg(json_build_object('test_id', test_id, 'method', test_method))
               FROM "${schema}".test_procedures tp
               WHERE tp.control_id = c.control_id AND tp.deleted_at IS NULL),
              json_build_array(json_build_object('test_id', c.control_id || '-test', 'method', 'test'))
            ) as test_procedures
     FROM "${schema}".controls c
     WHERE c.deleted_at IS NULL AND (c.frameworks && $1::text[])
     ORDER BY c.title`,
    [frameworkIds]
  );

  const controlIds = ctrlRes.rows.map((r: GenericRow) => r.control_id);
  const allEvidenceIds = new Set<string>();
  ctrlRes.rows.forEach((r: GenericRow) => {
    ((r.evidence_ids || []) as string[]).forEach((id: string) => allEvidenceIds.add(id));
  });

  // Get evidence details
  let evidenceMap = new Map();
  if (controlIds.length > 0 && allEvidenceIds.size > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, file_path, content_hash, submitted_at
       FROM "${schema}".evidence
       WHERE evidence_id = ANY($1) AND deleted_at IS NULL`,
      [Array.from(allEvidenceIds)]
    );
    evidenceMap = new Map(evRes.rows.map((e: GenericRow) => [e.evidence_id, e]));
  }

  // Build traceability matrix
  const matrix: TraceabilityMatrixResult['matrix'] = [];
  for (const ctrl of ctrlRes.rows) {
    const controlId = ctrl.control_id;
    const controlTitle = ctrl.title;
    const testStatus = (ctrl.test_status || "not_tested").toLowerCase();
    const normalizedResult = testStatus === "passed" || testStatus === "partial" || testStatus === "failed" || testStatus === "na" ? testStatus : "not_tested";
    const evidenceIds = ((ctrl.evidence_ids || []) as string[]).filter((id) => evidenceMap.has(id));
    const testProcedures = (ctrl.test_procedures || []) as Array<{ test_id: string; method: string }>;

    if (testProcedures.length > 0) {
      // Use actual test procedures if available
      for (const testProc of testProcedures) {
        if (evidenceIds.length > 0) {
          for (const evidenceId of evidenceIds) {
            const evidence = evidenceMap.get(evidenceId);
            matrix.push({
              controlId,
              controlTitle,
              testId: testProc.test_id,
              testMethod: testProc.method,
              evidenceId,
              evidenceTitle: evidence?.title || `Evidence ${evidenceId.slice(0, 8)}`,
              result: normalizedResult,
            });
          }
        } else {
          // Control has test but no evidence
          matrix.push({
            controlId,
            controlTitle,
            testId: testProc.test_id,
            testMethod: testProc.method,
            evidenceId: "",
            evidenceTitle: "",
            result: normalizedResult,
          });
        }
      }
    } else {
      // Fallback: use default test ID
      if (evidenceIds.length > 0) {
        for (const evidenceId of evidenceIds) {
          const evidence = evidenceMap.get(evidenceId);
          matrix.push({
            controlId,
            controlTitle,
            testId: `${controlId}-test`,
            testMethod: "test",
            evidenceId,
            evidenceTitle: evidence?.title || `Evidence ${evidenceId.slice(0, 8)}`,
            result: normalizedResult,
          });
        }
      } else {
        matrix.push({
          controlId,
          controlTitle,
          testId: `${controlId}-test`,
          testMethod: "test",
          evidenceId: "",
          evidenceTitle: "",
          result: normalizedResult,
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    frameworkIds,
    matrix,
  };
}

export type ExportAuditPackFormat = "pdf" | "xlsx" | "zip";

export interface ExportAuditPackResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/** Generate audit pack in PDF, XLSX, or ZIP format for download. */
export async function exportAuditPack(
  tenantId: string,
  format: ExportAuditPackFormat,
  options?: AuditPackageOptions,
): Promise<ExportAuditPackResult> {
  const reportData = await exportComplianceReport(tenantId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const pdfDone = new Promise<void>((resolve) => { doc.on('end', resolve); });
    doc
      .fontSize(18).text('Compliance Audit Package', { align: 'center' })
      .moveDown()
      .fontSize(12).text(`Generated: ${new Date().toISOString()}`)
      .text(`Tenant: ${tenantId}`)
      .moveDown()
      .text(JSON.stringify(reportData, null, 2));
    doc.end();
    await pdfDone;
    const buffer = Buffer.concat(chunks);
    return { buffer, filename: `audit-pack-${timestamp}.pdf`, contentType: 'application/pdf' };
  }

  if (format === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compliance Summary');
    ws.addRow(['Field', 'Value']);
    ws.addRow(['Generated', new Date().toISOString()]);
    ws.addRow(['Tenant', tenantId]);
    const matrix = (options?.includeTraceabilityMatrix)
      ? await buildTraceabilityMatrix(tenantId, options?.frameworkIds ?? [])
      : null;
    if (matrix) {
      const ms = wb.addWorksheet('Traceability Matrix');
      ms.addRow(['Control ID', 'Control Title', 'Test ID', 'Method', 'Evidence ID', 'Evidence Title', 'Result']);
      for (const row of matrix.matrix) {
        ms.addRow([row.controlId, row.controlTitle, row.testId, row.testMethod, row.evidenceId, row.evidenceTitle, row.result]);
      }
    }
    const buffer = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
    return { buffer, filename: `audit-pack-${timestamp}.xlsx`, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  const archive = archiver('zip', { zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  archive.append(JSON.stringify(reportData, null, 2), { name: 'compliance-report.json' });
  await archive.finalize();
  const buffer = Buffer.concat(chunks);
  return { buffer, filename: `audit-pack-${timestamp}.zip`, contentType: 'application/zip' };
}
