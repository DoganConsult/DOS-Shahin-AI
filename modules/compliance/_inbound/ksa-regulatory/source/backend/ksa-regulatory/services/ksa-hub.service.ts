export interface DPIAInput {
  tenantId: string;
  projectName: string;
  dataController: string;
  processingPurpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  retentionPeriodDays?: number;
  crossBorderTransfer?: boolean;
  thirdPartyProcessors?: string[];
  automatedDecisionMaking?: boolean;
  createdBy: string;
}

export interface DPIARecord {
  id: string;
  tenantId: string;
  projectName: string;
  dataController: string;
  processingPurpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  retentionPeriodDays: number;
  crossBorderTransfer: boolean;
  thirdPartyProcessors: string[];
  automatedDecisionMaking: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  requiresDPOReview: boolean;
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SENSITIVE_CATEGORIES = ['health', 'financial', 'biometric', 'criminal', 'religious', 'political'];

function assessRiskLevel(input: DPIAInput): 'low' | 'medium' | 'high' {
  let score = 0;
  if (input.dataCategories.some(cat => SENSITIVE_CATEGORIES.some(s => cat.toLowerCase().includes(s)))) {
    score += 2;
  }
  if (input.crossBorderTransfer) score += 1;
  if (input.automatedDecisionMaking) score += 2;
  if ((input.thirdPartyProcessors ?? []).length > 0) score += 1;
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export function createDPIA(input: DPIAInput): DPIARecord {
  const riskLevel = assessRiskLevel(input);
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    projectName: input.projectName,
    dataController: input.dataController,
    processingPurpose: input.processingPurpose,
    dataCategories: input.dataCategories,
    dataSubjects: input.dataSubjects,
    retentionPeriodDays: input.retentionPeriodDays ?? 365,
    crossBorderTransfer: input.crossBorderTransfer ?? false,
    thirdPartyProcessors: input.thirdPartyProcessors ?? [],
    automatedDecisionMaking: input.automatedDecisionMaking ?? false,
    riskLevel,
    requiresDPOReview: riskLevel === 'high',
    status: 'draft',
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
}
