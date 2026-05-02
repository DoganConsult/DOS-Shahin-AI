/**
 * Compliance Feature Models — AGRC-OS
 * All DTOs for the Compliance Command Workspace
 */

// ═══ Allowed actions (role/workflow scoped) ═══
export interface AllowedActions {
  canSubmitEvidence: boolean;
  canAttest: boolean;
  canApprove: boolean;
  canStartAssessment: boolean;
  canExport: boolean;
  canManageFrameworks: boolean;
  /** Optional; when absent, treat as canSubmitEvidence for "Log Gap" */
  canLogGap?: boolean;
  /** Optional; when absent, treat as canExport for "Download audit package" */
  canDownloadAuditPackage?: boolean;
}

// ═══ Overview ═══
export interface EvidenceCoverageByTier {
  tierA: number;
  tierB: number;
  tierC: number;
  total: number;
}

export interface ComplianceSummary {
  overallScore: number;
  activeFrameworks: number;
  openGaps: number;
  criticalGaps: number;
  obligationsCovered: number;
  controlsMapped: number;
  evidenceCoverage: number;
  /** Evidence count by quality tier (A/B/C). Present when backend supports it. */
  evidenceCoverageByTier?: EvidenceCoverageByTier;
  /** Percentage of evidence within freshness window (e.g. not expired, submitted in last 90 days). */
  evidenceFreshnessScore?: number;
  auditReadiness: number;
  overdueActions: number;
}

export interface ComplianceOverviewDto {
  overallComplianceScore?: number;
  summary: ComplianceSummary;
  frameworks: FrameworkSummaryDto[];
  domains: DomainSummaryDto[];
  priorityIssues: ComplianceIssueDto[];
  trends: ComplianceTrendDto[];
  recentAssessments: AssessmentRunDto[];
}

export interface ComplianceTrendDto {
  date: string;
  score: number;
  frameworkId?: string;
}

export interface ComplianceIssueDto {
  type: string;
  severity: string;
  title: string;
  dueDate?: string;
  owner?: string;
  entityId: string;
}

export interface AssessmentRunDto {
  assessmentId: string;
  frameworkId?: string;
  title?: string;
  status: string;
  score?: number;
  createdAt: string;
  runBy?: string;
  scope?: string;
}

// ═══ Frameworks ═══
export interface FrameworkSummaryDto {
  frameworkId: string;
  frameworkCode: string;
  frameworkName: string;
  nameEn: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category: string;
  instrumentType?: string;
  version?: string;
  regulatorId?: string;
  status: string;
  owner?: string;
  scope?: string;
  score: number;
  domainsCount?: number;
  obligationsCount?: number;
  totalControls: number;
  implementedControls: number;
  controlsMapped: number;
  evidenceCoverage: number;
  openGaps?: number;
  auditReadiness?: number;
  lastReviewDate?: string;
  targetDate?: string;
  createdAt?: string;
  /** Maturity level: Initial | Developing | Defined | Managed | Optimized */
  maturityLevel?: string;
  /** Maturity score 0–100 (weighted implementation + evidence + test) */
  maturityScore?: number;
}

export interface FrameworkDetailDto extends FrameworkSummaryDto {
  summaryEn?: string;
  summaryAr?: string;
  domains: Record<string, unknown>[];
  obligations: Record<string, unknown>[];
  findings: Record<string, unknown>[];
}

export interface FrameworkComparisonDto {
  frameworkId: string;
  frameworkName: string;
  score: number;
  totalControls: number;
  implementedControls: number;
  controlsMapped: number;
  evidenceCoverage: number;
  obligationsCount?: number;
  openGaps?: number;
  maturityLevel?: string;
  maturityScore?: number;
}

// ═══ Domains ═══
export interface DomainSummaryDto {
  nodeId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  frameworkId: string;
  frameworkName: string;
  owner?: string;
  obligationsCount: number;
  controlsMapped: number;
  score: number;
  evidenceCoverage?: number;
  openGaps?: number;
  criticalGaps?: number;
  overdueActions?: number;
  maturityLevel?: string;
  maturityScore?: number;
}

export interface DomainDetailDto {
  domain: DomainSummaryDto;
  score: number;
  subdomains: Record<string, unknown>[];
  obligations: DomainObligationRow[];
  controls: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  findings: Record<string, unknown>[];
  remediationTasks: Record<string, unknown>[];
}

export interface DomainObligationRow {
  node_id: string;
  code: string;
  title_en: string;
  title_ar: string;
  priority: string;
  controlsMapped: number;
  controlsImplemented: number;
  covered: boolean;
}

// ═══ Obligations ═══
export interface ObligationRowDto {
  nodeId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  frameworkId: string;
  frameworkName: string;
  domainName?: string;
  domainNameAr?: string;
  owner?: string;
  priority: string;
  evidenceTypes?: string[];
  status: 'covered' | 'partially_covered' | 'uncovered' | 'under_review' | 'not_assessed';
  controlCoverage: number;
  controlsImplemented: number;
  evidenceCoverage: number;
  assessmentResult?: string;
  dueDate?: string;
}

export interface ObligationDetailDto {
  obligation: ObligationRowDto;
  controls: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  findings: Record<string, unknown>[];
  remediationTasks: Record<string, unknown>[];
}

