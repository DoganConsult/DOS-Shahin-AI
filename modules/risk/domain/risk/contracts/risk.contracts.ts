
// TODO: RiskStatus doesn't exist in @dos/types, define locally
export type RiskStatus = 'identified' | 'assessed' | 'treated' | 'accepted' | 'closed' | 'escalated';
import type { RiskZone } from '../services/scoring/risk-scoring.service';

export interface RiskEntityContract {
  riskId: string;
  tenantId: string;
  title: string;
  description?: string;
  category: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  inherentScore?: number;
  residualScore?: number;
  status: RiskStatus;
  owner: string;
  treatmentStatus?: string;
  appetiteStatus?: 'within' | 'exceeded' | 'approaching';
  nextReviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RiskScoreContract {
  riskId: string;
  modelId: string;
  compositeScore: number;
  zone: RiskZone;
  dimensionScores: Array<{ name: string; score: number }>;
  scoredAt: string;
  thresholdCrossing?: {
    crossed: boolean;
    direction: 'up' | 'down';
    fromZone: RiskZone;
    toZone: RiskZone;
  } | null;
}

export interface RiskAppetiteAlignmentContract {
  tenantId: string;
  categoryCode: string;
  appetiteStatement?: string;
  toleranceMin?: number;
  toleranceMax?: number;
  appetiteZone: RiskZone;
  currentResidualScore?: number;
  status: 'within' | 'exceeded' | 'approaching';
  lastUpdatedAt: string;
}

export interface KRIContract {
  kriId: string;
  name: string;
  description?: string;
  linkedRiskId?: string;
  linkedCategory?: string;
  owner: string;
  currentValue: number;
  threshold: { red: number; amber: number; green: number };
  status: 'normal' | 'warning' | 'breach';
  collectionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastUpdated?: string;
}

export interface TreatmentPlanContract {
  treatmentId: string;
  title: string;
  description?: string;
  linkedRiskId?: string;
  strategy: 'mitigate' | 'transfer' | 'accept' | 'avoid';
  owner: string;
  status: 'planned' | 'approved' | 'in_progress' | 'validation' | 'done' | 'completed' | 'validated';
  targetDate?: string;
  expectedReduction?: number;
  actualReduction?: number;
  targetResidualScore?: number;
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
  overdue?: boolean;
  createdAt: string;
}

export interface RiskReviewApprovalContract {
  reviewId: string;
  entityType: 'risk' | 'treatment' | 'kri';
  entityId: string;
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

export interface RiskDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  scoringHealth: {
    modelsCount: number;
    risksWithoutScore: number;
    staleScores: number;
  };
  kriHealth: {
    totalKris: number;
    breachedCount: number;
    staleCollectionCount: number;
    missingLinkedRisk: number;
  };
  treatmentHealth: {
    totalTreatments: number;
    overdueCount: number;
    pendingValidationCount: number;
    noOwnerCount: number;
  };
  approvalHealth: {
    blockedApprovals: number;
    delegatedCount: number;
    escalatedCount: number;
  };
  warnings: string[];
  errors: string[];
}
