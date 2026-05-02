// @ts-nocheck — module-layer imports not yet extracted
/**
 * Shahin-AI — Continuous Compliance Orchestrator
 * GRC-specific compliance scoring and monitoring.
 * @owner product/shahin-ai
 * @since 2026-03-30
 */
import { logger } from '@dos/platform-core/observability';
import { safeQuery, tenantSchema } from '@dos/db';
import { getFirstRow } from '../../../utils/db-utils';
import { eventBus, type PlatformEvent } from '@dos/platform-core/events';
import { createProcessTask } from '@dos/platform-core/workflows';
import { recordAudit as _recordAudit } from '@dos/module-sdk/audit/services/audit/core/audit-trail.service';
import { swallow, EC, catchHandler as _catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import { CronExpressionParser as _CronExpressionParser } from 'cron-parser';
import * as prom from 'prom-client';

const complianceCycleGauge = new prom.Gauge({
  name: 'shahin_continuous_compliance_score',
  help: 'Current continuous compliance score per tenant',
  labelNames: ['tenant_id', 'framework_id'],
});

const controlHealthGauge = new prom.Gauge({
  name: 'shahin_control_health_score',
  help: 'Control health composite score',
  labelNames: ['tenant_id', 'control_id'],
});

const evidenceFreshnessGauge = new prom.Gauge({
  name: 'shahin_evidence_freshness_pct',
  help: 'Percentage of evidence items that are fresh',
  labelNames: ['tenant_id'],
});

export interface ComplianceHealthSnapshot {
  tenantId: string;
  frameworkId: string;
  totalControls: number;
  effectiveControls: number;
  weakControls: number;
  failedControls: number;
  evidenceFreshPct: number;
  evidenceExpiredCount: number;
  openGaps: number;
  openRemediations: number;
  overallScore: number;
  assessedAt: string;
}

export async function assessContinuousCompliance(tenantId: string, frameworkId?: string): Promise<ComplianceHealthSnapshot[]> {
  const schema = tenantSchema(tenantId);
  const snapshots: ComplianceHealthSnapshot[] = [];

  try {
    const frameworkFilter = frameworkId ? `AND cf.framework_id = '${frameworkId}'` : '';
    const frameworks = await safeQuery(
      `SELECT cf.framework_id, cf.name_en FROM "${schema}".compliance_frameworks cf
       WHERE cf.deleted_at IS NULL ${frameworkFilter}`,
    );

    for (const fw of frameworks.rows) {
      const fwId = fw.framework_id as string;

      const controlStats = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE effectiveness_score >= 70)::int AS effective,
           COUNT(*) FILTER (WHERE effectiveness_score BETWEEN 40 AND 69)::int AS weak,
           COUNT(*) FILTER (WHERE effectiveness_score < 40 OR effectiveness_score IS NULL)::int AS failed
         FROM "${schema}".compliance_controls WHERE framework_id = $1 AND deleted_at IS NULL`,
        [fwId],
      );
      const cs = getFirstRow(controlStats) ?? { total: 0, effective: 0, weak: 0, failed: 0 };

      const evidenceStats = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE e.status = 'validated' AND (e.expiry_date IS NULL OR e.expiry_date > NOW()))::int AS fresh,
           COUNT(*) FILTER (WHERE e.status = 'expired' OR (e.expiry_date IS NOT NULL AND e.expiry_date <= NOW()))::int AS expired
         FROM "${schema}".evidence e
         JOIN "${schema}".compliance_controls cc ON cc.control_id = e.control_id
         WHERE cc.framework_id = $1 AND e.deleted_at IS NULL`,
        [fwId],
      );
      const es = getFirstRow(evidenceStats) ?? { total: 0, fresh: 0, expired: 0 };

      const gapStats = await safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status NOT IN ('closed','resolved','remediated'))::int AS open_gaps,
           COUNT(*) FILTER (WHERE status = 'in_remediation')::int AS open_remediations
         FROM "${schema}".compliance_gaps WHERE framework_id = $1`,
        [fwId],
      );
      const gs = getFirstRow(gapStats) ?? { open_gaps: 0, open_remediations: 0 };

      const freshPct = es.total > 0 ? Math.round((es.fresh / es.total) * 100) : 100;
      const controlScore = cs.total > 0 ? Math.round((cs.effective / cs.total) * 100) : 0;
      const gapPenalty = Math.min(30, gs.open_gaps * 3);
      const overallScore = Math.max(0, Math.round(controlScore * 0.5 + freshPct * 0.3 + Math.max(0, 100 - gapPenalty) * 0.2));

      const snapshot: ComplianceHealthSnapshot = {
        tenantId,
        frameworkId: fwId,
        totalControls: cs.total,
        effectiveControls: cs.effective,
        weakControls: cs.weak,
        failedControls: cs.failed,
        evidenceFreshPct: freshPct,
        evidenceExpiredCount: es.expired,
        openGaps: gs.open_gaps,
        openRemediations: gs.open_remediations,
        overallScore,
        assessedAt: new Date().toISOString(),
      };

      snapshots.push(snapshot);
      complianceCycleGauge.set({ tenant_id: tenantId, framework_id: fwId }, overallScore);

      try {
        await safeQuery(
          `INSERT INTO "${schema}".compliance_health_snapshots
           (framework_id, total_controls, effective_controls, weak_controls, failed_controls,
            evidence_fresh_pct, evidence_expired_count, open_gaps, open_remediations, overall_score, assessed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
          [fwId, cs.total, cs.effective, cs.weak, cs.failed, freshPct, es.expired, gs.open_gaps, gs.open_remediations, overallScore],
        );
      } catch { /* snapshot table may not exist */ }

      if (es.expired > 0) {
        await createProcessTask(tenantId, {
          title: `Evidence refresh: ${es.expired} expired item(s) in ${fw.name_en}`,
          description: `${es.expired} evidence items have expired. Refresh to maintain continuous compliance.`,
          taskType: 'evidence_request',
          priority: es.expired > 5 ? 'high' : 'medium',
          entityType: 'framework',
          entityId: fwId,
          triggerSource: 'continuous_compliance',
        });
      }

      if (cs.failed > 0) {
        await createProcessTask(tenantId, {
          title: `Control remediation: ${cs.failed} failed control(s) in ${fw.name_en}`,
          description: `${cs.failed} controls are below effectiveness threshold. Review and remediate.`,
          taskType: 'control_review',
          priority: cs.failed > 3 ? 'critical' : 'high',
          entityType: 'framework',
          entityId: fwId,
          triggerSource: 'continuous_compliance',
        });
      }

      if (overallScore < 60) {

        await swallow(EC.EVENT_BUS, eventBus.publish({
          eventType: 'compliance.posture_critical' as any,
          tenantId, sourceService: 'continuous-compliance', severity: 'critical',
          entityType: 'framework', entityId: fwId,
          payload: { frameworkId: fwId, overallScore, ...cs, ...es, ...gs },
        }));
      }
    }

    evidenceFreshnessGauge.set({ tenant_id: tenantId },
      snapshots.length > 0 ? Math.round(snapshots.reduce((s, snap) => s + snap.evidenceFreshPct, 0) / snapshots.length) : 100,
    );

  } catch (err) {
    logger.error(`[ContinuousCompliance] assessment failed for tenant ${tenantId}: ${(err as Error).message}`);
  }

  return snapshots;
}

