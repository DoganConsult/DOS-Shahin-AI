import { logger } from '@dos/platform-core/observability';
// ============================================
// Audit Package Activities
// Audit package compilation and generation activities.
// Called by audit-package.workflow.ts.
// ============================================

import { assertTenantId, emptyResult, query as _query, safeQuery, tenantSchema } from '@dos/db';
import { createNotification as _createNotification } from '../../../adapters/notification.adapter';
import { recordAudit } from '../../../adapters/audit.adapter';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { toErrorMessage } from '@dos/platform-core/resilience';
import * as fs from 'fs/promises';
import * as path from 'path';
import { findSimilarRegulatoryContent } from '../utils/vector-search.util';
import { runEvidenceClassification } from '../../langgraph/templates/evidence-classification.template';
import { getFirstRow } from '../../utils/db-utils';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export interface AuditActivities {
  findScheduledAuditPackages(tenantId?: string): Promise<{
    packages: Array<{
      tenantId: string;
      frameworkVersionId: string;
      controlIds?: string[];
      exportFormats?: ('PDF' | 'XLSX' | 'ZIP')[];
      includeEvidence?: boolean;
      includeTraceability?: boolean;
    }>;
  }>;
  scopeAuditPackage(
    tenantId: string,
    packageId: string,
    frameworkVersionId: string,
    controlIds?: string[],
  ): Promise<{ controlIds: string[]; totalControls: number }>;
  collectEvidenceArtifacts(
    tenantId: string,
    packageId: string,
    controlIds: string[],
  ): Promise<{ evidenceIds: string[]; artifactCount: number }>;
  buildTraceabilityMatrix(
    tenantId: string,
    packageId: string,
    controlIds: string[],
    evidenceIds: string[],
  ): Promise<{ matrixId: string; rowCount: number }>;
  generatePackageExport(
    tenantId: string,
    packageId: string,
    exportFormat: 'PDF' | 'XLSX' | 'ZIP',
    includeTraceability: boolean,
  ): Promise<{ exportPath: string; fileSize: number }>;
  findRelevantRegulatoryContent(
    tenantId: string,
    queryText: string,
    contentType?: 'control' | 'framework' | 'obligation',
    similarityThreshold?: number,
    limit?: number,
  ): Promise<Array<{ contentId: string; titleEn: string; titleAr?: string; contentType: string; similarity: number; frameworkVersionId?: string }>>;
  classifyEvidenceWithAI(
    tenantId: string,
    evidenceId: string,
    evidenceMetadata?: Record<string, unknown>,
  ): Promise<{
    category: string;
    confidence: number;
    suggestedControls: Array<{ controlId: string; relevance: number; rationale: string }>;
    qualityTier: 'A' | 'B' | 'C';
  }>;
  finalizeAuditPackage(
    tenantId: string,
    packageId: string,
    metadata: {
      controlsIncluded: number;
      evidenceIncluded: number;
      exportLocations: Record<string, string>;
    },
  ): Promise<void>;
  markPackageFailed(tenantId: string, packageId: string, error: string): Promise<void>;
}

