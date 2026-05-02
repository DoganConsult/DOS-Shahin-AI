import type { ModuleEventContract as _ModuleEventContract } from '@dos/types';

export interface ControlsListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  ownershipType?: string;
  effectivenessRating?: string;
  automationState?: string;
  mappedToRisk?: string;
  mappedToObligation?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface ControlsListResponse {
  success: boolean;
  data: ControlEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface ControlsDetailResponse {
  success: boolean;
  data: ControlEntityContract | null;
  mappings?: ControlMappingContract;
  ownership?: ControlOwnershipContract;
  effectiveness?: ControlEffectivenessContract;
  automation?: ControlAutomationStateContract;
}

export interface ControlsMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export interface ControlEntityContract {
  controlId: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  controlType: 'preventive' | 'detective' | 'corrective' | 'directive' | 'compensating';
  implementationType: 'manual' | 'automated' | 'hybrid';
  status: ControlStatus;
  designEffectiveness?: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  operatingEffectiveness?: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  effectivenessRating?: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  frequency?: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'event_driven';
  owner?: string;
  operator?: string;
  lastTestedAt?: string;
  nextTestDueAt?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ControlStatus = 'draft' | 'active' | 'under_review' | 'ineffective' | 'retired' | 'archived';

export interface ControlOwnershipContract {
  controlId: string;
  primaryOwner: string;
  secondaryOwner?: string;
  operator?: string;
  reviewer?: string;
  designOwner?: string;
  implementationOwner?: string;
  testingOwner?: string;
  ownershipType: 'primary' | 'operator' | 'reviewer' | 'design' | 'testing';
  assignedAt: string;
  assignedBy: string;
  delegatable: boolean;
  delegatedTo?: string;
}

export interface ControlMappingContract {
  controlId: string;
  riskMappings: { riskId: string; riskTitle: string; linkType: 'mitigates' | 'monitors' | 'detects' }[];
  obligationMappings: { obligationId: string; frameworkCode: string; requirementRef: string }[];
  policyMappings: { policyId: string; policyTitle: string; linkType: 'implements' | 'supports' }[];
  assetMappings?: { assetId: string; assetName: string }[];
  totalMappings: number;
  unmappedWarning: boolean;
}

export interface ControlEffectivenessContract {
  controlId: string;
  testId: string;
  testType: 'design' | 'operating' | 'walkthrough' | 'substantive';
  testResult: 'pass' | 'fail' | 'partial' | 'not_applicable';
  rating: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
  testedBy: string;
  testedAt: string;
  sampleSize?: number;
  exceptionsFound?: number;
  findings?: string;
  nextTestDueAt?: string;
  evidenceIds?: string[];
}

export interface ControlAutomationStateContract {
  controlId: string;
  automationLevel: 'full' | 'partial' | 'manual' | 'planned';
  healthStatus: 'healthy' | 'degraded' | 'failing' | 'unknown';
  lastExecutedAt?: string;
  executionFrequency?: string;
  failureCount?: number;
  lastFailureAt?: string;
  lastFailureReason?: string;
  monitoringEnabled: boolean;
  alertThreshold?: number;
}

export interface ControlStatusTransitionContract {
  controlId: string;
  fromStatus: ControlStatus;
  toStatus: ControlStatus;
  transitionedBy: string;
  transitionedAt: string;
  reason?: string;
  evidenceIds?: string[];
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface ControlReviewApprovalContract {
  reviewId: string;
  controlId: string;
  reviewType: 'activation' | 'retirement' | 'mapping_change' | 'effectiveness_review';
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface ControlsDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  mappingConsistency: {
    unmappedActiveControls: number;
    orphanedRiskLinks: number;
    orphanedObligationLinks: number;
    orphanedPolicyLinks: number;
  };
  ownershipGaps: {
    controlsWithoutPrimaryOwner: number;
    controlsWithoutOperator: number;
    totalGaps: number;
  };
  testEffectiveness: {
    overdueTests: number;
    neverTestedActiveControls: number;
    ineffectiveControls: number;
  };
  automationHealth: {
    failingAutomations: number;
    degradedAutomations: number;
    unknownStateCount: number;
  };
  protectedTransitions: {
    controlsInReviewOver7Days: number;
    staleCertifications: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface ControlBulkOperationContract {
  operation: 'status_change' | 'assign_owner' | 'reassign_operator' | 'archive' | 'delete';
  controlIds: string[];
  targetValue?: string;
  performedBy: string;
  performedAt: string;
  results: { id: string; success: boolean; error?: string }[];
}

export interface ControlExportContract {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  filters: ControlsListParams;
  requestedBy: string;
  requestedAt: string;
  totalRecords: number;
  downloadUrl?: string;
}

export interface ControlDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<ControlStatus, number>;
  effectivenessBreakdown: Record<string, number>;
  automationCoverage: { automated: number; manual: number; hybrid: number };
  overdueTestCount: number;
  unmappedControlCount: number;
  ownershipGapCount: number;
  ineffectiveControlCount: number;
  trends: { date: string; activeCount: number; ineffectiveCount: number }[];
}

export interface ControlCertificationContract {
  campaignId: string;
  controlId: string;
  certifiedBy: string;
  certifiedAt: string;
  status: 'pending' | 'certified' | 'rejected' | 'expired';
  expiresAt?: string;
  comments?: string;
  evidenceIds?: string[];
}

export interface ControlMonitoringContract {
  ruleId: string;
  controlId: string;
  ruleType: 'threshold' | 'pattern' | 'schedule';
  condition: string;
  alertSeverity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
}
