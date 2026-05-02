// ============================================
// Shahin-Ai — Records Retention Service
// Retention schedule enforcement, policy
// compliance checking, period calculation,
// schedule reporting
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export interface RetentionPolicy {
  policyId: string;
  name: string;
  recordType: string;
  classification: string;
  retentionDays: number;
  legalBasis: string;
  jurisdictions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface RetentionComplianceResult {
  recordId: string;
  title: string;
  recordType: string;
  classification: string;
  currentRetentionDays: number | null;
  requiredRetentionDays: number;
  isCompliant: boolean;
  gapDays: number;
  disposalDate: string | null;
  policyName: string;
}

export interface RetentionScheduleReport {
  tenantId: string;
  generatedAt: string;
  totalRecords: number;
  compliant: number;
  nonCompliant: number;
  dueForDisposal: number;
  upcoming30Days: number;
  byRecordType: Record<string, { compliant: number; nonCompliant: number }>;
}

// === Pure Functions ===

export function computeRetentionEndDate(createdAt: Date, retentionDays: number): Date {
  return new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

export function isRetentionCompliant(
  currentRetentionDays: number | null,
  requiredRetentionDays: number
): boolean {
  if (currentRetentionDays === null) return false;
  return currentRetentionDays >= requiredRetentionDays;
}

export function computeRetentionGap(
  currentRetentionDays: number | null,
  requiredRetentionDays: number
): number {
  if (currentRetentionDays === null) return requiredRetentionDays;
  return Math.max(0, requiredRetentionDays - currentRetentionDays);
}

export function isDueForDisposal(disposalDate: string | null, now: Date = new Date()): boolean {
  if (!disposalDate) return false;
  return new Date(disposalDate) <= now;
}

// === DB-backed Functions ===

function mapPolicy( r: Record<string, unknown>): RetentionPolicy {
  return {

    policyId: r.policy_id,

    name: r.name,

    recordType: r.record_type,

    classification: r.classification,
    retentionDays: parseInt((r as any).retention_days, 10),

    legalBasis: r.legal_basis || "",

    jurisdictions: r.jurisdictions || [],

    isActive: r.is_active,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function createRetentionPolicy(
  tenantId: string,
  data: {
    name: string;
    recordType: string;
    classification: string;
    retentionDays: number;
    legalBasis?: string;
    jurisdictions?: string[];
  }
): Promise<RetentionPolicy> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".record_retention_policies
      (name, record_type, classification, retention_days, legal_basis, jurisdictions, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`,
    [
      data.name, data.recordType, data.classification, data.retentionDays,
      data.legalBasis || "", JSON.stringify(data.jurisdictions || []),
    ]
  );
  return mapPolicy(getFirstRow(result)!);
}

export async function getApplicablePolicy(
  tenantId: string,
  recordType: string,
  classification: string
): Promise<RetentionPolicy | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".record_retention_policies
     WHERE record_type = $1 AND classification = $2 AND is_active = true
     ORDER BY retention_days DESC LIMIT 1`,
    [recordType, classification]
  );
  const row = getFirstRow(result)!;
  return row ? mapPolicy(row) : null;
}

export async function checkCompliance(
  tenantId: string,
  recordId: string
): Promise<RetentionComplianceResult> {
  const schema = tenantSchema(tenantId);
  const recResult = await safeQuery(
    `SELECT id, title, record_type, classification, retention_period, disposal_date
     FROM "${schema}".records_records
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [recordId],
  ).catch(() => ({ rows: [] as any[] }));
  const rec = recResult.rows[0] as any;
  if (!rec) {
    return {
      recordId,
      title: '',
      recordType: '',
      classification: '',
      currentRetentionDays: null,
      requiredRetentionDays: 0,
      isCompliant: false,
      gapDays: 0,
      disposalDate: null,
      policyName: '',
    };
  }

  const recordType = String(rec.record_type ?? '');
  const classification = String(rec.classification ?? '');
  const policy = await getApplicablePolicy(tenantId, recordType, classification);
  const requiredRetentionDays = policy?.retentionDays ?? 365;
  const currentRetentionDays = rec.retention_period != null ? parseInt(String(rec.retention_period), 10) : null;
  const isCompliant = isRetentionCompliant(currentRetentionDays, requiredRetentionDays);
  const gapDays = computeRetentionGap(currentRetentionDays, requiredRetentionDays);

  return {
    recordId,
    title: String(rec.title ?? ''),
    recordType,
    classification,
    currentRetentionDays,
    requiredRetentionDays,
    isCompliant,
    gapDays,
    disposalDate: rec.disposal_date ? String(rec.disposal_date) : null,
    policyName: policy?.name ?? 'default',
  };
}

export async function enforceRetentionPolicies(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  const records = await safeQuery(
    `SELECT r.id, r.record_type, r.classification, r.created_at, r.retention_period
     FROM "${schema}".records_records r
     WHERE r.status = 'active' AND r.legal_hold = false AND r.deleted_at IS NULL`
  );

  let updated = 0;
  for (const rec of records.rows) {
    const policy = await getApplicablePolicy(tenantId, rec.record_type, rec.classification);
    if (!policy) continue;

    const current = rec.retention_period !== null ? parseInt(rec.retention_period, 10) : null;
    if (isRetentionCompliant(current, policy.retentionDays)) continue;

    const disposalDate = computeRetentionEndDate(new Date(rec.created_at), policy.retentionDays).toISOString();
    await safeQuery(
      `UPDATE "${schema}".records_records
       SET retention_period = $1, disposal_date = $2, updated_at = NOW()
       WHERE id = $3`,
      [policy.retentionDays, disposalDate, rec.id]
    );
    updated++;
  }
  return updated;
}

export async function getRetentionScheduleReport(tenantId: string): Promise<RetentionScheduleReport> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const stats = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE disposal_date IS NOT NULL AND disposal_date <= $1) AS due_disposal,
       COUNT(*) FILTER (WHERE disposal_date > $1 AND disposal_date <= $2) AS upcoming
     FROM "${schema}".records_records
     WHERE deleted_at IS NULL AND status NOT IN ('disposed')`,
    [now, in30]
  );

  const byType = await safeQuery(
    `SELECT record_type,
       COUNT(*) FILTER (WHERE retention_period IS NOT NULL) AS compliant,
       COUNT(*) FILTER (WHERE retention_period IS NULL) AS non_compliant
     FROM "${schema}".records_records
     WHERE deleted_at IS NULL AND status NOT IN ('disposed')
     GROUP BY record_type`
  );

  const s = stats.rows[0];
  const byRecordType: Record<string, { compliant: number; nonCompliant: number }> = {};
  for (const r of byType.rows) {
    byRecordType[r.record_type] = {
      compliant: parseInt(r.compliant, 10) || 0,
      nonCompliant: parseInt(r.non_compliant, 10) || 0,
    };
  }

  const total = parseInt(s.total, 10) || 0;
  const nonCompliant = Object.values(byRecordType).reduce((sum, v) => sum + v.nonCompliant, 0);

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalRecords: total,
    compliant: total - nonCompliant,
    nonCompliant,
    dueForDisposal: parseInt(s.due_disposal, 10) || 0,
    upcoming30Days: parseInt(s.upcoming, 10) || 0,
    byRecordType,
  };
}