export async function findScheduledAuditPackages(
  tenantId?: string,
): Promise<{
  packages: Array<{
    tenantId: string;
    frameworkVersionId: string;
    controlIds?: string[];
    exportFormats?: ('PDF' | 'XLSX' | 'ZIP')[];
    includeEvidence?: boolean;
    includeTraceability?: boolean;
  }>;
}> {
  const _timeout = createTypedTimeout('5m');

  try {
    // If tenantId provided, query that tenant only
    if (tenantId) {
      assertTenantId(tenantId);
      const schema = tenantSchema(tenantId);

      // Query scheduled audit packages (assuming there's an audit_packages table with scheduled_at)
      // If the table doesn't exist, we'll query based on framework versions that need audit packages
      const result = await safeQuery(
        `SELECT DISTINCT
           fv.framework_version_id,
           fv.framework_id
         FROM \"${schema}\".framework_versions fv
         INNER JOIN \"${schema}\".tenant_controls tc ON fv.framework_version_id = tc.framework_version_id
         WHERE tc.tenant_id = $1
           AND fv.status = 'active'
         ORDER BY fv.framework_version_id
         LIMIT 50`,
        [tenantId],
      );

      const packages = result.rows.map((r) => ({
        tenantId,
        frameworkVersionId: r.framework_version_id,
        exportFormats: ['PDF', 'ZIP'] as ('PDF' | 'XLSX' | 'ZIP')[],
        includeEvidence: true,
        includeTraceability: true,
      }));

      return { packages };
    }

    // Otherwise, query all tenants
    const tenantsResult = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status = 'active'`,
    );

    const allPackages: Array<{
      tenantId: string;
      frameworkVersionId: string;
      controlIds?: string[];
      exportFormats?: ('PDF' | 'XLSX' | 'ZIP')[];
      includeEvidence?: boolean;
      includeTraceability?: boolean;
    }> = [];

    for (const tenantRow of tenantsResult.rows) {
      const tId = tenantRow.tenant_id;
      const schema = tenantSchema(tId);

      try {
        const result = await safeQuery(
          `SELECT DISTINCT
             fv.framework_version_id,
             fv.framework_id
           FROM \"${schema}\".framework_versions fv
           INNER JOIN \"${schema}\".tenant_controls tc ON fv.framework_version_id = tc.framework_version_id
           WHERE tc.tenant_id = $1
             AND fv.status = 'active'
           ORDER BY fv.framework_version_id
           LIMIT 20`,
          [tId],
        );

        for (const r of result.rows) {
          allPackages.push({
            tenantId: tId,
            frameworkVersionId: r.framework_version_id,
            exportFormats: ['PDF', 'ZIP'] as ('PDF' | 'XLSX' | 'ZIP')[],
            includeEvidence: true,
            includeTraceability: true,
          });
        }
      } catch (err) {
        logger.warn(`Failed to query audit packages for tenant ${tId}: ${toErrorMessage(err)}`);
      }
    }

    return { packages: allPackages };
  } catch (err: unknown) {
    throw new Error(`Failed to find scheduled audit packages: ${toErrorMessage(err)}`);
  }
}

export async function scopeAuditPackage(
  tenantId: string,
  packageId: string,
  frameworkVersionId: string,
  controlIds?: string[],
): Promise<{ controlIds: string[]; totalControls: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    let controlIdsResult: string[];

    if (controlIds && controlIds.length > 0) {
      // Use provided control IDs
      controlIdsResult = controlIds;
    } else {
      // Scope all applicable controls for the framework version
      const result = await safeQuery(
        `SELECT DISTINCT c.control_id
         FROM "${schema}".tenant_controls tc
         JOIN "${schema}".controls c ON tc.control_id = c.control_id
         WHERE c.framework_version_id = $1
           AND tc.status != 'not_applicable'
           AND tc.tenant_id = $2
         ORDER BY c.control_id`,
        [frameworkVersionId, tenantId],
      );
      controlIdsResult = result.rows.map((r) => r.control_id);
    }

    // Update audit package with scoped controls
    await safeQuery(
      `UPDATE "${schema}".audit_packages
       SET control_list = $1, updated_at = NOW()
       WHERE package_id = $2 AND tenant_id = $3`,
      [controlIdsResult, packageId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'scope',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: { frameworkVersionId, controlCount: controlIdsResult.length },
    });

    return {
      controlIds: controlIdsResult,
      totalControls: controlIdsResult.length,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to scope audit package: ${toErrorMessage(err)}`);
  }
}

