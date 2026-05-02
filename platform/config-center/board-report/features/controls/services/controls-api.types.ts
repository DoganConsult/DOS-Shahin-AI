/**
 * Controls Module API DTOs — AGRC-OS
 * Typed interfaces for controls-api.service.ts responses.
 */

// ── Pagination ────────────────────────────────────────────────────────
export interface PaginatedList<T> {
  items: T[];
  total: number;
}

// ── Mutation Result ───────────────────────────────────────────────────
export interface ControlMutationResult {
  success?: boolean;
  id?: string;
  message?: string;
}

// ── Control Row (list view) ──────────────────────────────────────────
export interface ControlRowDto {
  id: string;
  title?: string;
  status?: string;
  owner?: string;
  frameworkId?: string;
  controlCode?: string;
  description?: string;
  implementationStatus?: string;
  testResult?: string;
  evidenceCount?: number;
  riskCount?: number;
  automatable?: boolean;
  ownerTeamId?: string;
  ownerTeamName?: string;
  familyId?: string;
  familyName?: string;
  controlType?: string;
  automationLevel?: string;
  keyControl?: boolean;
  sharedControl?: boolean;
  criticality?: string;
  frequency?: string;
  nextTestDueAt?: string;
  lastTestedAt?: string;
  designEffective?: boolean;
  operatingEffective?: boolean;
  deficiencyCount?: number;
  mappedObligationCount?: number;
}

