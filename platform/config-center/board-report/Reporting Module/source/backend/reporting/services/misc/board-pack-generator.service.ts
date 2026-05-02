import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Board Pack Auto-Generator Service
// Aggregates KPIs, agent discoveries, compliance trends, and risk movement
// into executive board packs for weekly/monthly delivery
// ============================================

import { v4 as uuid } from 'uuid';
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { computeKPIs, getKPITrends as _getKPITrends, type TenantKPIs } from '../../../analytics/services/analytics/analytics.service';
import { getRiskPosture } from '../../../risk/services/scoring/risk-scoring.service';
import { createBoardPack, addBoardPackItem } from '../../../governance/services/governance/governance-board-packs.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ============================================
// Types
// ============================================

export interface BoardPackData {
  packId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  kpis: TenantKPIs;
  topDiscoveries: Array<{
    id: string;
    agentId: string;
    type: string;
    title: string;
    severity: string;
    entityType?: string;
    entityId?: string;
    details: string;
    timestamp: string;
  }>;
  complianceTrend: {
    current: number;
    previous: number;
    direction: 'improving' | 'declining' | 'stable';
    dataPoints: Array<{ date: string; score: number }>;
  };
  riskMovement: {
    totalRisks: number;
    byZone: { low: number; medium: number; high: number; critical: number };
    topRisks: Array<{ riskId: string; title: string; score: number; zone: string }>;
    trend: Array<{ date: string; score: number; zone: string }>;
  };
}

// ============================================
// Main Generator Function
// ============================================

/**
 * Generates an automated board pack for a tenant covering the specified period.
 * Aggregates:
 * - Current KPIs (compliance, risk, evidence coverage, remediation closure)
 * - Top 5 agent discoveries from ai_observations and agent_discoveries
 * - Compliance posture trend from kpi_snapshots
 * - Risk movement from risk_score_history
 */
