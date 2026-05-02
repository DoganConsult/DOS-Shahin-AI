export type WidgetStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'suspended' | 'archived';

export type WidgetCategory =
  | 'executive'
  | 'insight'
  | 'structural'
  | 'kpi'
  | 'kri'
  | 'compliance'
  | 'risk'
  | 'audit'
  | 'evidence'
  | 'general';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetDefinition {
  widgetId: string;
  widgetKey: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: WidgetCategory;
  size: WidgetSize;
  icon: string;
  status: WidgetStatus;
  version: string;
  dataSources: string[];
  requiredPermissions: string[];
  scopeRule: string;
  config: Record<string, unknown>;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetBundle {
  bundleId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  widgetIds: string[];
  layout: WidgetLayoutConfig[];
  status: WidgetStatus;
  targetAudience: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetLayoutConfig {
  widgetId: string;
  position: number;
  colSpan: number;
  rowSpan: number;
}

export interface WidgetRenderContext {
  tenantId: string;
  userId: string;
  widgetKey: string;
  scopeOrgUnitIds?: string[];
}

export interface WidgetRenderResult<T = unknown> {
  widgetKey: string;
  title: string;
  payload: T;
  fetchedAt: string;
  cached: boolean;
}

export interface WidgetRequestContext {
  tenantId: string;
  userId: string;
  widgetKey: string;
}

export interface WidgetResponseDto<T = unknown> {
  widgetKey: string;
  title: string;
  payload: T;
  fetchedAt: string;
}

export interface MetricCardPayload {
  value: number;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  delta?: number;
}

export interface RiskHeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
}

export interface RiskHeatmapPayload {
  cells: RiskHeatmapCell[];
  totalRisks: number;
}

export interface OverdueActionItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: string | null;
  owner: string | null;
  sourceType: string | null;
}

export interface AuditExposurePayload {
  openFindings: number;
  highSeverityFindings: number;
  overdueRemediations: number;
}

export interface PrivacyIncidentPayload {
  openIncidents: number;
  underReview: number;
  closedLast30Days: number;
}

export interface MaturityScorePayload {
  overallScore: number;
  previousScore: number | null;
  domainCount: number;
}

export interface AssessmentProgressPayload {
  totalAssessments: number;
  inProgress: number;
  completed: number;
}

export interface RecommendationPayload {
  openRecommendations: number;
  highPriorityRecommendations: number;
  trackedRecommendations: number;
}

export interface EvidenceCoveragePayload {
  totalControls: number;
  controlsWithEvidence: number;
  coveragePercent: number;
}

export interface KriStatusPayload {
  totalKris: number;
  breached: number;
  healthy: number;
}

export interface ExecutiveWidgetSummaryDto {
  staleControlsCount: number;
  overdueRemediationCount: number;
  policyReviewDebtCount: number;
  latestEngineRun: {
    runId: string | null;
    status: string | null;
    startedAt: string | null;
    completedAt: string | null;
    staleControls: number;
    overdueRemediations: number;
    kriBreaches: number;
    policyReviewsStarted: number;
    tasksCreated: number;
    notificationsCreated: number;
    escalationsTriggered: number;
  } | null;
}

export interface BreachedKriDto {
  kriId: string;
  name: string;
  linkedRiskId: string | null;
  owner: string | null;
  currentValue: number | null;
  thresholdAmber: number | null;
  thresholdRed: number | null;
  status: string | null;
  trend: string | null;
}

export interface PolicyReviewDebtDto {
  policyId: string;
  title: string;
  owner: string | null;
  nextReviewDate: string | null;
  daysOverdue: number;
}

export interface WidgetCreateDTO {
  widgetKey: string;
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category: WidgetCategory;
  size?: WidgetSize;
  icon?: string;
  dataSources?: string[];
  requiredPermissions?: string[];
  scopeRule?: string;
  config?: Record<string, unknown>;
}

export interface WidgetUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  category?: WidgetCategory;
  size?: WidgetSize;
  icon?: string;
  status?: WidgetStatus;
  dataSources?: string[];
  requiredPermissions?: string[];
  scopeRule?: string;
  config?: Record<string, unknown>;
}

export interface BundleCreateDTO {
  nameEn: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  widgetIds: string[];
  layout?: WidgetLayoutConfig[];
  targetAudience?: string;
}

export interface BundleUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  widgetIds?: string[];
  layout?: WidgetLayoutConfig[];
  status?: WidgetStatus;
  targetAudience?: string;
}