// ── Control Detail ───────────────────────────────────────────────────
export interface ControlDetailDto {
  id: string;
  controlCode?: string;
  title?: string;
  objective?: string;
  statement?: string;
  description?: string;
  status?: string;
  owner?: string;
  ownerUserId?: string;
  operatorUserId?: string;
  reviewerUserId?: string;
  ownerTeamId?: string;
  frameworkId?: string;
  familyId?: string;
  familyName?: string;
  categoryId?: string;
  controlType?: string;
  automationLevel?: string;
  keyControl?: boolean;
  sharedControl?: boolean;
  frequency?: string;
  criticality?: string;
  nextTestDueAt?: string;
  lastTestedAt?: string;
  designEffective?: boolean;
  operatingEffective?: boolean;
  // Aggregated counts
  mappedRiskCount?: number;
  mappedObligationCount?: number;
  mappedPolicyCount?: number;
  openDeficiencyCount?: number;
  evidenceSourceCount?: number;
  testCount?: number;
  // Monitoring
  monitoringStatus?: string;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ── Monitoring ───────────────────────────────────────────────────────
export interface ControlMonitoringItemDto {
  controlId?: string;
  title?: string;
  status?: string;
  slaStatus?: 'green' | 'amber' | 'red';
  evidenceExpiry?: string;
  lastTestedAt?: string;
}

export interface ControlMonitoringResponse {
  approachingSla: ControlMonitoringItemDto[];
  pastSla: ControlMonitoringItemDto[];
  expiringEvidence: ControlMonitoringItemDto[];
  items: ControlMonitoringItemDto[];
  counts: { approaching: number; past: number; expiring: number };
}

// ── Testing ──────────────────────────────────────────────────────────
export interface ControlTestDto {
  id?: string;
  control_id?: string;
  test_type?: string;
  result?: string;
  testedAt?: string;
  testedBy?: string;
  notes?: string;
  evidenceRef?: string;
}

export interface ControlFailureDto {
  id: string;
  controlId?: string;
  controlTitle?: string;
  failureType?: string;
  severity?: string;
  description?: string;
  detectedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface ControlActionDto {
  id: string;
  controlId?: string;
  title?: string;
  actionType?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
}

// ── Lifecycle ────────────────────────────────────────────────────────
export interface LifecycleSummaryDto {
  totalControls?: number;
  byState?: Record<string, number>;
  staleControls?: number;
}

export interface TransitionHistoryDto {
  fromState: string;
  toState: string;
  changedBy?: string;
  changedAt: string;
  note?: string;
}

export interface StalenessCheckDto {
  isStale: boolean;
  daysSinceLastUpdate?: number;
  lastUpdatedAt?: string;
}

// ── Dashboards ───────────────────────────────────────────────────────
export interface CcmDashboardDto {
  totalControls?: number;
  monitoredControls?: number;
  failedControls?: number;
  automationPct?: number;
  testPassRate?: number;
  soxControlCount?: number;
  staleControls?: number;
}

export interface TeamDistributionDto {
  teams?: Array<{ teamId: string; teamName: string; controlCount: number; completionPct?: number }>;
}

// ── Home KPIs ────────────────────────────────────────────────────────
export interface ControlsHomeDto {
  totalActive: number;
  keyControlCount: number;
  failedTestsThisPeriod: number;
  overdueTests: number;
  openDeficiencies: number;
  certificationsDue: number;
  automationMix: { manual: number; semiAutomated: number; automated: number };
  unmappedControlCount: number;
  healthTrend: Array<{ date: string; score: number }>;
  recentAlerts: Array<{ id: string; message: string; severity: string; createdAt: string }>;
}

// ── Work Queue ───────────────────────────────────────────────────────
export interface ControlWorkQueueDto {
  testsAssigned: Array<{ id: string; controlTitle: string; testType: string; dueDate: string }>;
  controlsAwaitingReview: Array<{ id: string; title: string; submittedAt: string }>;
  evidencePending: Array<{ id: string; controlTitle: string; evidenceType: string; dueDate: string }>;
  certificationsPending: Array<{ id: string; campaignName: string; controlTitle: string; deadline: string }>;
  deficienciesAwaitingAction: Array<{ id: string; controlTitle: string; severity: string; dueDate: string }>;
  monitoringAlerts: Array<{ id: string; controlTitle: string; alertType: string; severity: string; detectedAt: string }>;
}

// ── Mapping & Coverage ───────────────────────────────────────────────
export interface ControlCoverageDto {
  unmappedControls: number;
  unmappedObligations: number;
  weakCoverageRisks: number;
  duplicateControls: number;
  sharedControlUsage: number;
  mappingHealthScore: number;
  controlsWithNoRisks: Array<{ id: string; title: string }>;
  obligationsWithNoControls: Array<{ id: string; title: string }>;
  risksWithWeakCoverage: Array<{ id: string; title: string; coverageScore: number }>;
}

// ── Certifications ───────────────────────────────────────────────────
export interface CertificationCampaignDto {
  campaignId: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  completionPct: number;
  totalRequests: number;
  respondedRequests: number;
  overdueRequests: number;
  createdBy?: string;
}

export interface CertificationRequestDto {
  requestId: string;
  campaignId: string;
  controlId: string;
  controlTitle?: string;
  ownerId: string;
  ownerName?: string;
  status: string;
  requestedAt: string;
  respondedAt?: string;
  responseText?: string;
  evidenceRef?: string;
}

// ── Deficiencies ─────────────────────────────────────────────────────
export interface ControlDeficiencyDto {
  id: string;
  controlId: string;
  controlTitle?: string;
  severity: string;
  status: string;
  rootCause?: string;
  assignedTo?: string;
  dueDate?: string;
  createdAt?: string;
  closedAt?: string;
}

export interface RemediationActionDto {
  actionId: string;
  deficiencyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  status: string;
  evidenceRef?: string;
}

// ── Monitoring Rules ─────────────────────────────────────────────────
export interface MonitoringRuleDto {
  ruleId: string;
  controlId: string;
  ruleName: string;
  signalSource?: string;
  metric?: string;
  operator?: string;
  threshold?: number;
  severity: string;
  autoCreateIssue: boolean;
  active: boolean;
}

export interface MonitoringAlertDto {
  alertId: string;
  controlId: string;
  controlTitle?: string;
  severity: string;
  status: string;
  detectedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  linkedIssueId?: string;
}

// ── Request DTOs ─────────────────────────────────────────────────────
export interface CreateControlRequest {
  title: string;
  description?: string;
  objective?: string;
  statement?: string;
  frameworkId?: string;
  familyId?: string;
  controlType?: string;
  automationLevel?: string;
  keyControl?: boolean;
  frequency?: string;
  owner?: string;
  operatorUserId?: string;
  reviewerUserId?: string;
  status?: string;
}

export interface UpdateControlRequest {
  title?: string;
  description?: string;
  objective?: string;
  statement?: string;
  owner?: string;
  operatorUserId?: string;
  reviewerUserId?: string;
  status?: string;
  controlType?: string;
  automationLevel?: string;
  keyControl?: boolean;
  frequency?: string;
}

export interface CreateControlTestRequest {
  control_id: string;
  test_type?: string;
  result?: string;
  notes?: string;
  evidenceRef?: string;
}

export interface TransitionControlStateRequest {
  toState: string;
  note?: string;
}

export interface ResolveFailureRequest {
  resolution_note: string;
}

export interface BulkAssignControlTeamRequest {
  controlIds: string[];
  teamId: string;
}

export interface CreateCertificationCampaignRequest {
  name: string;
  description?: string;
  controlIds: string[];
  startDate: string;
  endDate: string;
}

export interface SubmitCertificationResponseRequest {
  response: 'attested' | 'exception' | 'remediation_needed';
  comments?: string;
  evidenceRef?: string;
}

export interface CreateDeficiencyRequest {
  controlId: string;
  severity: string;
  description: string;
  rootCause?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface CreateRemediationActionRequest {
  deficiencyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface CreateMonitoringRuleRequest {
  controlId: string;
  ruleName: string;
  signalSource?: string;
  metric?: string;
  operator?: string;
  threshold?: number;
  severity: string;
  autoCreateIssue?: boolean;
}
