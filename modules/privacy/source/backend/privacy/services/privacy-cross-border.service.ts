// ============================================
// Shahin-Ai — Privacy Cross-Border Transfer
// Transfer assessment, adequacy decisions, SCCs,
// transfer impact assessments
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type TransferSafeguard = "adequacy_decision" | "scc" | "bcr" | "binding_rules" | "derogation" | "none";
export type TransferRisk = "low" | "medium" | "high" | "prohibited";

export interface CrossBorderAssessment {
  id: string;
  tenantId: string;
  title: string;
  destinationCountry: string;
  recipientOrganization: string;
  purposeOfTransfer: string;
  dataCategories: string[];
  safeguard: TransferSafeguard;
  safeguardDocumentRef: string | null;
  adequacyDecisionRef: string | null;
  sccVersion: string | null;
  riskLevel: TransferRisk;
  transferVolumePerMonth: number | null;
  tiaCompleted: boolean;
  tiaFindings: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  status: "draft" | "approved" | "rejected" | "expired";
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateTransferAssessmentData {
  title: string;
  destinationCountry: string;
  recipientOrganization: string;
  purposeOfTransfer: string;
  dataCategories: string[];
  safeguard: TransferSafeguard;
  safeguardDocumentRef?: string;
  transferVolumePerMonth?: number;
  createdBy: string;
}

// === Pure Functions ===

const ADEQUACY_DECISION_COUNTRIES = [
  "andorra", "argentina", "canada", "faroe_islands", "guernsey", "israel",
  "isle_of_man", "japan", "jersey", "new_zealand", "republic_of_korea",
  "switzerland", "united_kingdom", "uruguay",
];

export function hasAdequacyDecision(country: string): boolean {
  return ADEQUACY_DECISION_COUNTRIES.includes(country.toLowerCase().replace(/ /g, "_"));
}

export function assessTransferRisk(
  country: string,
  safeguard: TransferSafeguard,
  dataCategories: string[]
): TransferRisk {
  const sensitiveCategories = ["health", "biometric", "genetic", "criminal", "political"];
  const hasSensitive = dataCategories.some(c => sensitiveCategories.some(s => c.toLowerCase().includes(s)));

  if (safeguard === "none") return hasSensitive ? "prohibited" : "high";
  if (hasAdequacyDecision(country)) return "low";
  if (safeguard === "adequacy_decision") return "low";
  if (safeguard === "scc" || safeguard === "bcr" || safeguard === "binding_rules") {
    return hasSensitive ? "medium" : "low";
  }
  if (safeguard === "derogation") return hasSensitive ? "high" : "medium";
  return "high";
}

export function isTiaRequired(riskLevel: TransferRisk, dataCategories: string[]): boolean {
  const sensitiveCategories = ["health", "biometric", "genetic", "criminal"];
  const hasSensitive = dataCategories.some(c => sensitiveCategories.some(s => c.toLowerCase().includes(s)));
  return riskLevel === "high" || riskLevel === "prohibited" || hasSensitive;
}

export function computeReviewDate(approvedAt: Date, safeguard: TransferSafeguard): Date {
  const reviewMonths = safeguard === "adequacy_decision" ? 24 : 12;
  return new Date(approvedAt.getTime() + reviewMonths * 30 * 24 * 60 * 60 * 1000);
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): CrossBorderAssessment {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    destinationCountry: meta.destinationCountry || "",

    recipientOrganization: meta.recipientOrganization || "",

    purposeOfTransfer: meta.purposeOfTransfer || r.description || "",

    dataCategories: meta.dataCategories || [],

    safeguard: meta.safeguard || "none",

    safeguardDocumentRef: meta.safeguardDocumentRef || null,

    adequacyDecisionRef: meta.adequacyDecisionRef || null,

    sccVersion: meta.sccVersion || null,

    riskLevel: meta.riskLevel || "medium",

    transferVolumePerMonth: meta.transferVolumePerMonth || null,

    tiaCompleted: meta.tiaCompleted ?? false,

    tiaFindings: meta.tiaFindings || null,

    approvedBy: meta.approvedBy || null,

    approvedAt: meta.approvedAt || null,
    status: r.status as CrossBorderAssessment["status"],

    reviewDate: meta.reviewDate || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createTransferAssessment(
  tenantId: string,
  data: CreateTransferAssessmentData
): Promise<CrossBorderAssessment> {
  const schema = tenantSchema(tenantId);
  const riskLevel = assessTransferRisk(data.destinationCountry, data.safeguard, data.dataCategories);
  const tiaRequired = isTiaRequired(riskLevel, data.dataCategories);

  const metadata = {
    destinationCountry: data.destinationCountry,
    recipientOrganization: data.recipientOrganization,
    purposeOfTransfer: data.purposeOfTransfer,
    dataCategories: data.dataCategories,
    safeguard: data.safeguard,
    safeguardDocumentRef: data.safeguardDocumentRef || null,
    adequacyDecisionRef: hasAdequacyDecision(data.destinationCountry) ? `Adequacy Decision: ${data.destinationCountry}` : null,
    sccVersion: data.safeguard === "scc" ? "2021" : null,
    riskLevel,
    transferVolumePerMonth: data.transferVolumePerMonth || null,
    tiaCompleted: false,
    tiaFindings: null,
    tiaRequired,
    approvedBy: null,
    approvedAt: null,
    reviewDate: null,
  };

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, created_by, metadata)
     VALUES ($1,$2,$3,'draft','access','transfer','transfer@internal',$4,$5)
     RETURNING *`,
    [tenantId, data.title, data.purposeOfTransfer, data.createdBy, JSON.stringify(metadata)]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getTransferAssessment(tenantId: string, id: string): Promise<CrossBorderAssessment> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Transfer assessment not found');
  return mapRow(row as any);
}

export async function approveTransferAssessment(
  tenantId: string,
  id: string,
  approverId: string
): Promise<CrossBorderAssessment> {
  const schema = tenantSchema(tenantId);
  const current = await getTransferAssessment(tenantId, id);
  const meta = { ...(current as any), approvedBy: approverId, approvedAt: new Date().toISOString(), status: 'approved' };
  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET status = 'approved', metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(meta), id],
  );
  return mapRow(getFirstRow(result) as any);
}

export async function recordTiaFindings(
  tenantId: string,
  id: string,
  findings: string
): Promise<CrossBorderAssessment> {
  const schema = tenantSchema(tenantId);
  const current = await getTransferAssessment(tenantId, id);
  const meta = { ...current, id: undefined, tenantId: undefined, title: undefined, createdAt: undefined, updatedAt: undefined, createdBy: undefined, status: undefined, tiaCompleted: true, tiaFindings: findings };

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(meta), id]
  );
  return mapRow(getFirstRow(result)!);
}

export async function listTransferAssessments(
  tenantId: string,
  filters?: { status?: CrossBorderAssessment["status"]; destinationCountry?: string }
): Promise<CrossBorderAssessment[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`, `data_subject_email = 'transfer@internal'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow).filter(t => !filters?.destinationCountry || t.destinationCountry === filters.destinationCountry);
}

export async function getTransfersByCountry(tenantId: string): Promise<Record<string, number>> {
  const transfers = await listTransferAssessments(tenantId, { status: "approved" });
  return transfers.reduce((acc, t) => {
    acc[t.destinationCountry] = (acc[t.destinationCountry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
