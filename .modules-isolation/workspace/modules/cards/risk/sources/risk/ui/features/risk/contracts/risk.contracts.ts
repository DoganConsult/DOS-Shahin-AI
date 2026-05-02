export type RiskStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'assessed'
  | 'treatment_planned'
  | 'approved'
  | 'active'
  | 'monitoring'
  | 'closed'
  | 'retired'
  | 'returned'
  | 'identified'
  | 'mitigating'
  | 'accepted'
  | 'archived';

export type TreatmentStrategy = 'mitigate' | 'transfer' | 'accept' | 'avoid';

export type TreatmentStatus =
  | 'draft'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export type KRIStatus = 'draft' | 'active' | 'breached' | 'inactive' | 'archived';

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

export interface TreatmentContract {
  treatmentId: string;
  riskId: string;
  strategy: TreatmentStrategy;
  status: TreatmentStatus;
  description: string;
  owner: string;
  dueDate?: string;
  completionDate?: string;
  effectiveness?: number;
}

export interface KRIContract {
  kriId: string;
  name: string;
  description?: string;
  status: KRIStatus;
  currentValue: number;
  thresholdWarning?: number;
  thresholdBreach?: number;
  threshold?: { red: number; amber: number; green: number };
  unit?: string;
  frequency?: string;
  collectionFrequency?: string;
  owner: string;
  lastMeasuredAt?: string;
  lastUpdated?: string;
  linkedRiskId?: string;
  linkedRiskTitle?: string;
  linkedCategory?: string;
}

export interface RiskAppetiteContract {
  categoryCode: string;
  appetiteLevel: 'averse' | 'minimal' | 'cautious' | 'open' | 'hungry';
  toleranceLow: number;
  toleranceHigh: number;
  currentExposure?: number;
  breached: boolean;
}

export interface RiskAssessmentContract {
  assessmentId: string;
  riskId: string;
  status: 'planned' | 'in_progress' | 'under_review' | 'completed' | 'cancelled';
  assessorId: string;
  inherentScore: number;
  residualScore: number;
  controlEffectiveness?: number;
  completedAt?: string;
}

export type RiskZone = 'low' | 'medium' | 'high' | 'critical';

export interface RiskScoreContract {
  inherentScore: number;
  residualScore: number;
  likelihood: number;
  impact: number;
  zone: RiskZone;
  controlEffectiveness?: number;
}

export interface TreatmentPlanContract {
  treatmentId: string;
  title: string;
  description: string;
  linkedRiskId: string;
  linkedRiskTitle: string;
  strategy: TreatmentStrategy;
  owner: string;
  status: string;
  targetDate: string;
  expectedReduction: number;
  targetResidualScore: number;
  overdue: boolean;
  createdAt: string;
}

export interface RiskDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  tenantId: string;
  scoringHealth: { modelsCount: number; risksWithoutScore: number; staleScores: number };
  kriHealth: { totalKris: number; breachedCount: number; staleCollectionCount: number; missingLinkedRisk: number };
  treatmentHealth: { totalTreatments: number; overdueCount: number; pendingValidationCount: number; noOwnerCount: number };
  approvalHealth: { blockedApprovals: number; delegatedCount: number; escalatedCount: number };
  warnings: string[];
  errors: string[];
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  checkedAt: string;
}
