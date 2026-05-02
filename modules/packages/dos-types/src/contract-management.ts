/**
 * @dos/types — contract lifecycle management types
 * Covers contract creation, negotiation, obligations, renewals, e-signatures, CLM analytics
 */

// ── Contract Classification Types ─────────────────────────────────────

export type ContractType =
  | 'nda'
  | 'msa'
  | 'sla'
  | 'sow'
  | 'purchase_order'
  | 'employment'
  | 'lease'
  | 'license'
  | 'partnership'
  | 'service_agreement'
  | 'data_processing'
  | 'regulatory'
  | 'insurance'
  | 'custom';

export type ContractStatus =
  | 'draft'
  | 'in_review'
  | 'negotiation'
  | 'pending_signature'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'
  | 'cancelled'
  | 'archived';

export type ContractRiskLevel = 'critical' | 'high' | 'medium' | 'low';

// ── Contract Core Types ───────────────────────────────────────────────

export interface Contract {
  contractId: string;
  tenantId: string;
  title: string;
  contractNumber?: string;
  type: ContractType;
  status: ContractStatus;
  description?: string;
  partyA?: ContractParty;
  partyB?: ContractParty;
  additionalParties?: ContractParty[];
  ownerId?: string;
  legalOwnerId?: string;
  signatoryId?: string;
  effectiveDate?: string;
  expiryDate?: string;
  signedDate?: string;
  terminationDate?: string;
  noticePeriodDays?: number;
  autoRenewal?: boolean;
  renewalTermMonths?: number;
  contractValue?: number;
  currency?: string;
  paymentTerms?: string;
  jurisdiction?: string;
  governingLaw?: string;
  riskLevel?: ContractRiskLevel;
  confidentiality?: 'public' | 'internal' | 'confidential' | 'strictly_confidential';
  linkedVendorId?: string;
  linkedProjectId?: string;
  parentContractId?: string;
  amendments?: ContractAmendment[];
  documentIds?: string[];
  obligationIds?: string[];
  clauseLibraryRef?: string[];
  tags?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContractParty {
  partyId?: string;
  name: string;
  type?: 'internal' | 'external' | 'government' | 'individual';
  role?: string;
  contactName?: string;
  contactEmail?: string;
  address?: string;
  countryCode?: string;
  registrationNumber?: string;
  vatNumber?: string;
}

export interface ContractAmendment {
  amendmentId: string;
  contractId?: string;
  title?: string;
  description?: string;
  effectiveDate?: string;
  signedDate?: string;
  documentId?: string;
  changedClauses?: string[];
  signedBy?: string;
  createdAt?: string;
}

// ── Contract Clause Types ─────────────────────────────────────────────

export type ClauseType =
  | 'payment'
  | 'liability'
  | 'indemnification'
  | 'termination'
  | 'intellectual_property'
  | 'confidentiality'
  | 'data_protection'
  | 'warranty'
  | 'dispute_resolution'
  | 'force_majeure'
  | 'sla_clause'
  | 'non_compete'
  | 'governing_law'
  | 'custom';

export interface ContractClause {
  clauseId: string;
  tenantId?: string;
  contractId?: string;
  type: ClauseType;
  title?: string;
  text?: string;
  isStandard?: boolean;
  isDeviating?: boolean;
  riskFlag?: boolean;
  riskNote?: string;
  negotiatedVersion?: string;
  approvedBy?: string;
  approved?: boolean;
  lineNumber?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ── Contract Obligation Types ─────────────────────────────────────────

export type ObligationType =
  | 'payment'
  | 'reporting'
  | 'compliance'
  | 'notification'
  | 'performance'
  | 'audit_right'
  | 'insurance'
  | 'regulatory'
  | 'custom';

export type ObligationStatus = 'upcoming' | 'pending' | 'in_progress' | 'met' | 'overdue' | 'breached' | 'waived';
export type ObligationFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';

export interface ContractObligation {
  obligationId: string;
  tenantId: string;
  contractId?: string;
  title: string;
  type?: ObligationType;
  status?: ObligationStatus;
  description?: string;
  responsibleParty?: 'party_a' | 'party_b' | 'both';
  ownerId?: string;
  frequency?: ObligationFrequency;
  dueDate?: string;
  nextDueDate?: string;
  completedAt?: string;
  evidenceRequired?: boolean;
  evidenceIds?: string[];
  reminderDaysBefore?: number;
  penaltyClause?: string;
  penaltyAmount?: number;
  currency?: string;
  isRecurring?: boolean;
  lastCompletedAt?: string;
  completionNote?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── E-Signature Types ─────────────────────────────────────────────────

export type SignatureStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'cancelled';
export type SignatureProvider = 'docusign' | 'adobe_sign' | 'hellosign' | 'internal' | 'wet_signature' | 'other';

export interface SignatureRequest {
  signatureRequestId: string;
  tenantId: string;
  contractId?: string;
  documentId?: string;
  subject?: string;
  message?: string;
  provider?: SignatureProvider;
  providerRef?: string;
  status?: SignatureStatus;
  initiatedBy?: string;
  initiatedAt?: string;
  expiresAt?: string;
  completedAt?: string;
  signers?: SignatureSigner[];
  auditTrail?: SignatureAuditEvent[];
  downloadUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureSigner {
  signerId?: string;
  name?: string;
  email?: string;
  role?: string;
  order?: number;
  status?: SignatureStatus;
  signedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  geoLocation?: string;
  authMethod?: 'email' | 'sms' | 'id_check' | 'knowledge_based';
  declineReason?: string;
}

export interface SignatureAuditEvent {
  eventId?: string;
  eventType?: string;
  performedBy?: string;
  ipAddress?: string;
  occurredAt: string;
  details?: string;
}

// ── Contract Negotiation Types ─────────────────────────────────────────

export type NegotiationStatus = 'open' | 'counter_proposed' | 'agreed' | 'deadlocked' | 'withdrawn';

export interface ContractNegotiationRound {
  roundId: string;
  contractId?: string;
  tenantId?: string;
  roundNumber?: number;
  status?: NegotiationStatus;
  initiatedBy?: string;
  initiatedAt?: string;
  proposedChanges?: ClauseProposal[];
  responseBy?: string;
  respondedAt?: string;
  agreed?: boolean;
  disagreedClauses?: string[];
  notes?: string;
  closedAt?: string;
}

export interface ClauseProposal {
  proposalId?: string;
  clauseId?: string;
  clauseType?: ClauseType;
  proposedText?: string;
  justification?: string;
  riskImpact?: 'increase' | 'decrease' | 'neutral';
  accepted?: boolean;
  counterText?: string;
}

// ── Contract Renewal Types ──────────────────────────────────────────

export type RenewalDecision = 'renew' | 'renegotiate' | 'terminate' | 'pending';

export interface ContractRenewal {
  renewalId: string;
  contractId?: string;
  tenantId?: string;
  dueDate?: string;
  status?: 'upcoming' | 'in_review' | 'decided' | 'completed';
  noticeDueDate?: string;
  noticeSentAt?: string;
  decision?: RenewalDecision;
  decisionBy?: string;
  decisionAt?: string;
  newExpiryDate?: string;
  renewalValue?: number;
  currency?: string;
  renewalTermMonths?: number;
  conditionsChanged?: boolean;
  changesSummary?: string;
  approvedBy?: string;
  newContractId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── CLM Dashboard Types ───────────────────────────────────────────────

export interface CLMDashboard {
  tenantId: string;
  asOf: string;
  totalContracts?: number;
  activeContracts?: number;
  expiringSoon?: number;
  expiredContracts?: number;
  draftContracts?: number;
  pendingSignature?: number;
  expiringThisMonth?: number;
  expiringThisQuarter?: number;
  overdueObligations?: number;
  totalContractValue?: number;
  currency?: string;
  contractsByType?: Record<ContractType, number>;
  contractsByRisk?: Record<ContractRiskLevel, number>;
  renewalDecisionsDue?: Array<{ renewalId: string; contractTitle?: string; dueDate?: string }>;
  upcomingObligations?: Array<{ obligationId: string; title: string; dueDate?: string; contractId?: string }>;
  pendingSignatureList?: Array<{ contractId: string; title: string; sentAt?: string; parties?: string[] }>;
  recentActivity?: Array<{ type: string; description: string; occurredAt: string }>;
}
