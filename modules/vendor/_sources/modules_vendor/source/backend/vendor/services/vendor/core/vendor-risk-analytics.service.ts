import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Risk Analytics
// Covers: performance benchmarking within
// vendor cohorts, sub-vendor (fourth-party)
// risk inheritance, and concentration
// mitigation task generation.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { getFirstRow } from '@dos/db';
import { createBoardAttentionItemForVendor } from './vendor-cross-module-escalation.service';
import type { GenericRow } from '@dos/types';

// ── Performance Benchmarking ─────────────────────────────────────────────────

/**
 * Compute vendor percentile rankings within their cohort (category/risk tier).
 * Benchmarks across: risk score, SLA compliance, finding closure rate, privacy score.
 */
export async function computeVendorBenchmark(
  tenantId: string,
  vendorId: string,
): Promise<{
  vendorId: string;
  cohortSize: number;
  rankings: Record<string, { value: number; percentile: number; cohortAvg: number }>;
}> {
  const schema = tenantSchema(tenantId);

  // Get the vendor's category for cohort selection
  const vendorRes = await safeQuery(
    `SELECT vendor_id, category, risk_tier, risk_score, privacy_score
     FROM "${schema}".vendors
     WHERE vendor_id = $1 LIMIT 1`,
    [vendorId],
  );

  if (vendorRes.rows.length === 0) {
    return { vendorId, cohortSize: 0, rankings: {} };
  }

  const vendor = getFirstRow(vendorRes)!;
  const category = vendor.category;

  // Get cohort vendors (same category, active)
  const cohortRes = await safeQuery(
    `SELECT vendor_id, risk_score, privacy_score
     FROM "${schema}".vendors
     WHERE category = $1 AND status IN ('active', 'approved')
     ORDER BY risk_score ASC`,
    [category],
  );

  const cohort = cohortRes.rows;
  const cohortSize = cohort.length;

  if (cohortSize <= 1) {
    return {
      vendorId,
      cohortSize,
      rankings: {
        risk_score: { value: vendor.risk_score ?? 0, percentile: 50, cohortAvg: vendor.risk_score ?? 0 },
        privacy_score: { value: vendor.privacy_score ?? 0, percentile: 50, cohortAvg: vendor.privacy_score ?? 0 },
      },
    };
  }

  // Calculate percentile for risk score (lower is better)
  const riskScores = cohort.map((v: GenericRow) => Number(v.risk_score ?? 0));
  const vendorRiskScore = Number(vendor.risk_score ?? 0);
  const riskBelowCount = riskScores.filter((s: number) => s > vendorRiskScore).length;
  const riskPercentile = Math.round((riskBelowCount / cohortSize) * 100);
  const riskAvg = Math.round(riskScores.reduce((a: number, b: number) => a + b, 0) / cohortSize);

  // Calculate percentile for privacy score (higher is better)
  const privacyScores = cohort.map((v: GenericRow) => Number(v.privacy_score ?? 0));
  const vendorPrivacyScore = Number(vendor.privacy_score ?? 0);
  const privacyBelowCount = privacyScores.filter((s: number) => s < vendorPrivacyScore).length;
  const privacyPercentile = Math.round((privacyBelowCount / cohortSize) * 100);
  const privacyAvg = Math.round(privacyScores.reduce((a: number, b: number) => a + b, 0) / cohortSize);

  // SLA compliance rate
  const slaRes = await safeQuery(
    `SELECT
       v.vendor_id,
       COUNT(pt.task_id)::int AS total_tasks,
       COUNT(pt.task_id) FILTER (WHERE pt.completed_at <= pt.due_date OR pt.status = 'completed')::int AS on_time
     FROM "${schema}".vendors v
     LEFT JOIN "${schema}".process_tasks pt ON pt.entity_id = v.vendor_id::text AND pt.entity_type LIKE 'vendor%'
     WHERE v.category = $1 AND v.status IN ('active', 'approved')
     GROUP BY v.vendor_id`,
    [category],
  );

  const slaRates: number[] = [];
  let vendorSlaRate = 100;
  for (const row of slaRes.rows) {
    const rate = row.total_tasks > 0 ? Math.round((row.on_time / row.total_tasks) * 100) : 100;
    slaRates.push(rate);
    if (row.vendor_id === vendorId) vendorSlaRate = rate;
  }
  const slaBelowCount = slaRates.filter((s: number) => s < vendorSlaRate).length;
  const slaPercentile = slaRates.length > 0 ? Math.round((slaBelowCount / slaRates.length) * 100) : 50;
  const slaAvg = slaRates.length > 0 ? Math.round(slaRates.reduce((a: number, b: number) => a + b, 0) / slaRates.length) : 100;

  // Finding closure rate
  const findingRes = await safeQuery(
    `SELECT
       vf.vendor_id,
       COUNT(vf.finding_id)::int AS total,
       COUNT(vf.finding_id) FILTER (WHERE vf.status = 'closed')::int AS closed
     FROM "${schema}".vendor_findings vf
     JOIN "${schema}".vendors v ON v.vendor_id = vf.vendor_id
     WHERE v.category = $1
     GROUP BY vf.vendor_id`,
    [category],
  );

  const closureRates: number[] = [];
  let vendorClosureRate = 100;
  for (const row of findingRes.rows) {
    const rate = row.total > 0 ? Math.round((row.closed / row.total) * 100) : 100;
    closureRates.push(rate);
    if (row.vendor_id === vendorId) vendorClosureRate = rate;
  }
  const closureBelowCount = closureRates.filter((s: number) => s < vendorClosureRate).length;
  const closurePercentile = closureRates.length > 0 ? Math.round((closureBelowCount / closureRates.length) * 100) : 50;
  const closureAvg = closureRates.length > 0 ? Math.round(closureRates.reduce((a: number, b: number) => a + b, 0) / closureRates.length) : 100;

  const rankings = {
    risk_score: { value: vendorRiskScore, percentile: riskPercentile, cohortAvg: riskAvg },
    privacy_score: { value: vendorPrivacyScore, percentile: privacyPercentile, cohortAvg: privacyAvg },
    sla_compliance: { value: vendorSlaRate, percentile: slaPercentile, cohortAvg: slaAvg },
    finding_closure: { value: vendorClosureRate, percentile: closurePercentile, cohortAvg: closureAvg },
  };

  // Persist the benchmark snapshot
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_benchmarks (
      benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      cohort_category VARCHAR(100),
      cohort_size INT,
      rankings JSONB,
      computed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await safeQuery(
    `INSERT INTO "${schema}".vendor_benchmarks (vendor_id, cohort_category, cohort_size, rankings)
     VALUES ($1, $2, $3, $4)`,
    [vendorId, category, cohortSize, JSON.stringify(rankings)],
  );

  return { vendorId, cohortSize, rankings };
}

// ── Sub-Vendor Risk Inheritance ──────────────────────────────────────────────

/**
 * Cascade sub-vendor critical risk to parent vendor score.
 * When a sub-vendor (fourth party) has critical risk, inflate the parent's score.
 */
export async function cascadeSubVendorRisk(
  tenantId: string,
  parentVendorId: string,
): Promise<{ parentVendorId: string; adjustedScore: number; subVendorCount: number; criticalSubVendors: number }> {
  const schema = tenantSchema(tenantId);

  // Get parent vendor's base risk score
  const parentRes = await safeQuery(
    `SELECT risk_score, risk_tier FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`,
    [parentVendorId],
  );
  const baseScore = Number(getFirstRow(parentRes)?.risk_score ?? 0);

  // Get sub-vendors and their risk scores
  const subRes = await safeQuery(
    `SELECT sv.sub_vendor_id, sv.criticality, v.risk_score, v.risk_tier, v.name
     FROM "${schema}".vendor_sub_vendors sv
     JOIN "${schema}".vendors v ON v.vendor_id = sv.sub_vendor_id
     WHERE sv.parent_vendor_id = $1 AND sv.status = 'active'`,
    [parentVendorId],
  );

  const subVendors = subRes.rows;
  const subVendorCount = subVendors.length;

  if (subVendorCount === 0) {
    return { parentVendorId, adjustedScore: baseScore, subVendorCount: 0, criticalSubVendors: 0 };
  }

  // Calculate risk inheritance
  // Critical sub-vendors add 20% of their score, high adds 10%, medium adds 5%
  let riskInheritance = 0;
  let criticalSubVendors = 0;

  for (const sub of subVendors) {
    const subScore = Number(sub.risk_score ?? 0);
    const criticality = sub.criticality ?? 'low';

    switch (criticality) {
      case 'critical':
        riskInheritance += subScore * 0.20;
        criticalSubVendors++;
        break;
      case 'high':
        riskInheritance += subScore * 0.10;
        break;
      case 'medium':
        riskInheritance += subScore * 0.05;
        break;
      default:
        // low criticality sub-vendors contribute minimal risk
        riskInheritance += subScore * 0.02;
    }
  }

  const adjustedScore = Math.min(100, Math.round(baseScore + riskInheritance));

  // Update parent vendor's composite risk score
  await safeQuery(
    `UPDATE "${schema}".vendors
     SET risk_score = $2,
         sub_vendor_risk_contribution = $3,
         updated_at = NOW()
     WHERE vendor_id = $1`,
    [parentVendorId, adjustedScore, Math.round(riskInheritance)],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  // Determine if tier needs updating
  const newTier = adjustedScore >= 75 ? 'critical' : adjustedScore >= 50 ? 'high' : adjustedScore >= 25 ? 'medium' : 'low';
  await safeQuery(
    `UPDATE "${schema}".vendors SET risk_tier = $2 WHERE vendor_id = $1`,
    [parentVendorId, newTier],
  ).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  // Emit cascade event
  if (criticalSubVendors > 0) {
    await eventBus.publish(({
          eventType: 'vendor.cascade_risk_assessed',
          tenantId,
          sourceService: 'vendor-enhancements',
          severity: adjustedScore >= 75 ? 'critical' : 'warning',
          entityType: 'vendor',
          entityId: parentVendorId,
          payload: {
            parentVendorId,
            baseScore,
            adjustedScore,
            riskInheritance: Math.round(riskInheritance),
            subVendorCount,
            criticalSubVendors,
            newTier,
          },
        } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  }

  // If the adjusted score pushes vendor to critical tier, trigger board attention
  if (newTier === 'critical' && getFirstRow(parentRes)?.risk_tier !== 'critical') {
    const nameRes = await safeQuery(
      `SELECT name FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`,
      [parentVendorId],
    );
    const vendorName = getFirstRow(nameRes)?.name ?? 'Unknown Vendor';
    await createBoardAttentionItemForVendor(tenantId, parentVendorId, vendorName, newTier, adjustedScore);
  }

  return { parentVendorId, adjustedScore, subVendorCount, criticalSubVendors };
}

// ── Concentration Mitigation Tracking ────────────────────────────────────────

/**
 * Create process tasks for concentration mitigation actions.
 * When vendor spend or dependency concentration exceeds thresholds,
 * create tasks to diversify or develop contingency plans.
 */
export async function createConcentrationMitigationTasks(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  concentrationType: 'spend' | 'service' | 'geographic' | 'technology',
  concentrationPercentage: number,
  threshold: number,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  if (concentrationPercentage <= threshold) {
    return [];
  }

  // Define mitigation actions based on concentration type
  const mitigationActions: Array<{
    title: string; description: string; priority: 'critical' | 'high' | 'medium'; dueInHours: number;
  }> = [];

  switch (concentrationType) {
    case 'spend':
      mitigationActions.push(
        {
          title: `Vendor Diversification Plan: ${vendorName}`,
          description: `Spend concentration at ${concentrationPercentage}% (threshold: ${threshold}%). Develop a plan to diversify vendor spend across alternative providers.`,
          priority: concentrationPercentage > 80 ? 'critical' : 'high',
          dueInHours: 30 * 24,
        },
        {
          title: `Alternative Vendor Evaluation: ${vendorName}`,
          description: `Identify and evaluate at least 2 alternative vendors to reduce spend dependency on ${vendorName}.`,
          priority: 'medium',
          dueInHours: 45 * 24,
        },
      );
      break;

    case 'service':
      mitigationActions.push(
        {
          title: `Service Continuity Plan: ${vendorName}`,
          description: `Service concentration at ${concentrationPercentage}% (threshold: ${threshold}%). Create service continuity and failover plans.`,
          priority: concentrationPercentage > 80 ? 'critical' : 'high',
          dueInHours: 21 * 24,
        },
        {
          title: `Multi-Vendor Architecture Assessment: ${vendorName}`,
          description: `Assess feasibility of multi-vendor architecture to reduce single-point-of-failure risk for services provided by ${vendorName}.`,
          priority: 'medium',
          dueInHours: 60 * 24,
        },
      );
      break;

    case 'geographic':
      mitigationActions.push(
        {
          title: `Geographic Diversification Review: ${vendorName}`,
          description: `Geographic concentration at ${concentrationPercentage}% (threshold: ${threshold}%). Review geographic risk and identify vendors in alternative regions.`,
          priority: 'high',
          dueInHours: 45 * 24,
        },
      );
      break;

    case 'technology':
      mitigationActions.push(
        {
          title: `Technology Stack Diversification: ${vendorName}`,
          description: `Technology concentration at ${concentrationPercentage}% (threshold: ${threshold}%). Evaluate alternative technology platforms to reduce lock-in risk.`,
          priority: concentrationPercentage > 80 ? 'critical' : 'high',
          dueInHours: 60 * 24,
        },
        {
          title: `Exit Strategy Development: ${vendorName}`,
          description: `Develop a technology exit strategy including data portability and migration timeline for ${vendorName}.`,
          priority: 'medium',
          dueInHours: 90 * 24,
        },
      );
      break;
  }

  const createdTasks: unknown[] = [];

  for (const action of mitigationActions) {
    const task = await createProcessTask(tenantId, {
      title: action.title,
      description: action.description,
      taskType: 'vendor_gap_remediation',
      priority: action.priority,
      entityType: 'vendor',
      entityId: vendorId,
      dueInHours: action.dueInHours,
      triggerSource: 'vendor-enhancements',
      triggerData: {
        vendorId,
        vendorName,
        concentrationType,
        concentrationPercentage,
        threshold,
        mitigationType: 'concentration',
      },
    }).catch((err: unknown) => {
      logger.warn(`[VendorEnhancements] Concentration mitigation task creation failed: ${(err instanceof Error ? err.message : String(err))}`);
      return null;
    });

    if (task) {
      createdTasks.push(task);
    }
  }

  // Log the concentration alert
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_concentration_alerts (
      alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      concentration_type VARCHAR(30) NOT NULL,
      concentration_percentage NUMERIC(5,2) NOT NULL,
      threshold NUMERIC(5,2) NOT NULL,
      mitigation_task_count INT DEFAULT 0,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);

  await safeQuery(
    `INSERT INTO "${schema}".vendor_concentration_alerts
       (vendor_id, concentration_type, concentration_percentage, threshold, mitigation_task_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [vendorId, concentrationType, concentrationPercentage, threshold, createdTasks.length],
  );

  return createdTasks;
}