// ═══ Gaps ═══
export interface GapsRegisterPageDto {
  items: ComplianceGapDto[];
  total: number;
}

export interface ComplianceGapDto {
  gapId: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'accepted' | 'in_progress' | 'awaiting_validation' | 'closed' | 'resolved';
  frameworkId?: string;
  frameworkName?: string;
  domainName?: string;
  obligationCode?: string;
  obligationTitle?: string;
  owner?: string;
  dueDate?: string;
  sourceType?: string;
  sourceId?: string;
  linkedControlId?: string;
  linkedEvidenceId?: string;
  linkedTaskId?: string;
  createdAt?: string;
  remediation?: Record<string, unknown>;
}

export interface GapDetailDto {
  gap: ComplianceGapDto & {
    obligationTitleAr?: string;
    obligationDescription?: string;
    cause?: string;
    impact?: string;
    remediationPlan?: string;
    targetDate?: string;
    validationEvidence?: string;
    approvalTrail?: Record<string, unknown>[];
  };
  linkedControls: Record<string, unknown>[];
  remediationTasks: Record<string, unknown>[];
}

// ═══ Roadmap ═══
export interface ComplianceRoadmapDto {
  roadmapId?: string;
  phases: RoadmapPhaseDto[];
  tasks: RoadmapTaskDto[];
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  currentWave?: string;
  nextMilestone?: string;
  targetReadinessDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoadmapPhaseDto {
  phaseType: string;
  title: string;
  titleAr?: string;
  objective?: string;
  startDate?: string;
  endDate?: string;
  completionPercent?: number;
  milestones?: RoadmapMilestoneDto[];
}

export interface RoadmapMilestoneDto {
  milestoneId: string;
  title: string;
  titleAr?: string;
  status: string;
  dueDate?: string;
  blocked?: boolean;
  dependencies?: string[];
  tasks?: RoadmapTaskDto[];
}

export interface RoadmapTaskDto {
  taskId: string;
  milestoneId: string;
  phaseType: string;
  titleEn: string;
  titleAr: string;
  targetModule?: string;
  targetAction?: string;
  priority: string;
  status: string;
  owner?: string;
  frameworkRef?: string;
  startDate?: string;
  endDate?: string;
}

export interface RoadmapForecastDto {
  expectedScore: number;
  expectedDomainReadiness: number;
  expectedAuditReadiness: number;
  keyBlockers: string[];
}

// ═══ Audit Package (control → test → evidence → result + manifest) ═══
export interface AuditPackageDto {
  generatedAt: string;
  tenantId: string;
  frameworkIds: string[];
  controlList: Array<{
    controlId: string;
    title: string;
    testProcedure: { testId: string; method: string; result: string };
    evidenceIds: string[];
    result: string;
  }>;
  evidenceManifest: Array<{
    evidenceId: string;
    controlId: string;
    type: string;
    hash?: string;
    collectedAt: string | null;
    validUntil: string | null;
  }>;
  traceabilityMatrix: Array<{
    controlId: string;
    testId: string;
    evidenceId: string;
    result: string;
  }>;
}

// ═══ Audit Readiness ═══
export interface AuditReadinessDto {
  totalControls: number;
  implemented: number;
  tested: number;
  withEvidence: number;
  fullyReady: number;
  readinessScore: number;
  implementedPct: number;
  testedPct: number;
  evidencePct: number;
  /** Evidence count by quality tier (A/B/C). Present when backend supports it. */
  evidenceCoverageByTier?: EvidenceCoverageByTier;
  /** Percentage of evidence within freshness window. */
  evidenceFreshnessScore?: number;
}

// ═══ Coverage Matrix ═══
export interface CoverageMatrixDto {
  frameworkId: string;
  totalObligations: number;
  covered: number;
  implemented: number;
  withEvidence: number;
  maturityLevel?: string;
  maturityScore?: number;
  matrix: CoverageMatrixRow[];
}

export interface CoverageMatrixRow {
  obligationId: string;
  obligationCode: string;
  obligationTitle: string;
  priority: string;
  hasControl: boolean;
  controlCount: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  controls: { controlId: string; title: string; status: string }[];
}

// ═══ Settings ═══
export interface ComplianceSettingsDto {
  overviewControlsLimit: number;
  overviewEvidenceLimit: number;
  overviewFindingsLimit: number;
  overviewRemediationLimit: number;
  overviewIncludeDomainHealth: boolean;
  cacheTtlSeconds: number;
  paginationDefaultPageSize: number;
  paginationMaxPageSize: number;
  gapsListLimit: number;
}

// ═══ Compliance Heat Map (Priority 18) ═══
export interface ComplianceHeatMapCell {
  businessUnitId: string | null;
  businessUnitName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  frameworkId: string;
  frameworkName: string;
  totalControls: number;
  implementedControls: number;
  effectiveControls: number;
  complianceScore: number;
  maturityLevel: 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimized';
  criticalGaps: number;
  openFindings: number;
}

export interface ComplianceHeatMapResult {
  groupBy: 'business_unit' | 'department';
  frameworks: Array<{
    frameworkId: string;
    frameworkName: string;
  }>;
  cells: ComplianceHeatMapCell[];
  summary: {
    totalBusinessUnits: number;
    totalDepartments: number;
    totalFrameworks: number;
    averageComplianceScore: number;
  };
}
