// ============================================
// Shahin-Ai — Risk Advanced Service
// Monte Carlo, aggregation, appetite versioning,
// scenario analysis, correlation, emerging risks,
// loss event database
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

// ── TypeScript Interfaces ──

export interface MonteCarloResult {
  riskId: string;
  iterations: number;
  confidenceLevel: number;
  mean: number;
  median: number;
  standardDeviation: number;
  p95: number;
  p99: number;
  valueAtRisk: number;
  histogram: { bucket: string; count: number }[];

  distribution?: any;
}

export interface RiskAggregation {
  group: string;
  riskCount: number;
  avgInherentScore: number;
  avgResidualScore: number;
  maxSeverity: number;
  totalExposure: number;
}

export interface ScenarioInput {
  name: string;
  likelihoodAdjustment: number;
  impactAdjustment: number;
  description?: string;
}

export interface ScenarioResult {
  scenarioName: string;
  description?: string;
  adjustedLikelihood: number;
  adjustedImpact: number;
  adjustedScore: number;
  baselineLikelihood: number;
  baselineImpact: number;
  baselineScore: number;
  scoreDelta: number;
}

export interface CorrelationMatrix {
  riskIds: string[];
  riskTitles: string[];
  matrix: number[][];
}

export interface LossEventInput {
  risk_id?: string;
  title: string;
  description?: string;
  loss_amount?: number;
  currency?: string;
  loss_category?: string;
  event_date?: string;
  root_cause?: string;
  business_unit?: string;
  recovery_amount?: number;
  insurance_claimed?: boolean;
  created_by?: string;
}

export interface LossStats {
  totalLosses: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  totalRecovery: number;
  netLoss: number;
  lossByCategory: { category: string; count: number; total: number }[];
  lossTrend: { month: string; count: number; total: number }[];
}

// Law 12: Monte Carlo consolidated into risk-quantification.service.ts

// ── 2. Risk Aggregation ──

/**
 * Aggregate risks by a given dimension: department, category, owner, or business_unit.
 * Returns group-level summary statistics.
 */
export async function aggregateRisks(
  tenantId: string,
  groupBy: "department" | "category" | "owner" | "business_unit"
): Promise<RiskAggregation[]> {
  const schema = tenantSchema(tenantId);

  // Map groupBy to actual column names in the risks table
  const columnMap: Record<string, string> = {
    department: "category",       // risks table uses category; department maps to it
    category: "category",
    owner: "owner",
    business_unit: "category",    // fallback to category if business_unit column unavailable
  };
  const column = columnMap[groupBy] || "category";

  // secrets-scan-allow: column from typed GroupByColumn union; schema tenantSchema()-validated
  const result = await safeQuery(
    `SELECT
       COALESCE(${column}, 'Unassigned') as group_name,
       COUNT(*)::int as risk_count,
       ROUND(AVG(likelihood * impact)::numeric, 2) as avg_inherent_score,
       ROUND(AVG(COALESCE(risk_score, likelihood * impact))::numeric, 2) as avg_residual_score,
       MAX(likelihood * impact)::numeric as max_severity,
       SUM(likelihood * impact)::numeric as total_exposure
     FROM "${schema}".risks
     GROUP BY COALESCE(${column}, 'Unassigned')
     ORDER BY total_exposure DESC`
  );

  return result.rows.map((r: GenericRow) => ({
    group: r.group_name,
    riskCount: Number(r.risk_count),
    avgInherentScore: Number(r.avg_inherent_score),
    avgResidualScore: Number(r.avg_residual_score),
    maxSeverity: Number(r.max_severity),
    totalExposure: Number(r.total_exposure),
  }));
}

// ── 3. Risk Appetite Versioning ──

/**
 * Create a new risk appetite version with auto-incrementing version number.
 */
