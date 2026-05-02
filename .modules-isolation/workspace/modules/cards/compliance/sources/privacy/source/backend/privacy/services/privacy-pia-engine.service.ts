// ============================================
// Shahin-Ai — Privacy PIA Engine
// Privacy impact assessment creation/scoring,
// risk matrix, templates, mitigation recommendations
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type PiaStatus = "draft" | "in_review" | "approved" | "rejected";
export type PrivacyRiskLevel = "low" | "medium" | "high" | "critical";

export interface PiaRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: PiaStatus;
  projectName: string;
  assessorId: string;
  riskScore: number | null;
  riskLevel: PrivacyRiskLevel | null;
  findings: PiaFinding[];
  mitigations: PiaMitigation[];
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PiaFinding {
  findingId: string;
  category: string;
  description: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: PrivacyRiskLevel;
}

export interface PiaMitigation {
  mitigationId: string;
  findingId: string;
  description: string;
  residualRisk: PrivacyRiskLevel;
  status: "proposed" | "implemented";
}

export interface CreatePiaData {
  title: string;
  description?: string;
  projectName: string;
  assessorId: string;
  createdBy: string;
}

// === Pure Functions ===

export function computePiaRiskScore(likelihood: number, impact: number): number {
  return Math.round(likelihood * impact * 10) / 10;
}

export function classifyPiaRisk(score: number): PrivacyRiskLevel {
  if (score >= 7) return "critical";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function computeOverallPiaScore(findings: PiaFinding[]): number {
  if (findings.length === 0) return 0;
  const total = findings.reduce((sum, f) => sum + f.riskScore, 0);
  return Math.round((total / findings.length) * 10) / 10;
}

export function generateMitigationRecommendations(finding: PiaFinding): string[] {
  const recs: Record<string, string[]> = {
    data_minimization: ["Collect only data strictly necessary for the purpose", "Implement data minimization policy"],
    consent: ["Obtain explicit consent before processing", "Implement consent management system"],
    retention: ["Define and enforce data retention schedules", "Implement automated data deletion"],
    security: ["Encrypt data at rest and in transit", "Implement access controls and audit logging"],
    third_party: ["Conduct vendor privacy assessments", "Establish data processing agreements"],
  };
  return recs[finding.category] ?? ["Review data processing activities", "Consult with DPO for guidance"];
}

export const PIA_TEMPLATES = {
  new_system: {
    name: "New IT System Assessment",
    sections: ["data_inventory", "consent", "security", "retention", "third_party"],
  },
  existing_system: {
    name: "Existing System Review",
    sections: ["data_inventory", "security", "retention"],
  },
  marketing: {
    name: "Marketing Campaign Assessment",
    sections: ["consent", "data_minimization", "third_party"],
  },
};

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): PiaRecord {
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",

    status: r.status,

    projectName: r.metadata?.projectName || r.title,

    assessorId: r.metadata?.assessorId || r.created_by,

    riskScore: r.metadata?.riskScore ?? null,

    riskLevel: r.metadata?.riskLevel ?? null,

    findings: r.metadata?.findings || [],

    mitigations: r.metadata?.mitigations || [],

    approvedBy: r.metadata?.approvedBy || null,

    approvedAt: r.metadata?.approvedAt || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createPia(tenantId: string, data: CreatePiaData): Promise<PiaRecord> {
  const schema = tenantSchema(tenantId);
  const metadata = { projectName: data.projectName, assessorId: data.assessorId, findings: [], mitigations: [], riskScore: null, riskLevel: null };

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, created_by, metadata)
     VALUES ($1,$2,$3,'draft','access','system','system@internal',$4,$5)
     RETURNING *`,
    [tenantId, data.title, data.description || "", data.createdBy, JSON.stringify(metadata)]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getPia(tenantId: string, id: string): Promise<PiaRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('PIA not found');
  return mapRow(row as any);
}

export async function addPiaFinding(
  tenantId: string,
  piaId: string,
  finding: Omit<PiaFinding, "findingId" | "riskScore" | "riskLevel">
): Promise<PiaRecord> {
  const schema = tenantSchema(tenantId);
  const pia = await getPia(tenantId, piaId);

  const riskScore = computePiaRiskScore(finding.likelihood, finding.impact);
  const riskLevel = classifyPiaRisk(riskScore);
  const newFinding: PiaFinding = {
    findingId: `finding_${Date.now()}`,
    ...finding,
    riskScore,
    riskLevel,
  };

  const findings = [...pia.findings, newFinding];
  const overallScore = computeOverallPiaScore(findings);
  const overallLevel = classifyPiaRisk(overallScore);

  const updatedMeta = {
    ...pia,
    findings,
    riskScore: overallScore,
    riskLevel: overallLevel,
    projectName: pia.projectName,
    assessorId: pia.assessorId,
    mitigations: pia.mitigations,
    approvedBy: pia.approvedBy,
    approvedAt: pia.approvedAt,
  };

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(updatedMeta), piaId]
  );
  return mapRow(getFirstRow(result)!);
}

export async function approvePia(
  tenantId: string,
  piaId: string,
  approverId: string
): Promise<PiaRecord> {
  const schema = tenantSchema(tenantId);
  const pia = await getPia(tenantId, piaId);

  const updatedMeta = {
    projectName: pia.projectName, assessorId: pia.assessorId,
    findings: pia.findings, mitigations: pia.mitigations,
    riskScore: pia.riskScore, riskLevel: pia.riskLevel,
    approvedBy: approverId, approvedAt: new Date().toISOString(),
  };

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET status = 'approved', metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(updatedMeta), piaId]
  );
  return mapRow(getFirstRow(result)!);
}

export async function listPias(tenantId: string, status?: PiaStatus): Promise<PiaRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`];
  const params: unknown[] = [];

  if (status) { conditions.push(`status = $1`); params.push(status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow);
}
