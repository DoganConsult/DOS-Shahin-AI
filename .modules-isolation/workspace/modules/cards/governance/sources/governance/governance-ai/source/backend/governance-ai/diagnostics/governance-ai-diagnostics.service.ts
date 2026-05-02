import { safeQuery, tenantSchema } from '../ports/database.port';

export interface GovernanceAiDiagnosticsReport {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  signalHealth: SignalHealthResult;
  interpretationHealth: InterpretationHealthResult;
  modelHealth: ModelHealthResult;
  narrativeHealth: NarrativeHealthResult;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface SignalHealthResult {
  unresolvedSignals: number;
  highSeverityUnresolved: number;
  staleSignals: number;
  issues: string[];
}

export interface InterpretationHealthResult {
  pendingInterpretation: number;
  pendingHumanReview: number;
  issues: string[];
}

export interface ModelHealthResult {
  activeModels: number;
  degradedModels: number;
  staleModels: number;
  issues: string[];
}

export interface NarrativeHealthResult {
  pendingApproval: number;
  generationFailures: number;
  issues: string[];
}

export class GovernanceAiDiagnosticsService {
  async runDiagnostics(tenantId: string): Promise<GovernanceAiDiagnosticsReport> {
    const schema = tenantSchema(tenantId);
    const warnings: string[] = [];
    const errors: string[] = [];

    const [
      unresolvedResult, highSevResult, staleResult,
      pendingInterpResult, pendingReviewResult,
      activeModelResult, degradedModelResult, staleModelResult,
      pendingNarrResult, failedNarrResult,
    ] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE status NOT IN ('resolved', 'dismissed', 'archived')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE severity IN ('critical', 'high') AND status NOT IN ('resolved', 'dismissed', 'archived')`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE status NOT IN ('resolved', 'dismissed', 'archived') AND updated_at < NOW() - INTERVAL '30 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE status = 'detected'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".signal_interpretations WHERE human_review_required = true AND human_reviewed_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_ai_models WHERE status = 'active'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_ai_models WHERE status = 'active' AND (accuracy IS NOT NULL AND accuracy < 0.7)`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_ai_models WHERE status = 'active' AND last_trained_at < NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".escalation_narratives WHERE approved = false AND generated_at < NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".escalation_narrative_failures WHERE created_at > NOW() - INTERVAL '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    const unresolved = unresolvedResult.rows[0]?.count ?? 0;
    const highSev = highSevResult.rows[0]?.count ?? 0;
    const stale = staleResult.rows[0]?.count ?? 0;
    const pendingInterp = pendingInterpResult.rows[0]?.count ?? 0;
    const pendingReview = pendingReviewResult.rows[0]?.count ?? 0;
    const activeModel = activeModelResult.rows[0]?.count ?? 0;
    const degradedModel = degradedModelResult.rows[0]?.count ?? 0;
    const staleModel = staleModelResult.rows[0]?.count ?? 0;
    const pendingNarr = pendingNarrResult.rows[0]?.count ?? 0;
    const failedNarr = failedNarrResult.rows[0]?.count ?? 0;

    const signalIssues: string[] = [];
    if (highSev > 0) { signalIssues.push(`${highSev} high/critical severity signals unresolved`); errors.push(`${highSev} high-severity governance signal(s) unresolved`); }
    if (stale > 0) { signalIssues.push(`${stale} signals stale (30+ days)`); warnings.push(`${stale} governance signal(s) stale`); }

    const interpIssues: string[] = [];
    if (pendingInterp > 0) interpIssues.push(`${pendingInterp} signals pending interpretation`);
    if (pendingReview > 0) { interpIssues.push(`${pendingReview} interpretations pending human review`); warnings.push(`${pendingReview} interpretation(s) need human review`); }

    const modelIssues: string[] = [];
    if (degradedModel > 0) { modelIssues.push(`${degradedModel} models with accuracy below 70%`); warnings.push(`${degradedModel} model(s) degraded`); }
    if (staleModel > 0) modelIssues.push(`${staleModel} models not retrained in 90 days`);

    const narrIssues: string[] = [];
    if (pendingNarr > 0) narrIssues.push(`${pendingNarr} narratives pending approval 7+ days`);
    if (failedNarr > 0) narrIssues.push(`${failedNarr} narrative generation failures this week`);

    const criticalCount = highSev + (errors.length > 0 ? 1 : 0);
    const degradedCount = stale + pendingReview + degradedModel + pendingNarr;
    const overallHealth = criticalCount > 0 ? 'critical' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      moduleCode: 'governance-ai',
      tenantId,
      generatedAt: new Date().toISOString(),
      signalHealth: { unresolvedSignals: unresolved, highSeverityUnresolved: highSev, staleSignals: stale, issues: signalIssues },
      interpretationHealth: { pendingInterpretation: pendingInterp, pendingHumanReview: pendingReview, issues: interpIssues },
      modelHealth: { activeModels: activeModel, degradedModels: degradedModel, staleModels: staleModel, issues: modelIssues },
      narrativeHealth: { pendingApproval: pendingNarr, generationFailures: failedNarr, issues: narrIssues },
      overallHealth,
      warnings,
      errors,
    };
  }
}
