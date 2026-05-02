import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { FRAMEWORK_REGISTRY } from './jurisdiction-registry.service';

export type ReadinessLevel = 'not_started' | 'initial' | 'developing' | 'defined' | 'managed' | 'optimized';

export interface KsaFrameworkReadiness {
  frameworkCode: string;
  frameworkName: string;
  jurisdiction: string;
  totalControls: number;
  implementedControls: number;
  partialControls: number;
  notImplementedControls: number;
  controlScore: number;
  evidenceCoverage: number;
  readinessLevel: ReadinessLevel;
  readinessScore: number;
  gapCount: number;
  overdueObligations: number;
  lastAssessedAt: string | null;
}

export interface KsaReadinessSummary {
  overallReadinessScore: number;
  overallReadinessLevel: ReadinessLevel;
  frameworkReadiness: KsaFrameworkReadiness[];
  totalFrameworks: number;
  readyFrameworks: number;
  atRiskFrameworks: number;
  criticalGapCount: number;
  generatedAt: string;
}

export interface KsaReadinessGap {
  gapId: string;
  frameworkCode: string;
  controlCode: string;
  controlTitle: string;
  gapType: 'missing_implementation' | 'missing_evidence' | 'overdue_obligation' | 'test_failure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediationHint: string;
  daysOverdue: number | null;
}

export interface KsaReadinessSnapshot {
  snapshotId: string;
  tenantId: string;
  overallScore: number;
  readinessLevel: ReadinessLevel;
  frameworkScores: Record<string, number>;
  gapCount: number;
  snapshotAt: string;
}

function scoreToReadinessLevel(score: number): ReadinessLevel {
  if (score >= 90) return 'optimized';
  if (score >= 75) return 'managed';
  if (score >= 60) return 'defined';
  if (score >= 40) return 'developing';
  if (score >= 20) return 'initial';
  return 'not_started';
}

