/**
 * Quality Gate — Frontend Contracts
 * TypeScript interfaces for quality gate API responses.
 */

export type QgateRunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'overridden' | 'skipped';
export type QgateStageCode = 'devsecops' | 'unit' | 'integration' | 'ai-guardrails' | 'e2e-visual' | 'performance' | 'mutation';

export interface QgateRun {
  run_id: string;
  tenant_id: string;
  release_id: string | null;
  commit_sha: string | null;
  trigger_type: string;
  status: QgateRunStatus;
  overall_score: number | null;
  stages_total: number;
  stages_passed: number;
  stages_failed: number;
  started_at: string | null;
  completed_at: string | null;
  triggered_by: string;
  override_by: string | null;
  override_reason: string | null;
  created_at: string;
}

export interface QgateStageResult {
  result_id: string;
  stage_number: number;
  stage_code: QgateStageCode;
  status: QgateRunStatus;
  score: number | null;
  threshold: number | null;
  duration_ms: number | null;
  blockers: Array<{ code: string; message: string; severity: string }>;
  details: Record<string, unknown>;
}

export interface QgateDashboardSummary {
  latestRun: QgateRun | null;
  passRate30d: number;
  totalRuns30d: number;
  aiGuardrailScore: number | null;
  schemaDriftCount: { critical: number; warning: number; info: number };
  mutationScore: number | null;
  stageHealth: Array<{ stageCode: QgateStageCode; lastStatus: QgateRunStatus; lastScore: number | null }>;
}

export interface QgateDriftEntry {
  drift_id: string;
  severity: string;
  category: string;
  table_name: string | null;
  column_name: string | null;
  detail: string;
  resolved: boolean;
  created_at: string;
}

export interface QgateThreshold {
  stage_code: QgateStageCode;
  metric_code: string;
  min_value: number;
}

export const STAGE_LABELS: Record<QgateStageCode, { en: string; ar: string; icon: string }> = {
  devsecops:      { en: 'DevSecOps',          ar: 'أمن التطوير',            icon: 'pi-shield' },
  unit:           { en: 'Unit Tests',         ar: 'اختبارات الوحدة',        icon: 'pi-check-circle' },
  integration:    { en: 'Integration',        ar: 'التكامل',                icon: 'pi-database' },
  'ai-guardrails': { en: 'AI Guardrails',     ar: 'حواجز الذكاء الاصطناعي', icon: 'pi-microchip' },
  'e2e-visual':   { en: 'E2E & Visual',       ar: 'الاختبار الشامل',        icon: 'pi-eye' },
  performance:    { en: 'Performance',        ar: 'الأداء',                  icon: 'pi-chart-line' },
  mutation:       { en: 'Mutation',           ar: 'الطفرات',                 icon: 'pi-code' },
};
