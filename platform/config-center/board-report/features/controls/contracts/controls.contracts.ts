export type ControlStatus = 'draft' | 'active' | 'under_review' | 'ineffective' | 'retired' | 'archived';

export type ControlCategory = 'preventive' | 'detective' | 'corrective' | 'compensating' | 'directive';

export type ControlAutomation = 'manual' | 'semi_automated' | 'fully_automated';

export type EffectivenessRating = 'effective' | 'partially_effective' | 'ineffective' | 'not_tested';

export interface ControlContract {
  controlId: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string | null;
  description: string;
  category: ControlCategory;
  status: ControlStatus;
  automationState: ControlAutomation;
  ownerId: string;
  designEffectiveness: EffectivenessRating;
  operatingEffectiveness: EffectivenessRating;
  lastTestedAt: string | null;
  nextTestDueDate: string | null;
  linkedFrameworkIds: string[];
  linkedRiskIds: string[];
  linkedPolicyIds: string[];
  linkedEvidenceIds: string[];
  taxonomyTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ControlMappingContract {
  mappingId: string;
  controlId: string;
  targetType: 'framework' | 'risk' | 'policy' | 'regulation';
  targetId: string;
  targetName: string;
  mappingStrength: 'primary' | 'supporting' | 'partial';
  createdAt: string;
}

export interface ControlTestResultContract {
  testId: string;
  controlId: string;
  testType: 'design' | 'operating' | 'walkthrough';
  result: EffectivenessRating;
  testerId: string;
  testedAt: string;
  findings: string | null;
  evidenceIds: string[];
  nextScheduledDate: string | null;
}

export interface ControlDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalControls: number;
  activeControls: number;
  ineffectiveControls: number;
  overdueTests: number;
  ownershipGaps: number;
  unmappedControls: number;
  automationCoverage: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface ControlDashboardContract {
  totalControls: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byAutomation: Record<string, number>;
  ineffectiveCount: number;
  overdueTestCount: number;
  ownershipGapCount: number;
  mappingCompleteness: number;
  automationRate: number;
  recentTests: Array<{
    testId: string;
    controlCode: string;
    result: EffectivenessRating;
    testedAt: string;
  }>;
}
