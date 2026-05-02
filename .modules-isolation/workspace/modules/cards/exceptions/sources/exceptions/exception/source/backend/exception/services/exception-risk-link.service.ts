import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type RiskLinkType = "direct" | "indirect" | "compensating";
export type EffectivenessRating = "effective" | "partially_effective" | "ineffective" | "not_assessed";

export interface ExceptionRiskLink {
  linkId: string;
  exceptionId: string;
  riskId: string | null;
  controlId: string | null;
  linkType: RiskLinkType;
  impactDescription: string;
  residualRiskLevel: "low" | "medium" | "high" | "critical";
  compensatingControlIds: string[];
  compensatingControlEffectiveness: EffectivenessRating;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface RiskPostureImpact {
  exceptionId: string;
  controlId: string | null;
  riskIds: string[];
  overallImpact: "low" | "medium" | "high" | "critical";
  compensatingControlsEffective: boolean;
  postureScore: number;
  recommendation: string;
}

export interface CompensatingControlAssessment {
  controlId: string;
  effectiveness: EffectivenessRating;
  evidenceItems: string[];
  lastAssessedAt: string;
  assessedBy: string;
  notes: string;
}

// === Pure Functions ===

export function assessResidualRisk(
  originalRisk: string,
  compensatingEffectiveness: EffectivenessRating
): "low" | "medium" | "high" | "critical" {
  const riskMatrix: Record<string, Record<EffectivenessRating, "low" | "medium" | "high" | "critical">> = {
    critical: { effective: "medium", partially_effective: "high", ineffective: "critical", not_assessed: "critical" },
    high: { effective: "low", partially_effective: "medium", ineffective: "high", not_assessed: "high" },
    medium: { effective: "low", partially_effective: "low", ineffective: "medium", not_assessed: "medium" },
    low: { effective: "low", partially_effective: "low", ineffective: "low", not_assessed: "low" },
  };
  return riskMatrix[originalRisk]?.[compensatingEffectiveness] ?? "medium";
}

export function computePostureScore(
  originalRiskLevel: string,
  compensatingEffectiveness: EffectivenessRating,
  hasMultipleCompensatingControls: boolean
): number {
  const baseScores: Record<string, number> = { low: 80, medium: 60, high: 40, critical: 20 };
  const effectivenessBonus: Record<EffectivenessRating, number> = {
    effective: 20, partially_effective: 10, ineffective: 0, not_assessed: 0,
  };
  const multiBonus = hasMultipleCompensatingControls ? 5 : 0;
  return Math.min(100, (baseScores[originalRiskLevel] ?? 50) + effectivenessBonus[compensatingEffectiveness] + multiBonus);
}

export function generateRiskPostureRecommendation(
  riskLevel: string,
  effectiveness: EffectivenessRating
): string {
  if (riskLevel === "critical" && effectiveness !== "effective") {
    return "URGENT: Critical exception with inadequate compensating controls. Immediate remediation or revocation required.";
  }
  if (effectiveness === "ineffective") {
    return "Compensating controls are not effective. Review and replace with stronger controls or close the exception.";
  }
  if (effectiveness === "not_assessed") {
    return "Compensating controls have not been assessed. Conduct effectiveness assessment immediately.";
  }
  if (effectiveness === "partially_effective") {
    return "Strengthen compensating controls or add additional controls to improve residual risk posture.";
  }
  return "Exception risk posture is acceptable. Maintain current compensating controls and review at next assessment cycle.";
}

// === DB Functions ===

export async function linkExceptionToRisk(
  tenantId: string,
  data: Omit<ExceptionRiskLink, "linkId" | "reviewedBy" | "reviewedAt" | "createdAt">
): Promise<ExceptionRiskLink> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `INSERT INTO "${schema}".exception_risk_links
      (exception_id, risk_id, control_id, link_type, impact_description,
       residual_risk_level, compensating_control_ids, compensating_control_effectiveness)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.exceptionId, data.riskId, data.controlId, data.linkType,
      data.impactDescription, data.residualRiskLevel,
      JSON.stringify(data.compensatingControlIds), data.compensatingControlEffectiveness,
    ]
  );
  const r = getFirstRow(result)!;
  return {
    linkId: r.link_id || r.id,
    exceptionId: r.exception_id,
    riskId: r.risk_id,
    controlId: r.control_id,
    linkType: r.link_type,
    impactDescription: r.impact_description,
    residualRiskLevel: r.residual_risk_level,
    compensatingControlIds: r.compensating_control_ids || [],
    compensatingControlEffectiveness: r.compensating_control_effectiveness,
    reviewedBy: r.reviewed_by || null,
    reviewedAt: r.reviewed_at?.toISOString?.() || r.reviewed_at || null,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getRiskLinks(
  tenantId: string,
  exceptionId: string,
  page = 1,
  pageSize = 25,
): Promise<{ items: ExceptionRiskLink[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safeSize;
  const [countResult, result] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".exception_risk_links WHERE exception_id = $1`, [exceptionId]),
    safeQuery(
      `SELECT * FROM "${schema}".exception_risk_links WHERE exception_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [exceptionId, safeSize, offset],
    ),
  ]);
  return {
    items: result.rows.map(mapRiskLinkRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

function mapRiskLinkRow( r: Record<string, unknown>): ExceptionRiskLink {
  return {

    linkId: r.link_id || r.id,

    exceptionId: r.exception_id,

    riskId: r.risk_id,

    controlId: r.control_id,

    linkType: r.link_type,

    impactDescription: r.impact_description,

    residualRiskLevel: r.residual_risk_level,

    compensatingControlIds: r.compensating_control_ids || [],

    compensatingControlEffectiveness: r.compensating_control_effectiveness,

    reviewedBy: r.reviewed_by || null,

    reviewedAt: r.reviewed_at?.toISOString?.() || r.reviewed_at || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function assessRiskPosture(
  tenantId: string,
  exceptionId: string
): Promise<RiskPostureImpact> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function assessCompensatingControlEffectiveness(
  tenantId: string,
  exceptionId: string,
  linkId: string,
  assessment: CompensatingControlAssessment
): Promise<ExceptionRiskLink> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
