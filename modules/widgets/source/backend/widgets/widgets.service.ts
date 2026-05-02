import { emptyResult, query } from './ports/database.port';
import type {
  WidgetRequestContext,
  WidgetResponseDto,
} from './types/widget.types';
import * as insight from './insight-widgets.service';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { safeQuery } from '@dos/db';

// Map of insight widget keys → fetcher functions
const INSIGHT_FETCHERS: Record<string, (tenantId: string) => Promise<unknown>> = {
  'zombie-controls': insight.zombieControls,
  'year-in-grc': insight.yearInGrc,
  'untested-assumptions': insight.untestedAssumptions,
  'silent-controls': insight.silentControls,
  'root-cause-vs-patch': insight.rootCauseVsPatch,
  'risk-gravity': insight.riskGravity,
  'risk-denial': insight.riskDenial,
  'reputation-impact': insight.reputationImpact,
  'regulator-lens': insight.regulatorLens,
  'org-amnesia': insight.orgAmnesia,
  'one-sentence-truth': insight.oneSentenceTruth,
  'momentum-indicator': insight.momentumIndicator,
  'lifecycle-bottleneck': insight.lifecycleBottleneck,
  'knowledge-in-people': insight.knowledgeInPeople,
  'improvement-illusion': insight.improvementIllusion,
  'if-nothing-changes': insight.ifNothingChanges,
  'maturity-gap': insight.maturityGap,
  'future-you': insight.futureYou,
  'grc-time-loop': insight.grcTimeLoop,
  'false-comfort': insight.falseComfort,
  'evidence-rot': insight.evidenceRot,
  'decision-trace': insight.decisionTrace,
  'cultural-drift': insight.culturalDrift,
  'control-aging': insight.controlAging,
  'change-leverage': insight.changeLeverage,
  'breaking-the-cycle': insight.breakingTheCycle,
  'board-reality': insight.boardReality,
  'audit-dejavu': insight.auditDejavu,
  'assessment-honesty': insight.assessmentHonesty,
};

export class WidgetsService {
  async getWidgetData(ctx: WidgetRequestContext): Promise<WidgetResponseDto> {
    // Check insight widgets first (29 DB-backed insight endpoints)
    const insightFetcher = INSIGHT_FETCHERS[ctx.widgetKey];
    if (insightFetcher) {
      const payload = await insightFetcher(ctx.tenantId);
      return {
        widgetKey: ctx.widgetKey,
        title: ctx.widgetKey,
        payload,
        fetchedAt: new Date().toISOString(),
      };
    }

    const schema = await this.resolveTenantSchema(ctx.tenantId);

    switch (ctx.widgetKey) {
      case 'executive-summary':
        return this.executiveSummary(schema);
      case 'risk-heatmap':
        return this.riskHeatmap(schema);
      case 'overdue-actions':
        return this.overdueActions(schema);
      case 'audit-exposure':
        return this.auditExposure(schema);
      case 'privacy-incidents':
        return this.privacyIncidents(schema);
      case 'maturity-score':
        return this.maturityScore(schema);
      case 'assessment-progress':
        return this.assessmentProgress(schema);
      case 'recommendations':
        return this.recommendations(schema);
      case 'evidence-coverage':
        return this.evidenceCoverage(schema);
      case 'kri-status':
        return this.kriStatus(schema);
      default:
        throw new Error(`Unsupported widget key: ${ctx.widgetKey}`);
    }
  }

  private async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await safeQuery(
      `SELECT schema_name
       FROM public.tenants
       WHERE tenant_id = $1::text
       LIMIT 1`,
      [tenantId]
    );