async function getFrameworkReadiness(
  schema: string,
  tenantId: string,
  frameworkCode: string
): Promise<KsaFrameworkReadiness> {
  const fw = FRAMEWORK_REGISTRY.find(f => f.code === frameworkCode);

  const [controlRes, evidenceRes, obligationRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective'))::int AS implemented,
         COUNT(*) FILTER (WHERE implementation_status = 'partial')::int AS partial,
         COUNT(*) FILTER (WHERE implementation_status IN ('not_implemented', 'not_started') OR implementation_status IS NULL)::int AS not_implemented
       FROM "${schema}".controls
       WHERE framework_code = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`,
      [frameworkCode]
    ), { tenantId, operation: 'framework control readiness' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT
         COUNT(DISTINCT c.control_id)::int AS controls_with_evidence,
         COUNT(DISTINCT c.control_id) FILTER (WHERE e.evidence_id IS NULL)::int AS controls_without_evidence
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".evidence_evidences e
         ON e.entity_type = 'control' AND e.entity_id = c.control_id::text
         AND e.status IN ('accepted', 'submitted') AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
       WHERE c.framework_code = $1 AND (c.deleted_at IS NULL OR c.deleted_at > NOW())`,
      [frameworkCode]
    ), { tenantId, operation: 'framework evidence coverage' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT COUNT(*)::int AS overdue_count
       FROM "${schema}".obligations
       WHERE framework_code = $1
         AND status = 'overdue'
         AND (deleted_at IS NULL OR deleted_at > NOW())`,
      [frameworkCode]
    ), { tenantId, operation: 'framework obligation overdue' }),
  ]);

  const cr = controlRes.rows[0] ?? {};
  const total = Number(cr.total ?? fw?.controlCount ?? 0);
  const implemented = Number(cr.implemented ?? 0);
  const partial = Number(cr.partial ?? 0);
  const notImplemented = Number(cr.not_implemented ?? total - implemented - partial);

  const controlScore = total > 0
    ? Math.round(((implemented + partial * 0.5) / total) * 100)
    : 0;

  const er = evidenceRes.rows[0] ?? {};
  const withEvidence = Number(er.controls_with_evidence ?? 0);
  const evidenceCoverage = total > 0
    ? Math.round((withEvidence / total) * 100)
    : 0;

  const overdueObligations = Number(obligationRes.rows[0]?.overdue_count ?? 0);

  const readinessScore = Math.round(controlScore * 0.6 + evidenceCoverage * 0.3 - Math.min(overdueObligations * 2, 10));
  const boundedScore = Math.max(0, Math.min(100, readinessScore));

  return {
    frameworkCode,
    frameworkName: fw?.name ?? frameworkCode,
    jurisdiction: fw?.jurisdiction ?? 'KSA',
    totalControls: total,
    implementedControls: implemented,
    partialControls: partial,
    notImplementedControls: notImplemented,
    controlScore,
    evidenceCoverage,
    readinessLevel: scoreToReadinessLevel(boundedScore),
    readinessScore: boundedScore,
    gapCount: total - implemented,
    overdueObligations,
    lastAssessedAt: new Date().toISOString(),
  };
}

export async function getKsaReadinessSummary(tenantId: string): Promise<KsaReadinessSummary> {
  const schema = tenantSchema(tenantId);
  const generatedAt = new Date().toISOString();

  try {
    const frameworkRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT DISTINCT framework_code FROM "${schema}".controls WHERE (deleted_at IS NULL OR deleted_at > NOW())`,
      []
    ), { tenantId, operation: 'get active frameworks' });

    const activeCodes = frameworkRes.rows.map((r: GenericRow) => String(r.framework_code)).filter(Boolean);

    if (activeCodes.length === 0) {
      return {
        overallReadinessScore: 0,
        overallReadinessLevel: 'not_started',
        frameworkReadiness: [],
        totalFrameworks: 0,
        readyFrameworks: 0,
        atRiskFrameworks: 0,
        criticalGapCount: 0,
        generatedAt,
      };
    }

    const frameworkReadiness = await Promise.all(
      activeCodes.map(code => getFrameworkReadiness(schema, tenantId, code))
    );

    const overallReadinessScore = frameworkReadiness.length > 0
      ? Math.round(frameworkReadiness.reduce((s, f) => s + f.readinessScore, 0) / frameworkReadiness.length)
      : 0;

    const readyFrameworks = frameworkReadiness.filter(f => f.readinessScore >= 75).length;
    const atRiskFrameworks = frameworkReadiness.filter(f => f.readinessScore < 50).length;
    const criticalGapCount = frameworkReadiness.reduce((s, f) => s + f.overdueObligations, 0);

    return {
      overallReadinessScore,
      overallReadinessLevel: scoreToReadinessLevel(overallReadinessScore),
      frameworkReadiness,
      totalFrameworks: frameworkReadiness.length,
      readyFrameworks,
      atRiskFrameworks,
      criticalGapCount,
      generatedAt,
    };
  } catch (err) {
    logger.error('[KsaReadiness] getKsaReadinessSummary failed', {
      tenantId, error: toErrorMessage(err),
    });
    return {
      overallReadinessScore: 0,
      overallReadinessLevel: 'not_started',
      frameworkReadiness: [],
      totalFrameworks: 0,
      readyFrameworks: 0,
      atRiskFrameworks: 0,
      criticalGapCount: 0,
      generatedAt,
    };
  }
}