export async function createRiskAppetiteVersion(
  tenantId: string,
  data: Record<string, unknown>,
  approvedBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // Get the next version number
  const maxRes = await safeQuery(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
     FROM "${schema}".risk_appetite_versions`
  );
  const nextVersion = maxRes.rows[0]?.next_version || 1;

  const result = await safeQuery(
    `INSERT INTO "${schema}".risk_appetite_versions
      (version_number, appetite_data, approved_by, approved_at, effective_from, status, notes)
     VALUES ($1, $2, $3, NOW(), $4, $5, $6)
     RETURNING *`,
    [
      nextVersion,
      JSON.stringify(data.appetite_data || data),
      approvedBy,
      data.effective_from || new Date().toISOString().slice(0, 10),
      data.status || "draft",
      data.notes || null,
    ]
  );

  return result.rows[0];
}

/**
 * Return full version history of risk appetite documents, newest first.
 */
export async function getRiskAppetiteHistory(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".risk_appetite_versions
     ORDER BY version_number DESC`
  );
  return result.rows;
}

// Law 12: Scenario analysis consolidated into risk-quantification.service.ts

// ── 5. Risk Interconnection / Correlation Matrix ──

/**
 * Build an NxN correlation matrix for all active risks.
 * Correlation is determined by shared control_ids, categories, and owners.
 */
export async function getRiskCorrelationMatrix(tenantId: string): Promise<CorrelationMatrix> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT risk_id, title, category, owner, control_ids
     FROM "${schema}".risks
     ORDER BY risk_id`
  );

  const risks = result.rows;
  const riskIds = risks.map((r: GenericRow) => r.risk_id);
  const riskTitles = risks.map((r: GenericRow) => r.title);
  const n = risks.length;

  // Build NxN matrix based on shared attributes
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0; // Perfect self-correlation
        continue;
      }

      let score = 0;
      const ri = risks[i];
      const rj = risks[j];

      // Same category adds 0.3
      if (ri.category && rj.category && ri.category === rj.category) {
        score += 0.3;
      }

      // Same owner adds 0.2
      if (ri.owner && rj.owner && ri.owner === rj.owner) {
        score += 0.2;
      }

      // Shared controls: up to 0.5 based on Jaccard similarity
      const controlsI: string[] = Array.isArray(ri.control_ids) ? ri.control_ids : [];
      const controlsJ: string[] = Array.isArray(rj.control_ids) ? rj.control_ids : [];
      if (controlsI.length > 0 && controlsJ.length > 0) {
        const intersection = controlsI.filter((c: string) => controlsJ.includes(c));
        const union = new Set([...controlsI, ...controlsJ]);
        const jaccard = union.size > 0 ? intersection.length / union.size : 0;
        score += 0.5 * jaccard;
      }

      matrix[i][j] = round2(Math.min(score, 1.0));
    }
  }

  return { riskIds, riskTitles, matrix };
}

// ── 6. Emerging Risk Register ──

/**
 * Retrieve all emerging risks (category='emerging' or status='monitoring').
 */
export async function getEmergingRisks(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".emerging_risks
     WHERE category = 'emerging' OR status = 'monitoring'
     ORDER BY first_identified_at DESC`
  );
  return result.rows;
}

/**
 * Create a new emerging risk entry.
 */
export async function createEmergingRisk(
  tenantId: string,
  data: Record<string, unknown>,
  createdBy: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".emerging_risks
      (title, description, category, horizon, velocity, confidence_level,
       potential_impact, monitoring_owner, status, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.category || "emerging",
      data.horizon || "medium",
      data.velocity || "moderate",
      data.confidence_level ?? 0.5,
      data.potential_impact || null,
      createdBy,
      data.status || "monitoring",
      data.source || null,
    ]
  );
  return result.rows[0];
}

// ── 7. Risk Event Loss Database ──

/**
 * Record a new loss event linked to a risk.
 */
