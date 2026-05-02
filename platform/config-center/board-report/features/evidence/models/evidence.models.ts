/**
 * Evidence Feature Models — AGRC-OS
 * All DTOs for the Evidence Command Workspace
 */

// ═══ Evidence Items ═══
export interface EvidenceItemDto {
  evidenceId: string;
  controlId: string;
  title: string;
  description: string | null;
  contentHash: string | null;
  previousHash: string | null;
  submittedBy: string;
  version: number;
  chainPosition: number;
  filePath: string | null;
  fileSizeBytes: number | null;
  expiryDate: string | null;
  createdAt: string;
  status: 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'expired';
  type?: string;
}

export interface EvidenceDetailDto extends EvidenceItemDto {
  files: EvidenceFileDto[];
  controlCode?: string;
  controlTitle?: string;
  frameworkCode?: string;
  reviewHistory: EvidenceReviewDto[];
}

export interface EvidenceFileDto {
  fileId: string;
  evidenceId: string;
  filename: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

// ═══ Overview Stats ═══
export interface EvidenceOverviewDto {
  totalEvidence: number;
  expiringSoon: number;
  expired: number;
  pendingReviews: number;
  overdueRequests: number;
  taskStats: Record<string, number>;
  recentActivity: EvidenceActivityDto[];
}

export interface EvidenceActivityDto {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityName: string;
  entityId: string;
}

// ═══ Requests ═══
export interface EvidenceRequestDto {
  requestId: string;
  controlId: string;
  frameworkCode: string;
  evidenceType: string;
  requestingTeamId: string;
  assignedTeamId: string;
  dueDate: string;
  status: 'pending' | 'acknowledged' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  requestDetails: string;
  submittedAt: string;
  submittedBy: string;
  createdBy: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

// ═══ Reviews ═══
export interface EvidenceReviewDto {
  reviewId: string;
  evidenceId: string;
  reviewerUserId: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  comments: string;
  reviewedAt: string;
  createdAt: string;
}

// ═══ Requirements ═══
export interface EvidenceRequirementDto {
  id: string;
  controlId: string;
  frameworkCode: string;
  controlNumber: string;
  evidenceTypeCode: string;
  isMandatory: boolean;
  requirementDescriptionEn: string;
  expectedContentEn: string;
  collectionFrequency: string;
  retentionPeriodMonths: number;
  controlCode: string;
  controlTitleEn: string;
  domainNameEn: string;
  evidenceNameEn: string;
  fileExtensions: string;
}

export interface EvidenceRequirementsSummaryDto {
  frameworks: { frameworkCode: string; requirementCount: number }[];
}

// ═══ Connectors ═══
export interface EvidenceConnectorDto {
  connectorId: string;
  name: string;
  type: 'sharepoint' | 'google_drive' | 'azure_blob' | 'jira' | 'servicenow' | 'manual';
  status: 'active' | 'inactive' | 'error';
  lastSyncAt: string | null;
  itemsCollected: number;
  configuration: Record<string, unknown>;
}

// ═══ Schedules ═══
export interface EvidenceScheduleDto {
  scheduleId: string;
  controlId: string;
  cronExpression: string;
  reminderText: string;
  assignedTo: string;
  enabled: boolean;
}

// ═══ Chain Verification ═══
export interface ChainVerificationDto {
  intact: boolean;
  chainLength: number;
  brokenAt?: number;
  message?: string;
}

// ═══ Evidence Mappings ═══
export interface EvidenceMappingDto {
  mappingId: string;
  evidenceId: string;
  evidenceTitle: string;
  controlId: string;
  controlCode: string;
  frameworkCode: string;
  obligationId?: string;
  obligationCode?: string;
  mappedAt: string;
  mappedBy: string;
}

// ═══ Tasks ═══
export interface EvidenceTaskDto {
  taskId: string;
  evidenceId?: string;
  requestId?: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

// ═══ Expiry Tracking ═══
export interface EvidenceExpiryDto {
  evidenceId: string;
  title: string;
  controlId: string;
  controlCode?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'valid' | 'expiring_soon' | 'expired';
  assignedTo?: string;
}

// ═══ Dashboard Metrics ═══
export interface EvidenceDashboardDto {
  coverage: number;
  freshness: number;
  slaStatus: string;
  pending: number;
  overdue: number;
}

export interface EvidenceAutomationDto {
  lastRun: string;
  error: string;
  aiScore: number;
}

// ═══ Home Dashboard Widgets ═══
export interface EvidenceHomeWidgetDto {
  totalActive: number;
  openRequests: number;
  overdueRequests: number;
  pendingReview: number;
  rejectedEvidence: number;
  staleEvidence: number;
  expiringThisMonth: number;
  reuseRate: number;
  automationRate: number;
  totalPackages: number;
}

// ═══ Work Queue ═══
export interface EvidenceWorkQueueDto {
  assignedRequests: EvidenceRequestDto[];
  pendingReviews: Record<string, unknown>[];
  expiringEvidence: Record<string, unknown>[];
  rejectedItems: Record<string, unknown>[];
  myTasks: EvidenceTaskDto[];
}

// ═══ Freshness ═══
export interface EvidenceFreshnessOverviewDto {
  total: number;
  current: number;
  stale: number;
  expired: number;
  neverVerified: number;
  freshnessRate: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
}

export interface EvidenceFreshnessRecordDto {
  id: string;
  evidenceId: string;
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  freshnessBand: string;
  refreshDueAt: string | null;
  verificationMethod: string | null;
  verifiedBy: string | null;
}

export interface EvidenceVerificationEventDto {
  id: string;
  evidenceId: string;
  eventType: string;
  verifiedBy: string | null;
  verifiedAt: string;
  notes: string | null;
}

// ═══ Links & Tags ═══
export interface EvidenceLinkDto {
  id: string;
  evidenceId: string;
  linkedObjectType: string;
  linkedObjectId: string;
  linkType: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface EvidenceTagDto {
  id: string;
  tagKey: string;
  tagValue: string | null;
  createdAt: string;
}

// ═══ Quality Assessment ═══
export interface EvidenceQualityAssessmentDto {
  id: string;
  evidenceId: string;
  reviewId: string | null;
  completenessResult: string;
  scopeMatchResult: string;
  authenticityResult: string;
  readabilityResult: string;
  qualityScore: number;
  notes: string | null;
  assessedBy: string;
  assessedAt: string;
}

// ═══ Packages & Exports ═══
export interface EvidencePackageDto {
  id: string;
  packageCode: string;
  name: string;
  packageType: string;
  description: string | null;
  status: string;
  scopeType: string | null;
  scopeId: string | null;
  itemCount: number;
  createdBy: string;
  createdAt: string;
  items?: EvidencePackageItemDto[];
}

export interface EvidencePackageItemDto {
  id: string;
  packageId: string;
  evidenceId: string;
  sortOrder: number;
  addedAt: string;
  evidenceTitle?: string;
  evidenceStatus?: string;
  freshnessStatus?: string;
}

export interface EvidenceExportDto {
  id: string;
  packageId: string;
  format: string;
  status: string;
  filePath: string | null;
  fileSize: number | null;
  exportedBy: string;
  exportedAt: string;
  downloadCount: number;
}

// ═══ Duplicate Candidates ═══
export interface EvidenceDuplicateDto {
  id: string;
  evidenceAId: string;
  evidenceBId: string;
  similarityScore: number;
  detectionMethod: string;
  detectedAt: string;
  titleA: string;
  titleB: string;
  typeA: string;
  typeB: string;
}

// ═══ Admin Settings ═══
export interface EvidenceAdminSettingsDto {
  [key: string]: {
    value: string | number | boolean | Record<string, unknown>;
    description: string;
    updatedAt: string;
  };
}

// ═══ Taxonomy ═══
export interface EvidenceTaxonomyDto {
  evidenceTypes: { id: string; code: string; labelEn: string; labelAr: string; category: string; isActive: boolean }[];
  sourceTypes: { id: string; code: string; labelEn: string; labelAr: string; isActive: boolean }[];
  confidentialityLevels: { id: string; code: string; labelEn: string; labelAr: string; sortOrder: number }[];
  qualityRules: { id: string; ruleCode: string; ruleName: string; checkType: string; threshold: number; isActive: boolean }[];
  rejectionReasons: { id: string; code: string; labelEn: string; labelAr: string; isActive: boolean }[];
}

// ═══ Reports ═══
export interface EvidenceReportAgingDto {
  bands: { band: string; count: number; percentage: number }[];
  averageAgeDays: number;
  oldestEvidenceDate: string | null;
}

export interface EvidencePackageFreshnessDto {
  valid: boolean;
  totalItems: number;
  currentItems: number;
  staleItems: Record<string, unknown>[];
  expiredItems: Record<string, unknown>[];
}
