export interface AssetListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  assetType?: string;
  classification?: string;
  owner?: string;
  criticality?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface AssetListResponse {
  success: boolean;
  data: AssetEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface AssetDetailResponse {
  success: boolean;
  data: AssetEntityContract | null;
  classification?: AssetClassificationContract;
  ownership?: AssetOwnershipContract;
  lifecycle?: AssetLifecycleContract;
}

export interface AssetMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type AssetStatus = 'draft' | 'active' | 'under_review' | 'decommissioning' | 'decommissioned' | 'archived';

export interface AssetEntityContract {
  assetId: string;
  tenantId: string;
  name: string;
  description?: string;
  assetType: 'hardware' | 'software' | 'data' | 'service' | 'facility' | 'people' | 'intangible';
  status: AssetStatus;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  classification: string;
  owner?: string;
  custodian?: string;
  department?: string;
  location?: string;
  purchaseDate?: string;
  endOfLife?: string;
  value?: number;
  valueCurrency?: string;
  linkedRiskIds?: string[];
  linkedControlIds?: string[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetClassificationContract {
  assetId: string;
  classificationCode: string;
  classificationLabel: string;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  integrityLevel: 'low' | 'medium' | 'high' | 'critical';
  availabilityLevel: 'low' | 'medium' | 'high' | 'critical';
  classifiedBy: string;
  classifiedAt: string;
  reviewDueAt?: string;
  autoClassified: boolean;
  regulatoryCategory?: string;
}

export interface AssetOwnershipContract {
  assetId: string;
  primaryOwner: string;
  custodian?: string;
  department?: string;
  assignedAt: string;
  assignedBy: string;
  previousOwner?: string;
  delegatable: boolean;
  delegatedTo?: string;
}

export interface AssetLifecycleContract {
  assetId: string;
  currentPhase: 'procurement' | 'deployment' | 'operation' | 'maintenance' | 'decommission' | 'disposal';
  procurementDate?: string;
  deploymentDate?: string;
  maintenanceSchedule?: string;
  endOfSupportDate?: string;
  endOfLifeDate?: string;
  disposalMethod?: 'recycle' | 'destroy' | 'donate' | 'resell' | 'archive';
  disposalDate?: string;
  disposalCertificate?: string;
}

export interface AssetStatusTransitionContract {
  assetId: string;
  fromStatus: AssetStatus;
  toStatus: AssetStatus;
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

export interface AssetReviewApprovalContract {
  reviewId: string;
  assetId: string;
  reviewType: 'classification_review' | 'decommission_approval' | 'ownership_transfer' | 'disposal_approval';
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

export interface AssetDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  inventoryHealth: {
    unclassifiedAssets: number;
    assetsWithoutOwner: number;
    assetsApproachingEol: number;
    assetsPassedEol: number;
  };
  classificationHealth: {
    overdueReviews: number;
    autoClassifiedPending: number;
    criticalUnreviewed: number;
  };
  lifecycleHealth: {
    stuckInDecommission: number;
    noMaintenanceSchedule: number;
    overdueDisposal: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface AssetDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<AssetStatus, number>;
  typeBreakdown: Record<string, number>;
  criticalityBreakdown: Record<string, number>;
  classificationBreakdown: Record<string, number>;
  assetsApproachingEol: number;
  unclassifiedCount: number;
  noOwnerCount: number;
  totalValue?: number;
  trends: { date: string; activeCount: number; decommissionedCount: number }[];
}
