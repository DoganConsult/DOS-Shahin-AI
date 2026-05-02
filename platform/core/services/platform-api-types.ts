/**
 * Platform API DTOs — AGRC-OS
 * Extracted from platform-api.service.ts for reuse across the application.
 */

export interface ExceptionDto {
  id: string;
  title: string;
  status: string;
  workspaceId: string;
  reason?: string;
  expiresAt?: string;
}

export interface FindingDto {
  id: string;
  title: string;
  status: string;
  workspaceId: string;
  severity?: string;
  description?: string;
}

export interface AssetDto {
  id: string;
  name: string;
  type: string;
  status: string;
  workspaceId?: string;
  criticality?: string;
}

export interface MappingDto {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
}

export interface CreateMappingRequest {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
}

export interface RelationshipDto {
  id: string;
  type: string;
  targetType: string;
  targetId: string;
  targetName: string;
}

export interface AutomationRuleDto {
  id: string;
  name: string;
  module?: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
}

export interface AutomationLogEntryDto {
  id: string;
  ruleId: string;
  module?: string;
  status: string;
  executedAt: string;
}

export interface ReportScenarioDto {
  id: string;
  type: string;
  title: string;
  description?: string;
}

export interface ReportScheduleDto {
  id: string;
  type: string;
  frequency: string;
  nextRunAt: string;
}

