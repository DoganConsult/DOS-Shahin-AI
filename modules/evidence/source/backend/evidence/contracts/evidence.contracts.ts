export interface EvidenceItemContract {
  evidenceId: string;
  code: string;
  titleEn: string;
  titleAr: string | null;
  evidenceType: string;
  sourceType: 'manual' | 'automated' | 'api' | 'connector';
  status: 'draft' | 'collected' | 'validated' | 'expired' | 'rejected' | 'archived';
  qualityScore: number | null;
  freshnessStatus: 'fresh' | 'stale' | 'expired' | 'unknown';
  collectedAt: string | null;
  expiresAt: string | null;
  ownerId: string | null;
  linkCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceRequestContract {
  requestId: string;
  titleEn: string;
  requestType: 'collection' | 'refresh' | 'more_info' | 'review';
  status: 'open' | 'in_progress' | 'fulfilled' | 'overdue' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigneeId: string | null;
  dueDate: string | null;
  itemCount: number;
  fulfilledCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidencePackageContract {
  packageId: string;
  nameEn: string;
  description: string | null;
  status: 'draft' | 'assembled' | 'under_review' | 'approved' | 'submitted' | 'archived';
  purpose: 'audit' | 'regulatory' | 'assessment' | 'internal_review' | 'export';
  itemCount: number;
  totalSizeMb: number | null;
  assembledBy: string | null;
  assembledAt: string | null;
  createdAt: string;
}

export interface EvidenceReviewContract {
  reviewId: string;
  evidenceId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  decision: string | null;
  comments: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface EvidenceCollectionScheduleContract {
  scheduleId: string;
  nameEn: string;
  cronExpression: string;
  sourceConfigId: string | null;
  status: 'active' | 'paused' | 'disabled';
  lastRunAt: string | null;
  nextRunAt: string | null;
  successCount: number;
  failureCount: number;
}

export interface EvidenceFreshnessContract {
  evidenceId: string;
  code: string;
  freshnessStatus: 'fresh' | 'stale' | 'expired' | 'unknown';
  collectedAt: string | null;
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  refreshScheduled: boolean;
}

export interface EvidenceQualityContract {
  evidenceId: string;
  code: string;
  overallScore: number | null;
  completenessScore: number | null;
  relevanceScore: number | null;
  timelinessScore: number | null;
  authenticityScore: number | null;
  scoredAt: string | null;
  scoringMethod: 'manual' | 'ai' | 'rule_based' | null;
}

export interface EvidenceDiagnosticsContract {
  tenantId: string;
  totalEvidence: number;
  collectedEvidence: number;
  expiredEvidence: number;
  staleEvidence: number;
  openRequests: number;
  overdueRequests: number;
  pendingReviews: number;
  rejectedReviews: number;
  activeSchedules: number;
  failedCollectionJobs: number;
  averageQualityScore: number | null;
  coverageGapCount: number;
  capturedAt: string;
}

export interface EvidenceAdminSettingsContract {
  freshnessThresholdDays: number;
  autoCollectionEnabled: boolean;
  qualityScoringEnabled: boolean;
  retentionPolicyDays: number;
  multimodalAnalysisEnabled: boolean;
  connectorSyncIntervalHours: number;
}

export interface EvidenceListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  evidenceType?: string;
  freshnessStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EvidenceListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
