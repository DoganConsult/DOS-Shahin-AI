/**
 * @dos/types — privacy, data protection, and consent management types
 * Covers GDPR/PDPL, DSARs, consent, data mapping, privacy impact
 */

// ── Data Subject Request (DSAR) Types ─────────────────────────────────────

export type DSARType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'
  | 'opt_out'
  | 'automated_decision'
  | 'complaint';

export type DSARStatus =
  | 'received'
  | 'identity_verification'
  | 'assessment'
  | 'fulfillment'
  | 'pending_approval'
  | 'completed'
  | 'rejected'
  | 'withdrawn'
  | 'extended'
  | 'overdue';

export interface DataSubjectRequest {
  dsarId: string;
  tenantId: string;
  type: DSARType;
  status: DSARStatus;
  subjectEmail?: string;
  subjectName?: string;
  subjectId?: string;
  subjectType?: 'customer' | 'employee' | 'prospect' | 'other';
  receivedAt: string;
  regulatoryDeadline: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  extendedAt?: string;
  newDeadline?: string;
  extensionReason?: string;
  assignedTo?: string;
  reviewedBy?: string;
  identityVerified?: boolean;
  identityVerifiedAt?: string;
  identityVerificationMethod?: string;
  legalBasis?: string;
  legalBasisJustification?: string;
  dataCategories?: string[];
  systemsInScope?: string[];
  responseFileId?: string;
  communicationLog?: DSARCommunication[];
  notes?: string;
  channel?: 'email' | 'portal' | 'postal' | 'phone' | 'regulator';
  correlationId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DSARCommunication {
  commId: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'portal' | 'postal' | 'phone';
  subject?: string;
  body?: string;
  sentBy?: string;
  sentAt: string;
  fileIds?: string[];
}

// ── Consent Types ──────────────────────────────────────────────────────────

export type ConsentStatus = 'granted' | 'denied' | 'withdrawn' | 'expired' | 'pending';
export type ConsentPurpose =
  | 'marketing'
  | 'analytics'
  | 'personalization'
  | 'functional'
  | 'security'
  | 'research'
  | 'third_party_sharing'
  | 'profiling'
  | 'custom';
export type ConsentMethod = 'explicit' | 'opt_in' | 'opt_out' | 'implied' | 'verbal' | 'written';

export interface ConsentRecord {
  consentId: string;
  tenantId: string;
  subjectId?: string;
  subjectEmail?: string;
  purpose: ConsentPurpose;
  purposeCode?: string;
  status: ConsentStatus;
  method: ConsentMethod;
  grantedAt?: string;
  withdrawnAt?: string;
  expiresAt?: string;
  version: number;
  privacyPolicyVersion?: string;
  ipAddress?: string;
  userAgent?: string;
  proofText?: string;
  proofFileId?: string;
  channel?: string;
  campaignId?: string;
  dataCategories?: string[];
  processingActivities?: string[];
  isLawfulBasis: boolean;
  lawfulBasis?: string;
  jurisdiction?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentPolicyVersion {
  policyVersionId: string;
  tenantId: string;
  purpose: ConsentPurpose;
  version: string;
  language: string;
  content: string;
  contentAr?: string;
  effectiveDate: string;
  retiredDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ── Data Mapping / ROPA Types ─────────────────────────────────────────────

export type DataMappingStatus = 'draft' | 'review' | 'approved' | 'archived';
export type ProcessingActivity = 'collection' | 'storage' | 'use' | 'disclosure' | 'sharing' | 'transfer' | 'deletion';
export type DataTransferMechanism = 'adequacy_decision' | 'scc' | 'bcr' | 'derogation' | 'consent';

export interface DataFlowRecord {
  recordId: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  description?: string;
  status: DataMappingStatus;
  ownerId?: string;
  systemName?: string;
  processingActivities?: ProcessingActivity[];
  purposeOfProcessing?: string;
  legalBasis?: string;
  dataSubjectTypes?: string[];
  dataCategories?: PersonalDataCategory[];
  retentionPeriod?: RetentionPolicy;
  internalRecipients?: string[];
  externalRecipients?: DataRecipient[];
  thirdCountryTransfers?: DataTransfer[];
  automatedDecision?: boolean;
  profilingDescription?: string;
  dpiaRequired?: boolean;
  dpiaId?: string;
  securityMeasures?: string[];
  notes?: string;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalDataCategory {
  categoryId: string;
  name: string;
  isSensitive?: boolean;
  examples?: string[];
  retentionDays?: number;
}

export interface DataRecipient {
  recipientId?: string;
  name: string;
  type: 'processor' | 'joint_controller' | 'third_party' | 'public_authority';
  countryCode?: string;
  transferMechanism?: DataTransferMechanism;
  contractId?: string;
}

export interface DataTransfer {
  transferId?: string;
  destinationCountry: string;
  mechanism: DataTransferMechanism;
  safeguards?: string;
  vendorId?: string;
  notedRisks?: string;
}

export interface RetentionPolicy {
  period: number;
  unit: 'days' | 'months' | 'years';
  triggerEvent?: string;
  deletionMethod?: 'automatic' | 'manual' | 'archive';
  legalBasis?: string;
}

// ── Privacy Impact Assessment Types ───────────────────────────────────────

export type DPIAStatus = 'not_required' | 'required' | 'in_progress' | 'completed' | 'approved';

export interface DPIA {
  dpiaId: string;
  tenantId: string;
  dataFlowRecordId?: string;
  title: string;
  description?: string;
  status: DPIAStatus;
  trigger?: string;
  systemName?: string;
  processingPurpose?: string;
  necessityAssessment?: string;
  proportionalityAssessment?: string;
  risksIdentified?: DPIARisk[];
  mitigations?: DPIAMitigation[];
  consultationRequired?: boolean;
  dpoConsultation?: string;
  dpoRecommendation?: string;
  supervisoryAuthorityConsulted?: boolean;
  outcome?: 'proceed' | 'proceed_with_measures' | 'do_not_proceed';
  outcomeSummary?: string;
  ownerId?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DPIARisk {
  riskId: string;
  description: string;
  likelihood: 'high' | 'medium' | 'low';
  severity: 'high' | 'medium' | 'low';
  overallRisk: 'high' | 'medium' | 'low';
  dataSubjectImpact?: string;
  mitigationRequired: boolean;
}

export interface DPIAMitigation {
  mitigationId: string;
  riskId: string;
  measure: string;
  implementation?: string;
  residualRisk?: 'high' | 'medium' | 'low';
  responsible?: string;
  dueDate?: string;
  implemented?: boolean;
}

// ── Privacy Breach Types ──────────────────────────────────────────────────

export type BreachSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BreachStatus = 'detected' | 'assessing' | 'notified' | 'closed';
export type BreachType = 'confidentiality' | 'integrity' | 'availability';

export interface DataBreach {
  breachId: string;
  tenantId: string;
  incidentId?: string;
  title: string;
  description?: string;
  type?: BreachType[];
  severity: BreachSeverity;
  status: BreachStatus;
  detectedAt: string;
  containedAt?: string;
  closedAt?: string;
  dataCategories?: string[];
  dataSubjectTypes?: string[];
  estimatedAffected?: number;
  confirmedAffected?: number;
  crossBorder?: boolean;
  countries?: string[];
  notificationRequired?: boolean;
  notifyAuthority?: boolean;
  authorityNotifiedAt?: string;
  notifySubjects?: boolean;
  subjectsNotifiedAt?: string;
  notificationWaived?: boolean;
  waiverJustification?: string;
  rootCause?: string;
  remediationActions?: string[];
  lessonsLearned?: string;
  reportedBy: string;
  assignedTo?: string;
  dpoReviewedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Privacy Dashboard Stats ────────────────────────────────────────────────

export interface PrivacyDashboard {
  tenantId: string;
  openDSARs: number;
  overdueDSARs: number;
  openBreaches: number;
  pendingDPIAs: number;
  consentRate?: number;
  processedDSARs30d?: number;
  dataFlowRecords: number;
  dataFlowRecordsNeedingReview: number;
  lastUpdatedAt: string;
}


// ── Module CRUD Types (migrated from backend module) ────────────────────────

export interface DataSubjectRow {
  dsr_id: string;
  tenant_id: string;
  subject_name: string;
  subject_email: string;
  request_type: string;
  description?: string;
  national_id_hash?: string;
  urgency: string;
  regulation: string;
  source_channel: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  deleted_at?: string | null;
}

export interface DsrCreateInput {
  tenant_id: string;
  subject_name: string;
  subject_email: string;
  request_type: string;
  description?: string;
  national_id_hash?: string;
  urgency: string;
  regulation: string;
  source_channel: string;
  created_by: string;
}

export interface DsrUpdateInput {
  subject_name?: string;
  subject_email?: string;
  request_type?: string;
  description?: string;
  urgency?: string;
  status?: string;
  updated_by: string;
}

export interface DsrListFilter {
  request_type?: string;
  regulation?: string;
  urgency?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface DsrListResult {
  rows: DataSubjectRequest[];
  total: number;
}

export type PrivacyStatus = 'draft' | 'submitted' | 'in_progress' | 'pending_review' | 'completed' | 'closed' | 'archived';

export const PRIVACY_STATUSES: readonly PrivacyStatus[] = ['draft', 'submitted', 'in_progress', 'pending_review', 'completed', 'closed', 'archived'] as const;

export type PrivacySource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';

export const PRIVACY_SOURCES: readonly PrivacySource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type PrivacyStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface PrivacyEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'privacy';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: PrivacyStatus;
  newState?: PrivacyStatus;
  data: Record<string, unknown>;
}