export async function recordLossEvent(
  tenantId: string,
  data: LossEventInput
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".loss_events
      (risk_id, title, description, loss_amount, currency, loss_category,
       event_date, root_cause, business_unit, recovery_amount, insurance_claimed, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.risk_id || null,
      data.title,
      data.description || null,
      data.loss_amount ?? 0,
      data.currency || "SAR",
      data.loss_category || null,
      data.event_date || null,
      data.root_cause || null,
      data.business_unit || null,
      data.recovery_amount ?? 0,
      data.insurance_claimed ?? false,
      data.created_by || null,
    ]
  );
  return result.rows[0];
}

/**
 * Retrieve loss events with optional filters.
 */
export async function getLossEvents(
  tenantId: string,
  filters?: { risk_id?: string; status?: string; loss_category?: string; from_date?: string; to_date?: string }
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.risk_id) {
    conditions.push(`risk_id = $${paramIdx++}`);
    params.push(filters.risk_id);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.loss_category) {
    conditions.push(`loss_category = $${paramIdx++}`);
    params.push(filters.loss_category);
  }
  if (filters?.from_date) {
    conditions.push(`event_date >= $${paramIdx++}`);
    params.push(filters.from_date);
  }
  if (filters?.to_date) {
    conditions.push(`event_date <= $${paramIdx++}`);
    params.push(filters.to_date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await safeQuery(
    `SELECT * FROM "${schema}".loss_events ${whereClause}
     ORDER BY event_date DESC NULLS LAST, created_at DESC`,
    params
  );
  return result.rows;
}

/**
 * Compute aggregate statistics for loss events.
 */
export async function getLossEventStats(tenantId: string): Promise<LossStats> {
  const schema = tenantSchema(tenantId);

  // Overall stats
  const statsRes = await safeQuery(
    `SELECT
       COUNT(*)::int as total_losses,
       COALESCE(SUM(loss_amount), 0)::numeric as total_amount,
       COALESCE(AVG(loss_amount), 0)::numeric as avg_amount,
       COALESCE(MAX(loss_amount), 0)::numeric as max_amount,
       COALESCE(SUM(recovery_amount), 0)::numeric as total_recovery
     FROM "${schema}".loss_events`
  );
  const stats = statsRes.rows[0];

  // Loss by category
  const byCatRes = await safeQuery(
    `SELECT
       COALESCE(loss_category, 'Uncategorized') as category,
       COUNT(*)::int as count,
       COALESCE(SUM(loss_amount), 0)::numeric as total
     FROM "${schema}".loss_events
     GROUP BY COALESCE(loss_category, 'Uncategorized')
     ORDER BY total DESC`
  );

  // Loss trend by month (last 12 months)
  const trendRes = await safeQuery(
    `SELECT
       TO_CHAR(COALESCE(event_date, created_at::date), 'YYYY-MM') as month,
       COUNT(*)::int as count,
       COALESCE(SUM(loss_amount), 0)::numeric as total
     FROM "${schema}".loss_events
     WHERE COALESCE(event_date, created_at::date) >= CURRENT_DATE - INTERVAL '12 months'
     GROUP BY TO_CHAR(COALESCE(event_date, created_at::date), 'YYYY-MM')
     ORDER BY month`
  );

  return {
    totalLosses: Number(stats.total_losses),
    totalAmount: Number(stats.total_amount),
    avgAmount: round2(Number(stats.avg_amount)),
    maxAmount: Number(stats.max_amount),
    totalRecovery: Number(stats.total_recovery),
    netLoss: round2(Number(stats.total_amount) - Number(stats.total_recovery)),
    lossByCategory: byCatRes.rows.map((r: GenericRow) => ({
      category: r.category,
      count: Number(r.count),
      total: Number(r.total),
    })),
    lossTrend: trendRes.rows.map((r: GenericRow) => ({
      month: r.month,
      count: Number(r.count),
      total: Number(r.total),
    })),
  };
}

// ── Helper Functions ──

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Clamp a value between min and max. */
function _clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sample from a triangular distribution with given min, mode, and max.
 * Used in Monte Carlo simulation for likelihood/impact sampling.
 */
function _sampleTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}
