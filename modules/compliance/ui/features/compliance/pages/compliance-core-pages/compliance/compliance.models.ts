/**
 * Compliance Workspace Models — AGRC-OS
 */

// ═══ Overview ═══
export interface ComplianceSummary {
  overallScore: number;
  activeFrameworks: number;
  openGaps: number;
  criticalGaps: number;
  obligationsCovered: number;
  controlsMapped: number;
  evidenceCoverage: number;
  auditReadiness: number;
  overdueActions: number;
}

export interface ComplianceOverviewDto {
  summary: ComplianceSummary;
  frameworks: FrameworkSummaryDto[];
  domains: DomainSummaryDto[];
  priorityIssues: ComplianceIssueDto[];
  trends: ComplianceTrendDto[];
  recentAssessments: Record<string, any>[];
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
  score: number;
  totalControls: number;
  implementedControls: number;
  controlsMapped: number;
  evidenceCoverage: number;
  openGaps?: number;
  targetDate?: string;
  createdAt?: string;
}

export interface FrameworkDetailDto extends FrameworkSummaryDto {
  summaryEn?: string;
  summaryAr?: string;
  domainsCount: number;
  obligationsCount: number;
  openGaps: number;
  domains: Record<string, any>[];
  obligations: Record<string, any>[];
  findings: Record<string, any>[];
}

export interface FrameworkComparisonDto {
  frameworkId: string;
  frameworkName: string;
  score: number;
  totalControls: number;
  implementedControls: number;
  controlsMapped: number;
  evidenceCoverage: number;
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
  obligationsCount: number;
  controlsMapped: number;
  score: number;
  evidenceCoverage?: number;
  openGaps?: number;
  criticalGaps?: number;
  overdueActions?: number;
}

export interface DomainObligation {
  node_id: string;
  parent_node_id: string;
  code: string;
  title_en: string;
  title_ar: string;
  priority: string;
  evidence_types?: string[];
  description_en?: string;
  description_ar?: string;
  controlsMapped: number;
  controlsImplemented: number;
  covered: boolean;
}

export interface DomainDetailDto {
  domain: DomainSummaryDto;
  score: number;
  subdomains: Record<string, any>[];
  obligations: DomainObligation[];
  controls: Record<string, any>[];
  evidence: Record<string, any>[];
  findings: Record<string, any>[];
  remediationTasks: Record<string, any>[];
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
  priority: string;
  evidenceTypes?: string[];
  status: string; // covered | partially_covered | uncovered | not_assessed
  controlCoverage: number;
  controlsImplemented: number;
  evidenceCoverage: number;
}

export interface ObligationDetailDto {
  obligation: ObligationRowDto & { evidenceTypes?: string[] };
  controls: Record<string, any>[];
  evidence: Record<string, any>[];
  findings: Record<string, any>[];
  remediationTasks: Record<string, any>[];
}

// ═══ Gaps ═══
export interface ComplianceGapDto {
  gapId: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  frameworkId?: string;
  frameworkName?: string;
  domainName?: string;
  obligationCode?: string;
  obligationTitle?: string;
  sourceType?: string;
  sourceId?: string;
  createdAt?: string;
  remediation?: Record<string, any>;
}

export interface GapDetailDto {
  gap: ComplianceGapDto & {
    obligationTitleAr?: string;
    obligationDescription?: string;
  };
  linkedControls: Record<string, any>[];
  remediationTasks: Record<string, any>[];
}

// ═══ Roadmap ═══
export interface ComplianceRoadmapDto {
  roadmapId?: string;
  phases: Record<string, any>[];
  tasks: RoadmapTaskDto[];
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  createdAt?: string;
  updatedAt?: string;
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
  frameworkRef?: string;
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
}

// ═══ Coverage Matrix ═══
export interface CoverageMatrixDto {
  frameworkId: string;
  totalObligations: number;
  covered: number;
  implemented: number;
  withEvidence: number;
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
  autoAssessment: boolean;
  defaultFramework?: string;
  scoringMethod: string;
  reviewCadence: string;
}