    const schema = result.rows[0]?.schema_name;
    if (!schema) throw new Error('Tenant schema not found');
    return schema;
  }

  private async executiveSummary(schema: string): Promise<WidgetResponseDto> {
    const [riskRes, findingRes, actionRes] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".risks`), { operation: 'query risks' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".findings WHERE status IS DISTINCT FROM 'closed'`), { operation: 'query risks' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".action_items WHERE status IS DISTINCT FROM 'closed'`), { operation: 'query risks' }),
    ]);

    return {
      widgetKey: 'executive-summary',
      title: 'Executive Summary',
      payload: {
        totalRisks: riskRes.rows[0]?.cnt ?? 0,
        openFindings: findingRes.rows[0]?.cnt ?? 0,
        openActions: actionRes.rows[0]?.cnt ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async riskHeatmap(schema: string): Promise<WidgetResponseDto> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT
         COALESCE(likelihood, 0)::int AS likelihood,
         COALESCE(impact, 0)::int AS impact,
         COUNT(*)::int AS count
       FROM "${schema}".risks
       GROUP BY likelihood, impact
       ORDER BY likelihood, impact`
    ), { operation: 'query risks' });

    const totalRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".risks`
    ), { operation: 'query risks' });

    return {
      widgetKey: 'risk-heatmap',
      title: 'Risk Heatmap',
      payload: {
        cells: result.rows,
        totalRisks: totalRes.rows[0]?.cnt ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async overdueActions(schema: string): Promise<WidgetResponseDto> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT
         item_id::text AS id,
         title,
         deadline AS "dueDate",
         status,
         assigned_to AS owner,
         source_type AS "sourceType"
       FROM "${schema}".action_items
       WHERE deadline IS NOT NULL
         AND deadline < now()
         AND COALESCE(status, '') NOT IN ('closed', 'completed')
       ORDER BY deadline ASC
       LIMIT 10`
    ), { operation: 'query action_items' });

    return {
      widgetKey: 'overdue-actions',
      title: 'Overdue Actions',
      payload: result.rows,
      fetchedAt: new Date().toISOString(),
    };
  }

  private async auditExposure(schema: string): Promise<WidgetResponseDto> {
    const [openFindings, highSeverity, overdueRemediations] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".findings WHERE status IS DISTINCT FROM 'closed'`), { operation: 'query findings' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".findings WHERE severity IN ('high','critical') AND status IS DISTINCT FROM 'closed'`), { operation: 'query findings' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".remediation_tasks WHERE due_date < now() AND COALESCE(status, '') NOT IN ('closed','completed')`), { operation: 'query findings' }),
    ]);

    return {
      widgetKey: 'audit-exposure',
      title: 'Audit Exposure',
      payload: {
        openFindings: openFindings.rows[0]?.cnt ?? 0,
        highSeverityFindings: highSeverity.rows[0]?.cnt ?? 0,
        overdueRemediations: overdueRemediations.rows[0]?.cnt ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async privacyIncidents(schema: string): Promise<WidgetResponseDto> {
    const [openIncidents, underReview, closedLast30] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".privacy_incidents WHERE COALESCE(status,'') NOT IN ('closed','completed')`), { operation: 'query privacy_incidents' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".privacy_reviews WHERE COALESCE(status,'') IN ('open','in_review')`), { operation: 'query privacy_incidents' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".privacy_incidents WHERE COALESCE(status,'') IN ('closed','completed') AND updated_at >= now() - interval '30 days'`), { operation: 'query privacy_incidents' }),
    ]);

    return {
      widgetKey: 'privacy-incidents',
      title: 'Privacy Incidents',
      payload: {
        openIncidents: openIncidents.rows[0]?.cnt ?? 0,
        underReview: underReview.rows[0]?.cnt ?? 0,
        closedLast30Days: closedLast30.rows[0]?.cnt ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async maturityScore(schema: string): Promise<WidgetResponseDto> {
    const current = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ avg_score: 0, domain_count: 0 }]), query(
      `SELECT AVG(score)::numeric(10,2) AS avg_score, COUNT(*)::int AS domain_count
       FROM "${schema}".maturity_scores`
    ), { operation: 'query maturity_scores' });

    return {
      widgetKey: 'maturity-score',
      title: 'Maturity Score',
      payload: {
        overallScore: Number(current.rows[0]?.avg_score ?? 0),
        previousScore: null,
        domainCount: current.rows[0]?.domain_count ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async assessmentProgress(schema: string): Promise<WidgetResponseDto> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, in_progress: 0, completed: 0 }]), query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE COALESCE(status,'') IN ('in_progress','draft'))::int AS in_progress,
         COUNT(*) FILTER (WHERE COALESCE(status,'') IN ('completed','closed'))::int AS completed
       FROM "${schema}".assessments`
    ), { operation: 'query assessments' });

    return {
      widgetKey: 'assessment-progress',
      title: 'Assessment Progress',
      payload: {
        totalAssessments: result.rows[0]?.total ?? 0,
        inProgress: result.rows[0]?.in_progress ?? 0,
        completed: result.rows[0]?.completed ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async recommendations(schema: string): Promise<WidgetResponseDto> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, high_priority: 0, tracked: 0 }]), query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE priority IN ('high','critical'))::int AS high_priority,
         COUNT(*) FILTER (WHERE COALESCE(status,'') IN ('tracked','in_progress'))::int AS tracked
       FROM "${schema}".qiyas_recommendations`
    ), { operation: 'query qiyas_recommendations' });

    return {
      widgetKey: 'recommendations',
      title: 'Recommendations',
      payload: {
        openRecommendations: result.rows[0]?.total ?? 0,
        highPriorityRecommendations: result.rows[0]?.high_priority ?? 0,
        trackedRecommendations: result.rows[0]?.tracked ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async evidenceCoverage(schema: string): Promise<WidgetResponseDto> {
    const [controlsRes, coveredRes] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*)::int AS cnt FROM "${schema}".controls`), { operation: 'query controls' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(
        `SELECT COUNT(DISTINCT control_id)::int AS cnt
         FROM "${schema}".evidence
         WHERE control_id IS NOT NULL`
      ), { operation: 'query controls' }),
    ]);

    const totalControls = controlsRes.rows[0]?.cnt ?? 0;
    const controlsWithEvidence = coveredRes.rows[0]?.cnt ?? 0;
    const coveragePercent =
      totalControls > 0 ? Math.round((controlsWithEvidence / totalControls) * 100) : 0;

    return {
      widgetKey: 'evidence-coverage',
      title: 'Evidence Coverage',
      payload: {
        totalControls,
        controlsWithEvidence,
        coveragePercent,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async kriStatus(schema: string): Promise<WidgetResponseDto> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, breached: 0, healthy: 0 }]), query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE COALESCE(status,'') = 'breached')::int AS breached,
         COUNT(*) FILTER (WHERE COALESCE(status,'') IN ('healthy','green'))::int AS healthy
       FROM "${schema}".risk_kris`
    ), { operation: 'query risk_kris' });

    return {
      widgetKey: 'kri-status',
      title: 'KRI Status',
      payload: {
        totalKris: result.rows[0]?.total ?? 0,
        breached: result.rows[0]?.breached ?? 0,
        healthy: result.rows[0]?.healthy ?? 0,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}