export async function collectEvidenceArtifacts(
  tenantId: string,
  packageId: string,
  controlIds: string[],
): Promise<{ evidenceIds: string[]; artifactCount: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('30m');

  try {
    // Collect approved evidence for all controls
    const evidenceResult = await safeQuery(
      `SELECT DISTINCT e.evidence_id, e.control_id, e.artifact_type, e.collected_at, e.hash
       FROM "${schema}".evidence e
       WHERE e.control_id = ANY($1)
         AND e.status = 'approved'
         AND (e.valid_until IS NULL OR e.valid_until > NOW())
         AND e.tenant_id = $2
       ORDER BY e.collected_at DESC`,
      [controlIds, tenantId],
    );

    const evidenceIds = evidenceResult.rows.map((r) => r.evidence_id);
    const artifactCount = evidenceIds.length;

    // Update audit package with evidence bundle
    await safeQuery(
      `UPDATE "${schema}".audit_packages
       SET evidence_bundle = $1, updated_at = NOW()
       WHERE package_id = $2 AND tenant_id = $3`,
      [evidenceIds, packageId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'collect_evidence',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: { evidenceCount: artifactCount },
    });

    return {
      evidenceIds,
      artifactCount,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to collect evidence artifacts: ${toErrorMessage(err)}`);
  }
}

export async function buildTraceabilityMatrix(
  tenantId: string,
  packageId: string,
  controlIds: string[],
  evidenceIds: string[],
): Promise<{ matrixId: string; rowCount: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('general', 'buildTraceabilityMatrix', 600000);

  try {
    // Build traceability matrix: control -> evidence -> test result
    const matrixRows: Array<{
      control_id: string;
      evidence_id: string | null;
      test_result: string;
    }> = [];

    for (const controlId of controlIds) {
      // Find evidence for this control
      const evidenceResult = await safeQuery(
        `SELECT evidence_id, status
         FROM "${schema}".evidence
         WHERE control_id = $1
           AND evidence_id = ANY($2)
           AND tenant_id = $3
         ORDER BY collected_at DESC
         LIMIT 1`,
        [controlId, evidenceIds, tenantId],
      );

      const evidence = getFirstRow(evidenceResult);
      const testResult = evidence && evidence.status === 'approved' ? 'pass' : 'inconclusive';

      matrixRows.push({
        control_id: controlId,
        evidence_id: evidence?.evidence_id || null,
        test_result: testResult,
      });
    }

    // Create or update traceability matrix
    const matrixResult = await safeQuery(
      `INSERT INTO "${schema}".traceability_matrix
       (tenant_id, package_id, matrix_data, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW(), NOW())
       ON CONFLICT (tenant_id, package_id)
       DO UPDATE SET matrix_data = $3::jsonb, updated_at = NOW()
       RETURNING matrix_id`,
      [tenantId, packageId, JSON.stringify(matrixRows)],
    );

    const matrixId = getFirstRow(matrixResult)?.matrix_id;

    // Update audit package with traceability matrix reference
    await safeQuery(
      `UPDATE "${schema}".audit_packages
       SET traceability_matrix_id = $1, updated_at = NOW()
       WHERE package_id = $2 AND tenant_id = $3`,
      [matrixId, packageId, tenantId],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'build_matrix',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: { matrixId, rowCount: matrixRows.length },
    });

    return {
      matrixId: matrixId || '',
      rowCount: matrixRows.length,
    };
  } catch (err: unknown) {
    throw new Error(`Failed to build traceability matrix: ${toErrorMessage(err)}`);
  }
}

export async function generatePackageExport(
  tenantId: string,
  packageId: string,
  exportFormat: 'PDF' | 'XLSX' | 'ZIP',
  includeTraceability: boolean,
): Promise<{ exportPath: string; fileSize: number }> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const _timeout = createTypedTimeout('30m');

  try {
    // Get package details
    const packageResult = await safeQuery(
      `SELECT package_id, framework_version_id, control_list, evidence_bundle, traceability_matrix_id
       FROM "${schema}".audit_packages
       WHERE package_id = $1 AND tenant_id = $2`,
      [packageId, tenantId],
    );
    const pkg = getFirstRow(packageResult);
    if (!pkg) throw new Error(`Audit package not found: ${packageId}`);

    // Get framework details
    const frameworkResult = await safeQuery(
      `SELECT framework_name_en, framework_name_ar, version_label
       FROM "${schema}".framework_versions
       WHERE framework_version_id = $1`,
      [pkg.framework_version_id],
    );
    const framework = getFirstRow(frameworkResult);

    // Create export directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'exports', 'audit-packages', tenantId);
    await fs.mkdir(exportDir, { recursive: true });

    let exportPath: string;
    let fileSize: number;

    if (exportFormat === 'ZIP') {
      // Generate ZIP package with all artifacts
      const zipPath = path.join(exportDir, `audit-package-${packageId}.zip`);
      // In a real implementation, use a ZIP library (e.g., archiver, adm-zip)
      // For now, create a placeholder file
      const zipContent = JSON.stringify({
        packageId,
        framework: framework?.framework_name_en || 'Unknown',
        controls: pkg.control_list || [],
        evidence: pkg.evidence_bundle || [],
        traceabilityMatrix: includeTraceability ? pkg.traceability_matrix_id : null,
        generatedAt: new Date().toISOString(),
      });
      await fs.writeFile(zipPath, zipContent, 'utf-8');
      const stats = await fs.stat(zipPath);
      exportPath = zipPath;
      fileSize = stats.size;
    } else if (exportFormat === 'PDF') {
      const pdfPath = path.join(exportDir, `audit-package-${packageId}.pdf`);
      const PDFDocument = (await import('pdfkit')).default;
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Audit Package — ${framework?.framework_name_en || 'Unknown'}`, Author: 'AGRC Platform' } });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk: unknown) => { buffers.push(chunk as Buffer); });
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        doc.fontSize(20).text('Audit Package Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('#000').text(`Package ID: ${packageId}`);
        doc.text(`Framework: ${framework?.framework_name_en || 'Unknown'} / ${framework?.framework_name_ar || ''}`);
        doc.text(`Version: ${framework?.version_label || 'N/A'}`);
        doc.text(`Controls Included: ${(pkg.control_list || []).length}`);
        doc.text(`Evidence Artifacts: ${(pkg.evidence_bundle || []).length}`);
        doc.moveDown();
        if (includeTraceability && pkg.traceability_matrix_id) {
          doc.fontSize(14).text('Traceability Matrix');
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Matrix ID: ${pkg.traceability_matrix_id}`);
        }
        const controls = pkg.control_list || [];
        if (controls.length > 0) {
          doc.moveDown();
          doc.fontSize(14).fillColor('#000').text('Controls');
          doc.moveDown(0.5);
          for (const cid of controls.slice(0, 100)) {
            doc.fontSize(9).fillColor('#333').text(`• ${cid}`);
          }
          if (controls.length > 100) doc.fontSize(9).fillColor('#888').text(`... and ${controls.length - 100} more`);
        }
        doc.end();
      });
      await fs.writeFile(pdfPath, pdfBuffer);
      exportPath = pdfPath;
      fileSize = pdfBuffer.length;
    } else {
      const xlsxPath = path.join(exportDir, `audit-package-${packageId}.xlsx`);
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AGRC Platform';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Audit Package');
      sheet.columns = [
        { header: 'Control ID', key: 'controlId', width: 40 },
        { header: 'Evidence ID', key: 'evidenceId', width: 40 },
        { header: 'Test Result', key: 'testResult', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      const controls: string[] = pkg.control_list || [];
      const evidence: string[] = pkg.evidence_bundle || [];
      for (const controlId of controls) {
        const matchedEvidence = evidence.length > 0 ? evidence[0] : '';
        sheet.addRow({ controlId, evidenceId: matchedEvidence, testResult: matchedEvidence ? 'pass' : 'inconclusive', status: matchedEvidence ? 'verified' : 'pending' });
      }
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [{ header: 'Field', key: 'field', width: 30 }, { header: 'Value', key: 'value', width: 50 }];
      const summaryHeader = summarySheet.getRow(1);
      summaryHeader.font = { bold: true };
      summarySheet.addRow({ field: 'Package ID', value: packageId });
      summarySheet.addRow({ field: 'Framework', value: framework?.framework_name_en || 'Unknown' });
      summarySheet.addRow({ field: 'Total Controls', value: controls.length });
      summarySheet.addRow({ field: 'Total Evidence', value: evidence.length });
      summarySheet.addRow({ field: 'Generated', value: new Date().toISOString() });
      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      await fs.writeFile(xlsxPath, Buffer.from(xlsxBuffer as ArrayBuffer));
      const stats = await fs.stat(xlsxPath);
      exportPath = xlsxPath;
      fileSize = stats.size;
    }

    // Update audit package with export location
    await safeQuery(
      `UPDATE "${schema}".audit_packages
       SET export_locations = jsonb_set(
         COALESCE(export_locations, '{}'::jsonb),
         $1,
         $2::jsonb
       ), updated_at = NOW()
       WHERE package_id = $3 AND tenant_id = $4`,
      [
        `{${exportFormat}}`,
        JSON.stringify({ path: exportPath, size: fileSize, generatedAt: new Date().toISOString() }),
        packageId,
        tenantId,
      ],
    );

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'export',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: { format: exportFormat, fileSize },
    });

    return { exportPath, fileSize };
  } catch (err: unknown) {
    throw new Error(`Failed to generate package export: ${toErrorMessage(err)}`);
  }
}

/**
 * Find relevant regulatory content using vector similarity search.
 * Useful for audit package scoping to identify applicable controls, frameworks, or obligations.
 */
export async function findRelevantRegulatoryContent(
  tenantId: string,
  queryText: string,
  contentType: 'control' | 'framework' | 'obligation' = 'control',
  similarityThreshold: number = 0.7,
  limit: number = 10,
): Promise<Array<{
  contentId: string;
  titleEn: string;
  titleAr?: string;
  contentType: string;
  similarity: number;
  frameworkVersionId?: string;
}>> {
  assertTenantId(tenantId);
  return findSimilarRegulatoryContent(tenantId, queryText, contentType, similarityThreshold, limit);
}

/**
 * Use LangGraph evidence classification template for AI-powered evidence categorization.
 * Integration: Temporal + LangGraph + pgvector
 */
export async function classifyEvidenceWithAI(
  tenantId: string,
  evidenceId: string,
  evidenceMetadata?: Record<string, unknown>,
): Promise<{
  category: string;
  artifactType: string;
  confidence: number;
  tags: string[];
  suggestedControls: string[];
  qualityTier: 'A' | 'B' | 'C';
}> {
  assertTenantId(tenantId);
  const _timeout = createTypedTimeout('5m');

  try {
    // Use LangGraph evidence classification template (which uses pgvector for control matching)
    const classification = await runEvidenceClassification(tenantId, evidenceId, {
      metadata: {
        tenantId,
        evidenceId,
        temporalWorkflowId: evidenceId, // Link to evidence lifecycle workflow
        metadata: evidenceMetadata,
      },
    });

    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'ai_classify',
      entityType: 'evidence',
      entityId: evidenceId,
      afterState: {
        category: classification.category,
        qualityTier: classification.qualityTier,
        suggestedControlsCount: classification.suggestedControls?.length || 0,
      },
    });

    return classification;
  } catch (err: unknown) {
    throw new Error(`Failed to classify evidence with AI: ${toErrorMessage(err)}`);
  }
}

export async function finalizeAuditPackage(
  tenantId: string,
  packageId: string,
  metadata: {
    controlsIncluded: number;
    evidenceIncluded: number;
    exportLocations: Record<string, string>;
  },
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.audit_packages SET status = 'completed', controls_included = $1, evidence_included = $2, export_locations = $3, completed_at = NOW(), updated_at = NOW() WHERE id = $4`,
      [metadata.controlsIncluded, metadata.evidenceIncluded, JSON.stringify(metadata.exportLocations), packageId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'audit_package_finalized',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: metadata,
    });
  } catch (err: unknown) {
    throw new Error(`Failed to finalize audit package: ${toErrorMessage(err)}`);
  }
}