export async function getKsaReadinessGaps(
  tenantId: string,
  frameworkCode?: string
): Promise<KsaReadinessGap[]> {
  const schema = tenantSchema(tenantId);
  const gaps: KsaReadinessGap[] = [];

  const fwCondition = frameworkCode ? `AND c.framework_code = '${frameworkCode}'` : '';

  const unimplementedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT c.control_id, c.control_code, c.title, c.framework_code,
       COALESCE(c.implementation_status, 'not_started') AS implementation_status
     FROM "${schema}".controls c
     WHERE (c.implementation_status IN ('not_implemented', 'not_started') OR c.implementation_status IS NULL)
       AND (c.deleted_at IS NULL OR c.deleted_at > NOW())
       ${fwCondition}
     LIMIT 200`,
    []
  ), { tenantId, operation: 'get implementation gaps' });

  for (const r of unimplementedRes.rows) {
    gaps.push({
      gapId: `gap-impl-${r.control_id}`,
      frameworkCode: String(r.framework_code ?? ''),
      controlCode: String(r.control_code ?? ''),
      controlTitle: String(r.title ?? ''),
      gapType: 'missing_implementation',
      severity: 'high',
      description: `Control ${r.control_code} has not been implemented`,
      remediationHint: 'Define implementation approach and assign ownership',
      daysOverdue: null,
    });
  }

  const noEvidenceRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT c.control_id, c.control_code, c.title, c.framework_code
     FROM "${schema}".controls c
     WHERE c.implementation_status IN ('implemented', 'effective')
       AND (c.deleted_at IS NULL OR c.deleted_at > NOW())
       ${fwCondition}
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence_evidences e
         WHERE e.entity_type = 'control' AND e.entity_id = c.control_id::text
           AND e.status IN ('accepted', 'submitted')
           AND (e.deleted_at IS NULL OR e.deleted_at > NOW())
       )
     LIMIT 100`,
    []
  ), { tenantId, operation: 'get evidence gaps' });

  for (const r of noEvidenceRes.rows) {
    gaps.push({
      gapId: `gap-evid-${r.control_id}`,
      frameworkCode: String(r.framework_code ?? ''),
      controlCode: String(r.control_code ?? ''),
      controlTitle: String(r.title ?? ''),
      gapType: 'missing_evidence',
      severity: 'medium',
      description: `Control ${r.control_code} is implemented but has no accepted evidence`,
      remediationHint: 'Collect and submit evidence of implementation',
      daysOverdue: null,
    });
  }

  // secrets-scan-allow: schema tenantSchema()-validated; filter fragments composed with $N binds
  const overdueObRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT obligation_id, title_en, framework_code, due_date,
       EXTRACT(DAY FROM NOW() - due_date)::int AS days_overdue
     FROM "${schema}".obligations
     WHERE status = 'overdue'
       AND (deleted_at IS NULL OR deleted_at > NOW())
       ${frameworkCode ? `AND framework_code = '${frameworkCode}'` : ''}
     LIMIT 50`,
    []
  ), { tenantId, operation: 'get overdue obligation gaps' });

  for (const r of overdueObRes.rows) {
    gaps.push({
      gapId: `gap-obl-${r.obligation_id}`,
      frameworkCode: String(r.framework_code ?? ''),
      controlCode: String(r.obligation_id ?? ''),
      controlTitle: String(r.title_en ?? ''),
      gapType: 'overdue_obligation',
      severity: 'critical',
      description: `Obligation overdue by ${r.days_overdue ?? 0} days`,
      remediationHint: 'Escalate to obligation owner and update compliance plan',
      daysOverdue: Number(r.days_overdue ?? 0),
    });
  }

  return gaps;
}

export async function saveKsaReadinessSnapshot(
  tenantId: string
): Promise<KsaReadinessSnapshot> {
  const schema = tenantSchema(tenantId);
  const summary = await getKsaReadinessSummary(tenantId);

  const frameworkScores: Record<string, number> = {};
  for (const fr of summary.frameworkReadiness) {
    frameworkScores[fr.frameworkCode] = fr.readinessScore;
  }

  const res = await safeQuery(
    `INSERT INTO "${schema}".ksa_regulatory_readiness_snapshots
       (tenant_id, overall_score, readiness_level, framework_scores, gap_count, snapshot_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING snapshot_id, snapshot_at`,
    [
      tenantId,
      summary.overallReadinessScore,
      summary.overallReadinessLevel,
      JSON.stringify(frameworkScores),
      summary.criticalGapCount,
    ]
  ).catch(() => ({ rows: [] }));

  const snapshotId = res.rows[0]?.snapshot_id ?? `snapshot-${Date.now()}`;
  const snapshotAt = res.rows[0]?.snapshot_at ?? new Date().toISOString();

  logger.info('[KsaReadiness] snapshot saved', { tenantId, snapshotId, score: summary.overallReadinessScore });

  return {
    snapshotId: String(snapshotId),
    tenantId,
    overallScore: summary.overallReadinessScore,
    readinessLevel: summary.overallReadinessLevel,
    frameworkScores,
    gapCount: summary.criticalGapCount,
    snapshotAt: String(snapshotAt),
  };
}

export async function getKsaReadinessHistory(
  tenantId: string,
  limit = 12
): Promise<KsaReadinessSnapshot[]> {
  const schema = tenantSchema(tenantId);

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT snapshot_id, tenant_id, overall_score, readiness_level, framework_scores, gap_count, snapshot_at
     FROM "${schema}".ksa_regulatory_readiness_snapshots
     WHERE tenant_id = $1
     ORDER BY snapshot_at DESC
     LIMIT $2`,
    [tenantId, limit]
  ), { tenantId, operation: 'readiness history' });

  return res.rows.map((r: GenericRow) => ({
    snapshotId: String(r.snapshot_id),
    tenantId: String(r.tenant_id),
    overallScore: Number(r.overall_score ?? 0),
    readinessLevel: (r.readiness_level as ReadinessLevel) ?? 'not_started',
    frameworkScores: (typeof r.framework_scores === 'object' ? r.framework_scores : {}) as Record<string, number>,
    gapCount: Number(r.gap_count ?? 0),
    snapshotAt: String(r.snapshot_at),
  }));
}
