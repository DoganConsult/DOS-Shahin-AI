/**
 * @dos/types — change management and configuration types
 * Covers change requests, change advisory board, ITIL, config management
 */

// ── Change Request Types ───────────────────────────────────────────────────

export type ChangeType = 'standard' | 'normal' | 'emergency' | 'service_request';
export type ChangePriority = 'critical' | 'high' | 'medium' | 'low';
export type ChangeStatus =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'cab_pending'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rejected'
  | 'post_implementation_review';

export type ChangeCategory =
  | 'infrastructure'
  | 'application'
  | 'security'
  | 'network'
  | 'database'
  | 'cloud'
  | 'client_device'
  | 'vendor_product'
  | 'business_process'
  | 'organizational'
  | 'other';

export interface ChangeRequest {
  crId: string;
  tenantId: string;
  workspaceId?: string;
  number?: string;
  type: ChangeType;
  category: ChangeCategory;
  priority: ChangePriority;
  status: ChangeStatus;
  title: string;
  description?: string;
  justification?: string;
  businessBenefit?: string;
  technicalDescription?: string;
  rollbackPlan?: string;
  testPlan?: string;
  implementationPlan?: ChangeImplementationStep[];
  requestedBy: string;
  ownerId?: string;
  implementors?: string[];
  cabReviewers?: string[];
  affectedServices?: string[];
  affectedAssetIds?: string[];
  affectedEnvironments?: string[];
  relatedIncidents?: string[];
  relatedProblems?: string[];
  risk?: ChangeRiskAssessment;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  maintenanceWindowId?: string;
  cabMeetingId?: string;
  approvalHistory?: ChangeApproval[];
  pir?: PostImplementationReview;
  attachments?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeImplementationStep {
  stepId: string;
  order: number;
  action: string;
  responsible?: string;
  estimatedDuration?: number;
  verificationStep?: string;
  rollbackAction?: string;
  completed?: boolean;
  completedAt?: string;
}

export interface ChangeRiskAssessment {
  level: 'low' | 'medium' | 'high';
  likelihood?: 'low' | 'medium' | 'high';
  impact?: 'low' | 'medium' | 'high';
  serviceImpact?: string;
  securityImpact?: string;
  complianceImpact?: string;
  notes?: string;
  assessedBy?: string;
  assessedAt?: string;
}

export interface ChangeApproval {
  approvalId: string;
  stage: string;
  approver: string;
  decision: 'approved' | 'rejected' | 'conditional' | 'deferred';
  conditions?: string;
  decidedAt?: string;
  comments?: string;
}

export interface PostImplementationReview {
  pirId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  outcome?: 'successful' | 'partially_successful' | 'unsuccessful' | 'cancelled';
  actualImpact?: string;
  deviations?: string;
  lessonsLearned?: string;
  kpisAchieved?: boolean;
  followUpRequired?: boolean;
  followUpActions?: string[];
}

// ── CAB (Change Advisory Board) Types ─────────────────────────────────────

export interface CABMeeting {
  meetingId: string;
  tenantId: string;
  title?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  participants?: string[];
  chairperson?: string;
  changesReviewed?: string[];
  agenda?: string;
  minutesFileId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Configuration Item (CI) Types ─────────────────────────────────────────

export type CIType = 'hardware' | 'software' | 'service' | 'document' | 'process' | 'entity';
export type CIStatus = 'live' | 'staging' | 'development' | 'retired' | 'obsolete';

export interface ConfigurationItem {
  ciId: string;
  tenantId: string;
  assetId?: string;
  name: string;
  type: CIType;
  subtype?: string;
  status: CIStatus;
  version?: string;
  description?: string;
  ownerId?: string;
  custodianId?: string;
  environment?: string;
  location?: string;
  attributes?: Record<string, unknown>;
  baseline?: CIBaseline;
  relationships?: CIRelationship[];
  changesApplied?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CIBaseline {
  baselineId?: string;
  name: string;
  version: string;
  capturedAt: string;
  capturedBy?: string;
  snapshot?: Record<string, unknown>;
}

export interface CIRelationship {
  relId: string;
  type: 'depends_on' | 'used_by' | 'connects_to' | 'hosts' | 'runs_on';
  targetCIId: string;
  direction: 'upstream' | 'downstream' | 'peer';
}

// ── Problem Management Types ──────────────────────────────────────────────

export type ProblemStatus = 'open' | 'root_cause_analysis' | 'known_error' | 'workaround_applied' | 'resolved' | 'closed';

export interface Problem {
  problemId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: ProblemStatus;
  priority: ChangePriority;
  category?: ChangeCategory;
  rootCause?: string;
  workaround?: string;
  resolution?: string;
  affectedServices?: string[];
  affectedCIIds?: string[];
  relatedIncidentIds?: string[];
  changeIds?: string[];
  ownerId?: string;
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Service Management Types ──────────────────────────────────────────────

export type ServiceTier = 'platinum' | 'gold' | 'silver' | 'bronze';
export type ServiceStatus = 'active' | 'planned' | 'retired' | 'suspended';

export interface ManagedService {
  serviceId: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  description?: string;
  tier: ServiceTier;
  status: ServiceStatus;
  category?: string;
  ownerId?: string;
  supportTeamId?: string;
  slaPolicy?: string;
  availability?: number;
  rto?: number;
  rpo?: number;
  relatedCIIds?: string[];
  documentation?: string[];
  onCallSchedule?: OnCallSchedule;
  rationale?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnCallSchedule {
  scheduleId?: string;
  rotation?: string;
  contacts?: string[];
  escalation?: string[];
  timezone?: string;
}

// ── Change Metrics ─────────────────────────────────────────────────────────

export interface ChangeManagementDashboard {
  tenantId: string;
  period?: string;
  totalChanges: number;
  openChanges: number;
  pendingCAB: number;
  scheduledChanges: number;
  emergencyChanges: number;
  failedChanges: number;
  successRate: number;
  changesByType: Record<ChangeType, number>;
  changesByCategory: Record<ChangeCategory, number>;
  avgLeadTimeDays?: number;
  openProblems?: number;
  lastUpdatedAt: string;
}
