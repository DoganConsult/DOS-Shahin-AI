/**
 * @dos/types — ISMS (Information Security Management System) types
 * Covers ISO 27001, security objectives, ISMS scope, SOA, security metrics
 */

// ── ISMS Scope & Context ───────────────────────────────────────────────────

export type ISMSScopeStatus = 'draft' | 'approved' | 'under_review' | 'archived';

export interface ISMSScope {
  scopeId: string;
  tenantId: string;
  workspaceId?: string;
  version: string;
  status: ISMSScopeStatus;
  organizationContext?: string;
  interests?: StakeholderInterest[];
  boundaries?: string;
  inclusions?: string[];
  exclusions?: string[];
  interfaces?: string[];
  services?: string[];
  locations?: string[];
  technologies?: string[];
  keyProcesses?: string[];
  approvedBy?: string;
  approvedAt?: string;
  reviewDate?: string;
  fileId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StakeholderInterest {
  stakeholderId: string;
  name: string;
  type: 'internal' | 'external';
  interests?: string[];
  requirements?: string[];
  influence?: 'high' | 'medium' | 'low';
}

// ── Statement of Applicability (SOA) ─────────────────────────────────────

export type SoAControlStatus = 'included' | 'excluded_justified';
export type SoAImplementationStatus =
  | 'not_started'
  | 'planned'
  | 'in_progress'
  | 'implemented'
  | 'partially_implemented'
  | 'not_applicable';

export interface StatementOfApplicability {
  soaId: string;
  tenantId: string;
  workspaceId?: string;
  scopeId?: string;
  frameworkId?: string;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
  entries?: SoAEntry[];
  approvedBy?: string;
  approvedAt?: string;
  reviewDate?: string;
  fileId?: string;
  completionPercent?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SoAEntry {
  entryId: string;
  soaId: string;
  controlId: string;
  controlRef: string;
  controlName: string;
  annex?: string;
  status: SoAControlStatus;
  implementationStatus?: SoAImplementationStatus;
  inclusionJustifications?: string[];
  exclusionJustification?: string;
  riskBasedJustification?: string;
  legalRequirement?: string;
  contractualRequirement?: string;
  implementationDetails?: string;
  ownerId?: string;
  evidenceIds?: string[];
  lastReviewedAt?: string;
}

// ── Security Objective Types ──────────────────────────────────────────────

export type SecurityObjectiveStatus = 'draft' | 'active' | 'achieved' | 'missed' | 'cancelled';

export interface SecurityObjective {
  objectiveId: string;
  tenantId: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: SecurityObjectiveStatus;
  pillar?: 'confidentiality' | 'integrity' | 'availability' | 'non_repudiation' | 'other';
  ownerId?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  kpis?: SecurityKPI[];
  linkedControlIds?: string[];
  linkedRiskIds?: string[];
  linkedProjectIds?: string[];
  progressPercent?: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityKPI {
  kpiId: string;
  name: string;
  description?: string;
  unit?: string;
  target?: number;
  current?: number;
  status?: 'on_track' | 'at_risk' | 'off_track';
  frequency?: 'monthly' | 'quarterly' | 'annually';
  ownerId?: string;
  dataSource?: string;
  lastMeasuredAt?: string;
}

// ── Security Control Assessment (SCR) Types ───────────────────────────────

export type SCRStatus = 'not_started' | 'in_progress' | 'completed' | 'deferred';
export type SCRResult = 'effective' | 'partially_effective' | 'ineffective' | 'not_applicable';

export interface SecurityControlReview {
  reviewId: string;
  tenantId: string;
  workspaceId?: string;
  controlId: string;
  reviewType: 'self_assessment' | 'management_review' | 'internal_audit' | 'third_party';
  status: SCRStatus;
  reviewer?: string;
  reviewDate?: string;
  completedAt?: string;
  result?: SCRResult;
  score?: number;
  observations?: string;
  gaps?: string;
  recommendations?: string;
  evidenceIds?: string[];
  remediationTaskIds?: string[];
  nextReviewDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Security Procedure & Policy Linkage ──────────────────────────────────

export interface SecurityProcedure {
  procedureId: string;
  tenantId: string;
  code: string;
  title: string;
  titleAr?: string;
  description?: string;
  status: 'draft' | 'approved' | 'retired';
  version: string;
  controlIds?: string[];
  policyDocIds?: string[];
  targetAudience?: string[];
  steps?: SecurityProcedureStep[];
  reviewFrequency?: 'annual' | 'biannual' | 'quarterly';
  ownerId?: string;
  approvedBy?: string;
  approvedAt?: string;
  effectiveDate?: string;
  expiryDate?: string;
  fileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityProcedureStep {
  stepId: string;
  order: number;
  action: string;
  responsible?: string;
  frequency?: string;
  tools?: string[];
  notes?: string;
  checkpointEvidenceRequired?: boolean;
}

// ── Threat Intelligence Integration ──────────────────────────────────────

export interface ThreatIntelReport {
  reportId: string;
  tenantId?: string;
  title: string;
  source: string;
  type: 'strategic' | 'tactical' | 'operational' | 'technical';
  threatActors?: string[];
  targetSectors?: string[];
  targetRegions?: string[];
  tlpLevel?: 'white' | 'green' | 'amber' | 'red';
  summary?: string;
  indicators?: string[];
  mitreTTPs?: string[];
  recommendations?: string[];
  publishedAt: string;
  validUntil?: string;
  fileId?: string;
  externalRef?: string;
  tags?: string[];
  createdAt: string;
}

// ── Penetration Testing Types ──────────────────────────────────────────────

export type PenTestStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type PenTestType = 'external' | 'internal' | 'webapp' | 'mobile' | 'social_engineering' | 'wireless' | 'red_team' | 'purple_team';

export interface PenTest {
  testId: string;
  tenantId: string;
  name: string;
  type: PenTestType;
  status: PenTestStatus;
  provider?: string;
  scope?: string;
  objectives?: string[];
  rules?: string;
  plannedDate?: string;
  startedAt?: string;
  completedAt?: string;
  methodology?: string;
  testers?: string[];
  findings?: PenTestFinding[];
  reportId?: string;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  informationalCount?: number;
  remediationDeadline?: string;
  retestRequired?: boolean;
  retestDate?: string;
  certifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PenTestFinding {
  findingId: string;
  testId: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: 'open' | 'in_remediation' | 'remediated' | 'accepted' | 'false_positive';
  cveId?: string;
  cvssScore?: number;
  affectedComponents?: string[];
  proofOfConcept?: string;
  recommendation?: string;
  vendorPatch?: boolean;
  remediationTaskId?: string;
  resolvedAt?: string;
  retestResult?: 'pass' | 'fail' | 'not_tested';
}

// ── Security Incident Metrics ─────────────────────────────────────────────

export interface ISMSMetricsDashboard {
  tenantId: string;
  workspaceId?: string;
  period: string;
  overallMaturityLevel?: number;
  soaCompletionPercent?: number;
  controlTestingCoverage?: number;
  openRisks?: number;
  openIncidents?: number;
  openAuditFindings?: number;
  objectivesAchievedPercent?: number;
  overdueReviews?: number;
  cyberMetrics?: CyberMetrics;
  lastCalculatedAt: string;
}

export interface CyberMetrics {
  mttd?: number;
  mttr?: number;
  mtta?: number;
  patching?: { critical: number; high: number; medium: number };
  vulnerabilitiesByRisk?: { critical: number; high: number; medium: number; low: number };
  phishingClickRate?: number;
  mfaAdoption?: number;
  privilegedAccessPercent?: number;
  endpointCompliancePercent?: number;
}
