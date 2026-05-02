export interface RecordsListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  classification?: string;
  retentionPolicy?: string;
  dispositionStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface RecordsListResponse {
  success: boolean;
  data: RecordEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface RecordsDetailResponse {
  success: boolean;
  data: RecordEntityContract | null;
  classification?: RecordClassificationContract;
  retention?: RecordRetentionContract;
  disposition?: RecordDispositionContract;
}

export interface RecordsMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type RecordStatus = 'active' | 'under_review' | 'retained' | 'pending_disposition' | 'disposed' | 'blocked' | 'archived';

export interface RecordEntityContract {
  recordId: string;
  tenantId: string;
  title: string;
  description?: string;
  recordType: string;
  classification: string;
  status: RecordStatus;
  owner?: string;
  custodian?: string;
  retentionPolicyId?: string;
  retentionEndDate?: string;
  dispositionStatus?: 'none' | 'pending' | 'approved' | 'disposed' | 'held';
  legalHold: boolean;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  storageLocation?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordClassificationContract {
  recordId: string;
  classificationCode: string;
  classificationLabel: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  regulatoryCategory?: string;
  classifiedBy: string;
  classifiedAt: string;
  reviewDueAt?: string;
  autoClassified: boolean;
}

export interface RecordRetentionContract {
  recordId: string;
  policyId: string;
  policyName: string;
  retentionPeriodDays: number;
  retentionStartDate: string;
  retentionEndDate: string;
  archiveAfterDays?: number;
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldSetBy?: string;
  legalHoldSetAt?: string;
  status: 'active' | 'approaching_expiry' | 'expired' | 'held' | 'extended';
}

export interface RecordDispositionContract {
  recordId: string;
  dispositionType: 'destroy' | 'archive' | 'transfer' | 'review';
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  disposedAt?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'disposed' | 'blocked_legal_hold';
  reason?: string;
  evidenceOfDisposition?: string;
  authDecision?: {
    allowed: boolean;
    reason: string;
    sodValid: boolean;
    approvalRequired: boolean;
  };
}

export interface RecordStatusTransitionContract {
  recordId: string;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
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

export interface RecordReviewApprovalContract {
  reviewId: string;
  recordId: string;
  reviewType: 'classification_review' | 'retention_review' | 'disposition_approval';
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

export interface RecordsDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  retentionHealth: {
    totalRecords: number;
    approachingExpiry: number;
    expiredRetention: number;
    legalHoldCount: number;
  };
  classificationHealth: {
    unclassifiedRecords: number;
    overdueReviews: number;
    autoClassifiedCount: number;
  };
  dispositionHealth: {
    pendingDispositions: number;
    blockedByLegalHold: number;
    overdueDispositions: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface RecordBulkOperationContract {
  operation: 'classify' | 'set_retention' | 'request_disposition' | 'set_legal_hold' | 'archive';
  recordIds: string[];
  targetValue?: string;
  performedBy: string;
  performedAt: string;
  results: { id: string; success: boolean; error?: string }[];
}

export interface RecordExportContract {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  filters: RecordsListParams;
  requestedBy: string;
  requestedAt: string;
  totalRecords: number;
  downloadUrl?: string;
}

export interface RecordDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<RecordStatus, number>;
  classificationBreakdown: Record<string, number>;
  retentionCompliance: { compliant: number; approaching: number; expired: number };
  legalHoldCount: number;
  pendingDispositionCount: number;
  trends: { date: string; activeCount: number; disposedCount: number }[];
}
