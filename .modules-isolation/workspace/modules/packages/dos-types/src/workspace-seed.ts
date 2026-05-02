export const WORKSPACE_SEED_SCHEMA_VERSION = '1.0.0';

export interface RegulatoryCandidate {
  code: string;
  name_en: string;
  confidence: number;
  reasons: string[];
}

export interface FrameworkCandidate {
  code: string;
  name_en: string;
  confidence: number;
  reasons: string[];
}

export interface ControlClusterSummary {
  code: string;
  name_en: string;
  status: string;
  confidence: number;
  controlsCount: number;
}

export interface EvidencePlanSeed {
  cadenceDefaults: Record<string, string>;
  automationTargets: { day30: number; day90: number };
  tasksCreated90d: number;
  firstDueItems: Array<{ controlId: string; dueAt: string; role: string }>;
}

export interface PlanItemSeed {
  itemId: string;
  week: number;
  type: string;
  title_en: string;
  title_ar: string;
  owner_role: string;
  due_at: string;
  status: string;
}

export interface Plan90dSeed {
  templateCode: string;
  startAt: string;
  items: PlanItemSeed[];
}

export interface WorkspaceSeed {
  schemaVersion: string;
  generatedAt: string;
  answersHash?: string;
  tenant: {
    tenantId: string;
    orgName: string;
    sector: string;
    country: string;
    tier: string;
    modules: string[];
  };
  rbac: {
    roles: string[];
    assignments: Record<string, string[]>;
  };
  regulatoryProfile: {
    regulators: RegulatoryCandidate[];
    frameworks: FrameworkCandidate[];
  };
  controlUniverse: {
    clusters: ControlClusterSummary[];
    controlsApplicableCount: number;
    controlsNeedsConfirmationCount: number;
    includedControlIds: string[];
  };
  evidencePlan: EvidencePlanSeed;
  dashboards: string[];
  workflows: string[];
  assessments: string[];
  plan90d: Plan90dSeed;
}
