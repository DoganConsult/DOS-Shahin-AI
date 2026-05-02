type GenericRow = Record<string, unknown>;
// ============================================================================
// Shahin-Ai — Compensating Control Model (F27)
//
// When an exception/waiver is granted, compensating controls must temporarily
// cover the gap. This service manages:
//   - Linking compensating controls to exceptions
//   - Effectiveness tracking and review
//   - Coverage calculation
//   - Impact on compliance assertions
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from "uuid";

// ── Types ──────────────────────────────────────────────────────────────────

export type CompEffectiveness = "effective" | "partial" | "ineffective" | "any";

export interface CompensatingControl {
  compId: string;
  exceptionId: string;
  originalControlId: string;
  compensatingControlId: string;
  coveragePercent: number;
  effectiveness: CompEffectiveness;
  justificationEn?: string;
  justificationAr?: string;
  reviewDate?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompensatingControlInput {
  exceptionId: string;
  originalControlId: string;
  compensatingControlId: string;
  coveragePercent: number;
  justificationEn?: string;
  justificationAr?: string;
}

export interface CoverageAssessment {
  exceptionId: string;
  originalControlId: string;
  compensatingControls: CompensatingControl[];
  totalCoverage: number; // 0-100 aggregated
  overallEffectiveness: CompEffectiveness;
  gaps: string[];
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function addCompensatingControl(
  tenantId: string,
  data: CompensatingControlInput
): Promise<CompensatingControl> {
  const schema = tenantSchema(tenantId);
  const compId = uuid();

  await safeQuery(
    `INSERT INTO "${schema}".compensating_controls
     (comp_id, exception_id, original_control_id, compensating_control_id,
      coverage_percent, justification_en, justification_ar)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      compId, data.exceptionId, data.originalControlId,
      data.compensatingControlId, data.coveragePercent,
      data.justificationEn || null, data.justificationAr || null,
    ]
  );

  eventBus.publish(("exception.compensating_control_added" as any), {
    tenantId,
    exceptionId: data.exceptionId,
    compId,
  });

  return getCompensatingControl(tenantId, compId) as Promise<CompensatingControl>;
}

export async function getCompensatingControl(
  tenantId: string,
  compId: string
): Promise<CompensatingControl | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".compensating_controls WHERE comp_id = $1`,
    [compId]
  );
  if (res.rows.length === 0) return null;
  return rowToComp(res.rows[0]);
}

export async function listForException(
  tenantId: string,
  exceptionId: string
): Promise<CompensatingControl[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".compensating_controls
     WHERE exception_id = $1 ORDER BY created_at`,
    [exceptionId]
  );
  return res.rows.map(rowToComp);
}

export async function removeCompensatingControl(tenantId: string, compId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".compensating_controls WHERE comp_id = $1`, [compId]);
}

// ── Effectiveness Review ───────────────────────────────────────────────────

export async function reviewEffectiveness(
  tenantId: string,
  compId: string,
  effectiveness: CompEffectiveness,
  reviewedBy: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".compensating_controls
     SET effectiveness = $1, reviewed_by = $2, review_date = CURRENT_DATE, updated_at = NOW()
     WHERE comp_id = $3`,
    [effectiveness, reviewedBy, compId]
  );

  eventBus.publish(("exception.compensating_control_reviewed" as any), {
    tenantId, compId, effectiveness, reviewedBy,
  });
}

// ── Coverage Assessment ────────────────────────────────────────────────────

/**
 * Assess total compensating coverage for an exception.
 * Aggregates individual compensating controls weighted by effectiveness.
 */
export async function assessCoverage(
  tenantId: string,
  exceptionId: string
): Promise<CoverageAssessment> {
  const comps = await listForException(tenantId, exceptionId);
  const gaps: string[] = [];

  if (comps.length === 0) {
    return {
      exceptionId,
      originalControlId: "",
      compensatingControls: [],
      totalCoverage: 0,
      overallEffectiveness: "any",
      gaps: ["No compensating controls assigned"],
    };
  }

  // Calculate weighted coverage
  const effectivenessMultiplier: Record<CompEffectiveness, number> = {
    effective: 1.0,
    partial: 0.5,
    ineffective: 0.1,
    any: 0.3,
  };

  let weightedCoverage = 0;
  for (const comp of comps) {
    const mult = effectivenessMultiplier[comp.effectiveness];
    weightedCoverage += comp.coveragePercent * mult;
  }

  const totalCoverage = Math.min(100, Math.round(weightedCoverage));

  // Determine overall effectiveness
  const effectiveCount = comps.filter((c) => c.effectiveness === "effective").length;
  const ineffectiveCount = comps.filter((c) => c.effectiveness === "ineffective").length;
  let overallEffectiveness: CompEffectiveness;

  if (ineffectiveCount > 0) {
    overallEffectiveness = "ineffective";
    gaps.push(`${ineffectiveCount} compensating control(s) rated ineffective`);
  } else if (effectiveCount === comps.length) {
    overallEffectiveness = "effective";
  } else if (comps.some((c) => c.effectiveness === "any")) {
    overallEffectiveness = "any";
    gaps.push("Some compensating controls not yet reviewed");
  } else {
    overallEffectiveness = "partial";
  }

  if (totalCoverage < 80) {
    gaps.push(`Total coverage (${totalCoverage}%) is below 80% threshold`);
  }

  const needsReview = comps.filter(
    (c) => !c.reviewDate || daysSince(c.reviewDate) > 90
  );
  if (needsReview.length > 0) {
    gaps.push(`${needsReview.length} compensating control(s) need review (>90 days)`);
  }

  return {
    exceptionId,
    originalControlId: comps[0].originalControlId,
    compensatingControls: comps,
    totalCoverage,
    overallEffectiveness,
    gaps,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function rowToComp(r: GenericRow): CompensatingControl {
  return {

    compId: r.comp_id,

    exceptionId: r.exception_id,

    originalControlId: r.original_control_id,

    compensatingControlId: r.compensating_control_id,

    coveragePercent: r.coverage_percent,

    effectiveness: r.effectiveness,

    justificationEn: r.justification_en,

    justificationAr: r.justification_ar,

    reviewDate: r.review_date,

    reviewedBy: r.reviewed_by,

    createdAt: r.created_at,

    updatedAt: r.updated_at,
  };
}