export interface ReportTemplateDto {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface KSAHeatmapDto {
  cells: Array<{ framework: string; domain: string; score: number; status: string }>;
}

export interface DPIADto {
  id: string;
  title: string;
  status: string;
  riskLevel?: string;
  createdAt?: string;
}

export interface FrameworkMappingDto {
  frameworkId: string;
  totalRegistryControls: number;
  mappedControls: number;
  unmappedControls: number;
  coveragePercent: number;
  mapping: Array<{ nodeId: string; code: string; titleEn: string; titleAr: string; priority: string; evidenceTypes: string[]; mapped: boolean; tenantControls: Array<{ controlId: string; title: string }> }>;
}

export interface FrameworkHierarchyDto {
  instrument: { id: string; code: string; titleEn: string; titleAr: string };
  tree: Array<{ nodeId: string; code: string; titleEn: string; children: unknown[] }>;
  totalNodes: number;
  levels: { chapters: number; domains: number; subdomains: number; controls: number; requirements: number };
}

export interface KSAFrameworkMappingDto {
  uniqueControls: number;
  totalSatisfied: number;
  efficiencyRatio: number;
  frameworkColumns: string[];
  mappings: Array<Record<string, unknown>>;
  lastUpdated: string;
}

export interface BenchmarkDto {
  tenantKPIs: { complianceScore: number; riskScore: number; evidenceCoverage: number; remediationClosureRate: number };
  percentiles: { complianceScore: number; riskScore: number; evidenceCoverage: number; remediationClosureRate: number };
  industryAvg: { complianceScore: number; riskScore: number; evidenceCoverage: number; remediationClosureRate: number };
  sampleSize: number;
}

export interface MaturityDto {
  level: string;
  aggregate: number;
  criteria: { complianceScore: number; riskScore: number; evidenceCoverage: number; processMaturity: number };
}

export interface CompiledRegulationDto {
  instrument: { id: string; code: string; titleEn: string; titleAr: string };
  obligations: Array<{ nodeId: string; code: string; titleEn: string; titleAr: string; priority: string; evidenceTypes: string[]; automatable: boolean; parentCode: string }>;
  draftControls: Array<{ suggestedTitle: string; mappedNode: string; code: string }>;
}

export interface LandingContentDto {
  agents: Array<{ id: string; name: string; description: string }>;
  painPoints: Array<{ titleEn: string; titleAr: string; descEn: string; descAr: string }>;
  chartData: Record<string, unknown>;
  ksaBadges: Array<{ code: string; label: string; labelAr: string; color: string; status: string; highlight: boolean }>;
  internationalBadges: Array<{ code: string; label: string; labelAr: string; color: string; status: string; highlight: boolean }>;
  capabilities: Array<{ icon: string; titleEn: string; titleAr: string; descEn: string; descAr: string }>;
  industries: Array<{ icon: string; nameEn: string; nameAr: string }>;
  faqs: Array<{ qEn: string; qAr: string; aEn: string; aAr: string }>;
}

export interface DPIAConfigDto {
  mitigations: Array<{ controlId: string; code: string; titleEn: string; titleAr: string }>;
  lawfulBases: Array<{ value: string; labelEn: string; labelAr: string; descEn: string; descAr: string; icon: string }>;
  necessityQuestions: Array<{ labelEn: string; labelAr: string; score: number }>;
  defaultRisks: Array<{ category: string; categoryAr: string; likelihood: number; impact: number; score: number; residual: number }>;
  defaultDataCategories: Array<{ name: string; nameAr: string; source: string; storage: string; retention: string }>;
}

export interface ConsentRecordsDto {
  records: Array<{ id: string; purpose: string; status: string; consentedAt: string }>;
  count: number;
}

export interface RetentionDto {
  entries: Array<{ id: string; dataCategory: string; retentionPeriod: string; legalBasis: string }>;
  count: number;
}

export interface EvidenceRecordDto {
  evidence_id: string;
  control_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  chain_position: number;
}

export interface EvidenceSubmitDto {
  controlId: string;
  title: string;
  type: string;
  description?: string;
}

export interface EvidenceScheduleCreateDto {
  controlId: string;
  frequency: string;
  enabled: boolean;
}

export interface ControlTestDto {
  testType: string;
  parameters?: Record<string, unknown>;
}

export interface WorkflowExecuteDto {
  inputs?: Record<string, unknown>;
  triggerSource?: string;
}

export interface ReportParamsDto {
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  format?: string;
}

export interface ContentPackManifestDto {
  packId: string;
  version: string;
  modules: string[];
  config?: Record<string, unknown>;
}

export interface RiskScoringModelParamsDto {
  weights?: Record<string, number>;
  thresholds?: Record<string, number>;
  algorithm?: string;
}

export interface AnalyticsKPIDto {
  kpis: Array<{ key: string; value: number; trend: string }>;
  /** Allow direct key access for convenience in components */
  [key: string]: unknown;
}

export interface AnalyticsPredictionDto {
  predictions: Array<{ metric: string; currentValue: number; predictedValue: number; confidence: number }>;
}

export interface RemediationTaskDto {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: string;
}

export interface RiskMetricsKPIDto {
  kpis: Array<{ key: string; value: number; threshold: number }>;
}

export interface RiskTrendsDto {
  trends: Array<{ date: string; score: number; category: string }>;
}

export interface RiskPostureDto {
  overallScore: number;
  trend: string;
  categories: Array<{ name: string; score: number }>;
}

export interface RiskScoringModelDto {
  id: string;
  name: string;
  type: string;
  parameters: RiskScoringModelParamsDto;
}

export interface KRITrendsDto {
  indicators: Array<{ name: string; values: Array<{ date: string; value: number }> }>;
}

export interface RegulatorDto {
  id: string;
  name: string;
  country: string;
  sector: string;
}

export interface SectorDto {
  id: string;
  name: string;
  regulators: string[];
}

export interface SimulationDto {
  id: string;
  status: string;
  createdAt: string;
  results?: Record<string, unknown>;
}

export interface RedTeamRunDto {
  id: string;
  status: string;
  startedAt: string;
  findings: number;
}

export interface RedTeamSummaryDto {
  totalRuns: number;
  totalFindings: number;
  criticalFindings: number;
  lastRunAt?: string;
}

export interface ExplainabilityPackDto {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  content?: Record<string, unknown>;
}

export interface WorkflowDto {
  id: string;
  name: string;
  status: string;
  description?: string;
}

export interface WorkflowAnalyticsDto {
  executionCount: number;
  avgDuration: number;
  successRate: number;
  recentExecutions: Array<{ id: string; status: string; duration: number }>;
}

export interface ConnectorDto {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface ExceptionGovernanceRuleDto {
  id: string;
  name: string;
  conditions: Record<string, unknown>;
  autoApprove: boolean;
}

export interface ControlLifecycleStateDto {
  state: string;
  allowedTransitions: string[];
}

export interface ControlLifecycleHistoryDto {
  entries: Array<{ fromState: string; toState: string; changedBy: string; changedAt: string }>;
}

export interface EvidenceCatalogEntryDto {
  controlId: string;
  requiredTypes: string[];
  frequency: string;
  status: string;
}

export interface PrivacyRopaDto {
  entries: Array<{ id: string; purpose: string; legalBasis: string; dataCategories: string[] }>;
}

export interface PrivacyDSRDto {
  id: string;
  type: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
}

export interface WorkflowTemplateDto {
  id: string;
  name: string;
  description?: string;
  steps: Array<{ id: string; type: string; name: string }>;
}

export interface WebhookDto {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export interface IntegrationConfigDto {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  active: boolean;
}

export interface ContentPackDto {
  id: string;
  name: string;
  version: string;
  installedAt: string;
  status: string;
}

export interface KpiDetailDto {
  key: string;
  title: string;
  value: number;
  trend: string;
  items: Array<{ id: string; label: string; value: number; status: string }>;
}

export interface KpiCardIndicatorDto {
  key: string;
  title: string;
  value: number;
  icon: string;
  trend: string;
}

export interface KpiItemDto {
  id: string;
  label: string;
  value: number;
  status: string;
}

export interface ComplianceOverviewDto {
  frameworks: number;
  controls: number;
  overallScore: number;
  gaps: number;
}

export interface GapAnalysisDto {
  frameworkId: string;
  gaps: Array<{ controlId: string; gap: string; severity: string }>;
}

export interface RemediationDto {
  id: string;
  title: string;
  status: string;
  controlId?: string;
}

export interface KPITrendDto {
  date: string;
  metric: string;
  value: number;
}

export interface TrainingStatusDto {
  status: string;
  loaded: boolean;
  recordCount: number;
}

export interface CadenceTaskDto {
  id: string;
  title: string;
  frequency: string;
  nextDueDate: string;
  status: string;
}

export interface CadenceOverrideDto {
  id: string;
  taskId: string;
  overrideDate: string;
  reason: string;
}
