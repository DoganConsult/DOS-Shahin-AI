export type RecordStatus = 'active' | 'retention' | 'review_pending' | 'disposed' | 'legal_hold' | 'archived';
export type RecordClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
export type RetentionPolicy = 'short_term' | 'medium_term' | 'long_term' | 'permanent' | 'regulatory';

export interface RecordContract {
  recordId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: RecordStatus; classification: RecordClassification; retentionPolicy: RetentionPolicy;
  ownerId: string; custodianId: string | null;
  sourceModule: string; sourceId: string | null;
  retentionEndDate: string | null; disposalDate: string | null;
  legalHoldReason: string | null; legalHoldAppliedById: string | null;
  lastReviewedAt: string | null; nextReviewDate: string | null;
  createdAt: string; updatedAt: string;
}

export interface RecordsDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalRecords: number;
  retentionExpiredCount: number; legalHoldCount: number;
  pendingDisposal: number; unclassifiedCount: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface RecordsDashboardContract {
  totalRecords: number; byStatus: Record<string, number>; byClassification: Record<string, number>;
  byRetention: Record<string, number>; retentionExpiredCount: number;
  legalHoldCount: number; pendingDisposal: number; disposedThisPeriod: number;
}
