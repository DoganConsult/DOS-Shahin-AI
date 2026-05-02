export type AssetStatus = 'draft' | 'registered' | 'active' | 'under_review' | 'decommissioning' | 'decommissioned' | 'archived';
export type AssetClassification = 'critical' | 'high' | 'medium' | 'low' | 'unclassified';
export type AssetType = 'hardware' | 'software' | 'data' | 'network' | 'cloud' | 'facility' | 'personnel' | 'service' | 'other';

export interface AssetContract {
  assetId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  assetType: AssetType; classification: AssetClassification; status: AssetStatus;
  ownerId: string; custodianId: string | null; departmentId: string | null;
  description: string; location: string | null;
  linkedControlIds: string[]; linkedRiskIds: string[];
  acquisitionDate: string | null; endOfLifeDate: string | null;
  lastReviewDate: string | null; nextReviewDate: string | null;
  createdAt: string; updatedAt: string;
}

export interface AssetDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalAssets: number; unclassifiedCount: number;
  noOwnerCount: number; overdueReviews: number; endOfLifeApproaching: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface AssetDashboardContract {
  totalAssets: number; byType: Record<string, number>; byClassification: Record<string, number>;
  byStatus: Record<string, number>; unclassifiedCount: number; overdueReviewCount: number;
  endOfLifeCount: number; ownershipGaps: number;
}