export async function markPackageFailed(
  tenantId: string,
  packageId: string,
  error: string,
): Promise<void> {
  await assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.audit_packages SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
      [error, packageId],
    );
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: 'audit',
      action: 'audit_package_failed',
      entityType: 'audit_package',
      entityId: packageId,
      afterState: { error },
    });
  } catch (err: unknown) {
    throw new Error(`Failed to mark audit package as failed: ${toErrorMessage(err)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// AI-First Audit Activities for Temporal Workflows
// ═══════════════════════════════════════════════════════════════

/**
 * AI-powered analysis of audit findings.
 * Identifies systemic issues, severity distribution, and remediation priorities.
 */
export async function aiAnalyzeAuditFindings(tenantId: string, auditId: string): Promise<Record<string, unknown>> {
  const { safeQuery, tenantSchema: tenantSchemaFn } = await import('../../config/database.js');
  const schema = tenantSchemaFn(tenantId);

  const findings = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${schema}".audit_findings WHERE audit_id = $1 ORDER BY severity DESC`,
    [auditId]
  ), { tenantId: tenantId, operation: 'query audit_findings' });

  const { claudeJSON } = await import('../../config/claude-client.js');
  return claudeJSON({
    systemPrompt: `You are an AI audit analysis engine. Analyze audit findings and provide insights.
Respond with JSON: {
  severity_distribution: {critical: number, high: number, medium: number, low: number},
  systemic_issues: [{theme: string, affected_findings: string[], root_cause: string}],
  risk_score: number (0-100),
  remediation_priority: [{finding_id: string, priority: number, estimated_effort: string}],
  management_summary: string,
  regulatory_implications: string[]
}`,
    userMessage: `Audit findings for audit ${auditId}:\n${JSON.stringify(findings.rows)}`,
    maxTokens: 2048,
    temperature: 0.2,
  });
}

