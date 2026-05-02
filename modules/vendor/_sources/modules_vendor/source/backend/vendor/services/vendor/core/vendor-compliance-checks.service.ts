import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Compliance Checks
// Covers: evidence auto-collection from
// connector syncs, privacy/PDPL assessment,
// and vendor staff training compliance.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Vendor Evidence Auto-Collection ───────────────────────────────────────────

/**
 * Bridge connector sync results to vendor evidence satisfaction.
 * When a connector syncs (e.g., SOC2 report, ISO cert), check if any vendor
 * evidence requirements can be auto-satisfied.
 */
export async function processConnectorSyncForVendorEvidence(
  tenantId: string,
  connectorId: string,
  connectorType: string,
  syncedRecords: Array<{ recordType: string; recordId: string; metadata?: Record<string, unknown> }>,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let satisfied = 0;

  // Map connector types to evidence types
  const evidenceTypeMap: Record<string, string[]> = {
    'soc2': ['soc2_report', 'audit_report'],
    'iso27001': ['iso_certification', 'security_cert'],
    'pentest': ['penetration_test', 'security_assessment'],
    'financial': ['financial_statement', 'credit_report'],
    'insurance': ['insurance_certificate', 'cyber_insurance'],
    'compliance': ['compliance_attestation', 'regulatory_report'],
    'privacy': ['dpia', 'privacy_assessment', 'pdpl_compliance'],
  };

  const matchingEvidenceTypes = evidenceTypeMap[connectorType] ?? [connectorType];

  // Find vendor evidence requirements that match the synced data
  const pendingRes = await safeQuery(
    `SELECT ve.evidence_id, ve.vendor_id, ve.evidence_type, ve.control_id
     FROM "${schema}".vendor_evidence ve
     WHERE ve.status IN ('pending', 'requested', 'expired')
       AND ve.evidence_type = ANY($1)`,
    [matchingEvidenceTypes],
  );

  for (const row of pendingRes.rows) {
    // Find a matching synced record
    const matchingRecord = syncedRecords.find(
      r => matchingEvidenceTypes.includes(r.recordType),
    );

    if (matchingRecord) {
      // Auto-satisfy the evidence requirement
      await safeQuery(
        `UPDATE "${schema}".vendor_evidence
         SET status = 'auto_collected',
             source_connector_id = $2,
             source_record_id = $3,
             collected_at = NOW(),
             metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
             updated_at = NOW()
         WHERE evidence_id = $1`,
        [
          row.evidence_id,
          connectorId,
          matchingRecord.recordId,
          JSON.stringify({ autoCollected: true, connectorType, syncTimestamp: new Date().toISOString() }),
        ],
      );

      satisfied++;

      await eventBus.publish(({
              eventType: 'vendor.evidence_auto_satisfied',
              tenantId,
              sourceService: 'vendor-enhancements',
              severity: 'info',
              entityType: 'vendor_evidence',
              entityId: row.evidence_id,
              payload: {
                vendorId: row.vendor_id,
                evidenceId: row.evidence_id,
                evidenceType: row.evidence_type,
                connectorId,
                connectorType,
                sourceRecordId: matchingRecord.recordId,
              },
            } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
    }
  }

  return satisfied;
}

// ── Privacy/PDPL Assessment ───────────────────────────────────────────────────

/**
 * Assess a vendor's privacy/PDPL compliance based on their declared capabilities.
 * Returns a privacy compliance assessment with per-category scores.
 */
export async function assessVendorPrivacyCompliance(
  tenantId: string,
  vendorId: string,
  privacyData: {
    hasPrivacyPolicy: boolean;
    dataProcessingAgreement: boolean;
    crossBorderTransferMechanism?: string;
    dataRetentionPolicy: boolean;
    breachNotificationProcess: boolean;
    dpiaCompleted: boolean;
    consentManagement: boolean;
    dataSubjectRightsProcess: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
  },
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Ensure privacy assessment table exists
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_privacy_assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      privacy_score NUMERIC(5,2) DEFAULT 0,
      pdpl_compliant BOOLEAN DEFAULT FALSE,
      has_privacy_policy BOOLEAN DEFAULT FALSE,
      data_processing_agreement BOOLEAN DEFAULT FALSE,
      cross_border_transfer_mechanism VARCHAR(100),
      data_retention_policy BOOLEAN DEFAULT FALSE,
      breach_notification_process BOOLEAN DEFAULT FALSE,
      dpia_completed BOOLEAN DEFAULT FALSE,
      consent_management BOOLEAN DEFAULT FALSE,
      data_subject_rights_process BOOLEAN DEFAULT FALSE,
      encryption_at_rest BOOLEAN DEFAULT FALSE,
      encryption_in_transit BOOLEAN DEFAULT FALSE,
      assessment_date TIMESTAMPTZ DEFAULT NOW(),
      assessed_by UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Calculate privacy score (weighted sum of criteria)
  const weights: Record<string, number> = {
    hasPrivacyPolicy: 10,
    dataProcessingAgreement: 15,
    dataRetentionPolicy: 10,
    breachNotificationProcess: 15,
    dpiaCompleted: 10,
    consentManagement: 10,
    dataSubjectRightsProcess: 10,
    encryptionAtRest: 10,
    encryptionInTransit: 10,
  };

  let score = 0;
  if (privacyData.hasPrivacyPolicy) score += weights.hasPrivacyPolicy;
  if (privacyData.dataProcessingAgreement) score += weights.dataProcessingAgreement;
  if (privacyData.dataRetentionPolicy) score += weights.dataRetentionPolicy;
  if (privacyData.breachNotificationProcess) score += weights.breachNotificationProcess;
  if (privacyData.dpiaCompleted) score += weights.dpiaCompleted;
  if (privacyData.consentManagement) score += weights.consentManagement;
  if (privacyData.dataSubjectRightsProcess) score += weights.dataSubjectRightsProcess;
  if (privacyData.encryptionAtRest) score += weights.encryptionAtRest;
  if (privacyData.encryptionInTransit) score += weights.encryptionInTransit;

  // PDPL compliance requires key criteria
  const pdplCompliant =
    privacyData.dataProcessingAgreement &&
    privacyData.breachNotificationProcess &&
    privacyData.consentManagement &&
    privacyData.dataSubjectRightsProcess;

  const result = await safeQuery(
    `INSERT INTO "${schema}".vendor_privacy_assessments
       (vendor_id, privacy_score, pdpl_compliant,
        has_privacy_policy, data_processing_agreement,
        cross_border_transfer_mechanism, data_retention_policy,
        breach_notification_process, dpia_completed,
        consent_management, data_subject_rights_process,
        encryption_at_rest, encryption_in_transit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      vendorId, score, pdplCompliant,
      privacyData.hasPrivacyPolicy, privacyData.dataProcessingAgreement,
      privacyData.crossBorderTransferMechanism ?? null, privacyData.dataRetentionPolicy,
      privacyData.breachNotificationProcess, privacyData.dpiaCompleted,
      privacyData.consentManagement, privacyData.dataSubjectRightsProcess,
      privacyData.encryptionAtRest, privacyData.encryptionInTransit,
    ],
  );

  const assessment = getFirstRow(result)!;

  // Update vendor record with latest privacy fields
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET privacy_score = $2, pdpl_compliant = $3, updated_at = NOW()
     WHERE vendor_id = $1`,
    [vendorId, score, pdplCompliant],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  // If not PDPL compliant, flag the vendor
  if (!pdplCompliant) {
    await eventBus.publish(({
          eventType: 'privacy.impact_high',
          tenantId,
          sourceService: 'vendor-enhancements',
          severity: 'warning',
          entityType: 'vendor_privacy_assessment',
          entityId: assessment?.assessment_id,
          payload: { vendorId, privacyScore: score, pdplCompliant: false, assessmentId: assessment?.assessment_id },
        } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  }

  return assessment;
}

// ── Training Compliance ───────────────────────────────────────────────────────

/**
 * Check if vendor staff have completed required training modules.
 * Returns compliance status per training requirement.
 */
export async function checkVendorTrainingCompliance(
  tenantId: string,
  vendorId: string,
): Promise<{
  compliant: boolean;
  completionRate: number;
  requirements: Array<{ trainingId: string; title: string; required: boolean; completed: boolean; completedAt?: string }>;
}> {
  const schema = tenantSchema(tenantId);

  // Get required training for this vendor
  const reqRes = await safeQuery(
    `SELECT vtr.training_requirement_id, vtr.training_id, t.title, vtr.required,
            tc.completed_at
     FROM "${schema}".vendor_training_requirements vtr
     LEFT JOIN "${schema}".training_modules t ON t.training_id = vtr.training_id
     LEFT JOIN "${schema}".vendor_training_completions tc
       ON tc.vendor_id = vtr.vendor_id AND tc.training_id = vtr.training_id
     WHERE vtr.vendor_id = $1`,
    [vendorId],
  );

  if (reqRes.rows.length === 0) {
    return { compliant: true, completionRate: 100, requirements: [] };
  }

  const requirements = reqRes.rows.map((row: GenericRow) => ({
    trainingId: row.training_id,
    title: row.title ?? 'Unknown Training',
    required: row.required ?? true,
    completed: !!row.completed_at,
    completedAt: row.completed_at ?? undefined,
  }));

  const requiredItems = requirements.filter((r: GenericRow) => r.required);
  const completedRequired = requiredItems.filter((r: GenericRow) => r.completed);
  const completionRate = requiredItems.length > 0
    ? Math.round((completedRequired.length / requiredItems.length) * 100)
    : 100;
  const compliant = requiredItems.length === completedRequired.length;

  // Update vendor training status
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET training_compliant = $2, training_completion_rate = $3, updated_at = NOW()
     WHERE vendor_id = $1`,
    [vendorId, compliant, completionRate],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  // If non-compliant, emit event
  if (!compliant) {
    await eventBus.publish(({
          eventType: 'training.compliance_gap',
          tenantId,
          sourceService: 'vendor-enhancements',
          severity: 'warning',
          entityType: 'vendor',
          entityId: vendorId,
          payload: { vendorId, compliant, completionRate, missingCount: requiredItems.length - completedRequired.length },
        } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  }

  return { compliant, completionRate, requirements };
}