export async function runContinuousComplianceForAllTenants(): Promise<void> {
  try {
    const tenants = await safeQuery(
      `SELECT tenant_id FROM public.tenants WHERE status = 'active' AND deleted_at IS NULL`,
    );
    for (const row of tenants.rows) {
      try {
        await assessContinuousCompliance(row.tenant_id as string);
      } catch (err) {
        logger.warn(`[ContinuousCompliance] skipped tenant ${row.tenant_id}: ${(err as Error).message}`);
      }
    }
    logger.info(`[ContinuousCompliance] completed cycle for ${tenants.rows.length} tenants`);
  } catch (err) {
    logger.error(`[ContinuousCompliance] full cycle failed: ${(err as Error).message}`);
  }
}

export function registerContinuousComplianceSubscribers(): void {

  eventBus.subscribe('evidence.collected' as any, 'cc:evidence-refresh', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const controlId = event.payload?.controlId as string;
    if (controlId) {
      const schema = tenantSchema(event.tenantId);
      try {
        const fwRes = await safeQuery(
          `SELECT framework_id FROM "${schema}".compliance_controls WHERE control_id = $1 LIMIT 1`,
          [controlId],
        );
        const fwId = getFirstRow(fwRes)?.framework_id;
        if (fwId) {
          await assessContinuousCompliance(event.tenantId, fwId);
        }
      } catch { /* non-fatal */ }
    }
  });

  eventBus.subscribe('control.effectiveness_updated' as any, 'cc:control-health', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const controlId = event.payload?.controlId as string;
    const effectiveness = event.payload?.effectiveness as number;
    if (controlId && effectiveness !== undefined) {
      controlHealthGauge.set({ tenant_id: event.tenantId, control_id: controlId }, effectiveness);
    }
  });

  eventBus.subscribe('remediation.plan_completed' as any, 'cc:remediation-closure', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    try {
      await assessContinuousCompliance(event.tenantId);
    } catch { /* non-fatal */ }
  });

  logger.info('[ContinuousCompliance] event subscribers registered');
}
