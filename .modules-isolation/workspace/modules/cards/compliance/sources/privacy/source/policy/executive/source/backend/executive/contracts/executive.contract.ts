// Executive Contracts — Spec §6
export interface ExecutiveBriefContract {
  briefId: string;
  title: string;
  generatedContentHtml: string | null;
  referenceDate: string;
  generationMethod: string;
  status: string;
  generatedByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveObjectiveContract {
  objectiveId: string;
  title: string;
  description: string | null;
  parentId: string | null;
  targetKpi: string | null;
  currentValue: number | null;
  targetValue: number | null;
  progressPct: number;
  status: string;
  ownerUserId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveRiskAppetiteContract {
  appetiteId: string;
  domainCategory: string;
  quantitativeLimit: number | null;
  qualitativeLimitDesc: string | null;
  currentExposure: number;
  isBreached: boolean;
  lastEvaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}