/**
 * AI-powered audit report generator.
 * Creates a structured audit report with executive summary, recommendations, and overall rating.
 */
export async function aiGenerateAuditReport(tenantId: string, auditId: string): Promise<Record<string, unknown>> {
  const { withTenantClient } = await import('@dos/db');

  const tenantQuery = (sql: string, params: unknown[] = []) =>
    withTenantClient(tenantId, async (c) => c.query(sql, params));

  const [audit, findings, evidence] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), tenantQuery(`SELECT * FROM audits WHERE audit_id = $1`, [auditId]), { tenantId, operation: 'query audits' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), tenantQuery(`SELECT * FROM audit_findings WHERE audit_id = $1`, [auditId]), { tenantId, operation: 'query audit_findings' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), tenantQuery(`SELECT * FROM audit_evidence WHERE audit_id = $1`, [auditId]), { tenantId, operation: 'query audit_evidence' }),
  ]);

  const { claudeJSON } = await import('../../config/claude-client.js');
  return claudeJSON({
    systemPrompt: `You are an AI audit report generator. Create a structured audit report.
Respond with JSON: {
  executive_summary: string,
  scope: string,
  methodology: string,
  findings_summary: [{category: string, count: number, severity_breakdown: object}],
  key_observations: string[],
  recommendations: [{recommendation: string, priority: "immediate"|"short_term"|"long_term", owner: string}],
  conclusion: string,
  overall_rating: "satisfactory"|"needs_improvement"|"unsatisfactory"
}`,
    userMessage: `Audit: ${JSON.stringify(audit.rows[0])}\nFindings (${findings.rows.length}): ${JSON.stringify(findings.rows.slice(0, 20))}\nEvidence items: ${evidence.rows.length}`,
    maxTokens: 2048,
    temperature: 0.3,
  });
}