export async function generateBoardPack(
  tenantId: string,
  periodType: 'weekly' | 'monthly' = 'monthly',
  periodStart?: string,
  periodEnd?: string,
): Promise<BoardPackData> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  
  // Determine period dates if not provided
  if (!periodStart || !periodEnd) {
    if (periodType === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      periodStart = weekStart.toISOString().split('T')[0];
      periodEnd = weekEnd.toISOString().split('T')[0];
    } else {
      // Monthly: first day of current month to last day
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodStart = monthStart.toISOString().split('T')[0];
      periodEnd = monthEnd.toISOString().split('T')[0];
    }
  }

  // ── 1. Compute current KPIs ──
  const kpis = await computeKPIs(tenantId);

  // ── 2. Fetch top 5 agent discoveries (from ai_observations + agent_discoveries) ──
  const discoveriesStart = new Date(periodStart);
  const discoveriesEnd = new Date(periodEnd);
  discoveriesEnd.setHours(23, 59, 59, 999);

  const obsResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT observation_id as id, agent_id as "agentId", observation_type as type,
            title, severity, entity_type as "entityType", entity_id as "entityId",
            description as details, created_at as timestamp
     FROM "${schema}".ai_observations
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
     ORDER BY 
       CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT 5`,
    [tenantId, discoveriesStart.toISOString(), discoveriesEnd.toISOString()],
  ), { tenantId: tenantId, operation: 'query ai_observations' });

  const discResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT id, agent_id as "agentId", discovery_type as type,
            title, severity, entity_type as "entityType", entity_id as "entityId",
            details, created_at as timestamp
     FROM "${schema}".agent_discoveries
     WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
     ORDER BY 
       CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT 5`,
    [tenantId, discoveriesStart.toISOString(), discoveriesEnd.toISOString()],
  ), { tenantId: tenantId, operation: 'query agent_discoveries' });

  // Combine and deduplicate by id, keeping highest severity
  const discoveryMap = new Map<string, unknown>();
  for (const row of [...obsResult.rows, ...discResult.rows]) {
    const id = row.id;
    if (!discoveryMap.has((id as any)) || 

        (row.severity === 'critical' || row.severity === 'high' && discoveryMap.get((id as any)).severity !== 'critical')) {
      discoveryMap.set((id as any), {
        id: row.id,
        agentId: row.agentId || 'any',
        type: row.type || 'anomaly',
        title: row.title || 'Discovery',
        severity: row.severity || 'medium',
        entityType: row.entityType || undefined,
        entityId: row.entityId || undefined,
        details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {}),
        timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
      });
    }
  }
  const topDiscoveries = Array.from(discoveryMap.values())
    .sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

      return (sevOrder[a.severity] || 99) - (sevOrder[b.severity] || 99);
    })
    .slice(0, 5);

  // ── 3. Compute compliance posture trend from kpi_snapshots ──
  const trendStart = new Date(periodStart);
  trendStart.setMonth(trendStart.getMonth() - 1); // Include previous period for comparison
  const trendEnd = new Date(periodEnd);

  const trendResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT snapshot_date, compliance_score
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date >= $1 AND snapshot_date <= $2
     ORDER BY snapshot_date ASC`,
    [trendStart.toISOString().split('T')[0], trendEnd.toISOString().split('T')[0]],
  ), { tenantId: tenantId, operation: 'query kpi_snapshots' });

  const complianceScores = trendResult.rows.map((r: GenericRow) => ({
    date: r.snapshot_date instanceof Date ? r.snapshot_date.toISOString().split('T')[0] : String(r.snapshot_date).split('T')[0],
    score: parseFloat(r.compliance_score) || 0,
  }));

  const current = complianceScores.length > 0 ? complianceScores[complianceScores.length - 1].score : kpis.complianceScore;
  const previous = complianceScores.length >= 2 ? complianceScores[0].score : current;
  const delta = current - previous;
  const complianceTrend = {
    current,
    previous,
    direction: delta > 2 ? 'improving' as const : delta < -2 ? 'declining' as const : 'stable' as const,
    dataPoints: complianceScores,
  };

  // ── 4. Fetch risk movement from risk_score_history ──
  const riskPosture = await swallowDefault(EC.FALLBACK_QUERY, {
    totalRisks: 0,
    byZone: { low: 0, medium: 0, high: 0, critical: 0 },
    risks: [],
    topRisks: [],
    trends: [],
    generatedAt: new Date().toISOString(),
  } as unknown, getRiskPosture(tenantId), { tenantId: tenantId, operation: 'fallback query' });

  const riskMovement = {

    totalRisks: riskPosture.totalRisks,

    byZone: riskPosture.byZone,

    topRisks: riskPosture.topRisks.slice(0, 10).map((r: GenericRow) => ({
      riskId: r.riskId,
      title: r.title,
      score: r.score,
      zone: r.zone,
    })),

    trend: riskPosture.trends || [],
  };

  // ── 5. Create board pack record ──
  const packTitle = periodType === 'weekly'
    ? `Weekly Board Pack - ${periodStart} to ${periodEnd}`
    : `Monthly Board Pack - ${new Date(periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  const packTitleAr = periodType === 'weekly'
    ? `تقرير مجلس الإدارة الأسبوعي - ${periodStart} إلى ${periodEnd}`
    : `تقرير مجلس الإدارة الشهري - ${new Date(periodStart).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}`;

  // Use meeting_date for the period end date
  const meetingDate = new Date(periodEnd);
  
  const pack = await createBoardPack(tenantId, {
    title_en: packTitle,
    title_ar: packTitleAr,
    pack_type: periodType,
    period_start: periodStart,
    period_end: periodEnd,
    created_by: 'system',
  }).catch(async (err) => {
    // Fallback: if createBoardPack fails due to missing columns, create a minimal pack
    logger.warn(`[BoardPackGenerator] createBoardPack failed, using fallback: ${toErrorMessage(err)}`);
    const schema = tenantSchema(tenantId);
    const id = uuid();
    const result = await safeQuery(
      `INSERT INTO "${schema}".board_packs (pack_id, tenant_id, title_en, title_ar, meeting_date, status, prepared_by, created_at)
       VALUES ($1, $2, $3, $4, $5, 'draft', 'system', NOW()) RETURNING *`,
      [id, tenantId, packTitle, packTitleAr, meetingDate]
    );
    return getFirstRow(result);
  });

  // ── 6. Add board pack items ──
  let sortOrder = 0;

  // Item 1: Executive Summary (KPIs)

  await addBoardPackItem(tenantId, pack.pack_id, {
    item_type: 'executive_summary',
    title_en: 'Executive Summary - Key Performance Indicators',
    title_ar: 'ملخص تنفيذي - مؤشرات الأداء الرئيسية',
    content: {
      complianceScore: kpis.complianceScore,
      riskScore: kpis.riskScore,
      evidenceCoverage: kpis.evidenceCoverage,
      remediationClosureRate: kpis.remediationClosureRate,
      vendorHealthScore: kpis.vendorHealthScore,
      vendorRiskExposure: kpis.vendorRiskExposure,
      computedAt: kpis.computedAt.toISOString(),
    },
    sort_order: sortOrder++,
    auto_generated: true,
  });

  // Item 2: Top Agent Discoveries
  if (topDiscoveries.length > 0) {

    await addBoardPackItem(tenantId, pack.pack_id, {
      item_type: 'agent_discoveries',
      title_en: 'Top 5 AI Agent Discoveries',
      title_ar: 'أهم 5 اكتشافات من وكلاء الذكاء الاصطناعي',
      content: {
        discoveries: topDiscoveries,
        period: { start: periodStart, end: periodEnd },
      },
      sort_order: sortOrder++,
      auto_generated: true,
    });
  }

  // Item 3: Compliance Posture Trend

  await addBoardPackItem(tenantId, pack.pack_id, {
    item_type: 'compliance_trend',
    title_en: 'Compliance Posture Trend',
    title_ar: 'اتجاه وضع الامتثال',
    content: {
      current: complianceTrend.current,
      previous: complianceTrend.previous,
      direction: complianceTrend.direction,
      change: complianceTrend.current - complianceTrend.previous,
      dataPoints: complianceTrend.dataPoints,
    },
    sort_order: sortOrder++,
    auto_generated: true,
  });

  // Item 4: Risk Movement

  await addBoardPackItem(tenantId, pack.pack_id, {
    item_type: 'risk_movement',
    title_en: 'Risk Register Movement',
    title_ar: 'حركة سجل المخاطر',
    content: {
      totalRisks: riskMovement.totalRisks,
      byZone: riskMovement.byZone,
      topRisks: riskMovement.topRisks,
      trend: riskMovement.trend,
    },
    sort_order: sortOrder++,
    auto_generated: true,
  });

  // Item 5: Recommendations (if any critical/high discoveries)

  const criticalDiscoveries = topDiscoveries.filter(d => d.severity === 'critical' || d.severity === 'high');
  if (criticalDiscoveries.length > 0) {

    await addBoardPackItem(tenantId, pack.pack_id, {
      item_type: 'recommendations',
      title_en: 'Board Attention Items',
      title_ar: 'بنود انتباه مجلس الإدارة',
      content: {
        items: criticalDiscoveries.map(d => ({

          title: d.title,

          severity: d.severity,

          agent: d.agentId,

          entityType: d.entityType,

          entityId: d.entityId,
        })),
        summary: `${criticalDiscoveries.length} critical or high-severity findings require board attention.`,
      },
      sort_order: sortOrder++,
      auto_generated: true,
    });
  }

  return {

    packId: pack.pack_id,
    tenantId,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    kpis,

    topDiscoveries,
    complianceTrend,
    riskMovement,
  };
}

/**
 * Scheduled job handler: generates board packs for all active tenants.
 * Weekly: runs every Monday at 8 AM
 * Monthly: runs on the 1st of each month at 8 AM
 */
export async function runBoardPackGenerationJob(periodType: 'weekly' | 'monthly'): Promise<void> {
  try {
    const { query: _query } = await import('../../../../config/database.js');
    const tenants = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status = 'active' OR status = 'onboarding'`
    );

    logger.info(`[BoardPackGenerator] Starting ${periodType} board pack generation for ${tenants.rows.length} tenants`);

    for (const row of tenants.rows) {
      const tenantId = row.tenant_id;
      try {
        await generateBoardPack(tenantId, periodType);
        logger.info(`[BoardPackGenerator] Generated ${periodType} board pack for tenant ${tenantId}`);
      } catch (err: unknown) {
        logger.warn(`[BoardPackGenerator] Failed to generate board pack for tenant ${tenantId}: ${toErrorMessage(err)}`);
      }
    }

    logger.info(`[BoardPackGenerator] Completed ${periodType} board pack generation`);
  } catch (err: unknown) {
    logger.error(`[BoardPackGenerator] ${periodType} job error: ${toErrorMessage(err)}`);
    throw err;
  }
}
