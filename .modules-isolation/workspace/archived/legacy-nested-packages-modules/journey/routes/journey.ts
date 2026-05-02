export interface CompanyProfile {
  size: 'small' | 'medium' | 'large';
  sectorId: string;
  tenantId?: string;
  companyName?: string;
  country?: string;
  [key: string]: unknown;
}

export interface RaciEntry {
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
}

export interface RaciMatrix {
  tenantId?: string;
  entries: RaciEntry[];
  roles?: Array<{ roleId: string; roleName: string; assignedUserId?: string }>;
  generatedAt: string;
  companySize?: string;
  sectorId?: string;
}

export interface RaciTeamRecommendation {
  recommendedRoles: Array<{
    roleId: string;
    roleName: string;
    description: string;
    isCritical: boolean;
  }>;
  minimumTeamSize: number;
  notes?: string[];
  consolidationSuggestions?: Array<Record<string, unknown>>;
}

export interface GrcTermDefinition { term?: string; definition?: string; category?: string; [k: string]: unknown; }
export interface FrameworkRecommendation { frameworkCode?: string; reason?: string; confidence?: number; priority?: number; [k: string]: unknown; }
export interface RoadmapTask { taskId?: string; title?: string; phase?: string; status?: string; dueDate?: string; assignee?: string; [k: string]: unknown; }
export interface GRCRoadmap { roadmapId?: string; tenantId?: string; phases?: RoadmapPhase[]; createdAt?: string; [k: string]: unknown; }
export type RoadmapPhaseType = 'discovery' | 'implementation' | 'validation' | 'optimization' | string;
export interface MaturityScore { overall?: number; dimensions?: Record<string, number>; assessedAt?: string; [k: string]: unknown; }
export interface MaturityComponent { componentId?: string; name?: string; score?: number; weight?: number; [k: string]: unknown; }
export interface TrendPoint { date?: string; value?: number; label?: string; [k: string]: unknown; }
export interface PhaseProgress { phaseId?: string; phaseName?: string; completionPercent?: number; tasksTotal?: number; tasksCompleted?: number; [k: string]: unknown; }
export interface ExecutiveSummary { tenantId?: string; complianceScore?: number; riskLevel?: string; openFindings?: number; overdueItems?: number; generatedAt?: string; [k: string]: unknown; }
export interface MaturityTrend { period?: string; score?: number; delta?: number; [k: string]: unknown; }
export interface GrcHealthReport { overallHealth?: string; complianceScore?: number; riskScore?: number; auditScore?: number; generatedAt?: string; [k: string]: unknown; }
export interface GuidanceCard { cardId?: string; title?: string; description?: string; priority?: string; actionUrl?: string; [k: string]: unknown; }
export interface JourneyProgress { currentPhase?: string; completionPercent?: number; stepsCompleted?: number; stepsTotal?: number; [k: string]: unknown; }
export interface GrcStage { stageId?: string; name?: string; order?: number; status?: string; [k: string]: unknown; }
export interface GrcStep { stepId?: string; stageId?: string; name?: string; status?: string; order?: number; [k: string]: unknown; }
export interface GrcRoadmap { roadmapId?: string; phases?: RoadmapPhase[]; status?: string; [k: string]: unknown; }
export interface JourneyState { phase?: string; step?: string; progress?: number; blockers?: string[]; [k: string]: unknown; }
export interface JourneyPhase { phaseId?: string; name?: string; status?: string; order?: number; [k: string]: unknown; }
export interface Nudge { nudgeId?: string; message?: string; priority?: string; targetAction?: string; [k: string]: unknown; }
export interface RoadmapPhase { phaseId?: string; name?: string; type?: RoadmapPhaseType; status?: string; tasks?: RoadmapTask[]; [k: string]: unknown; }
export interface Milestone { milestoneId?: string; title?: string; targetDate?: string; status?: string; [k: string]: unknown; }
export interface RegulatoryMap { regulatorCode?: string; frameworks?: string[]; jurisdiction?: string; [k: string]: unknown; }
export interface ActivatedTemplate { templateId?: string; name?: string; activatedAt?: string; moduleCode?: string; [k: string]: unknown; }
export interface AIContent { contentId?: string; type?: string; content?: string; generatedAt?: string; model?: string; [k: string]: unknown; }
export interface ProcessTemplate { templateId?: string; name?: string; category?: string; steps?: string[]; [k: string]: unknown; }
export interface JourneyCompanyProfile { size?: string; sector?: string; country?: string; maturity?: string; [k: string]: unknown; }
export interface RoleRecommendation { roleId?: string; roleName?: string; reason?: string; priority?: number; [k: string]: unknown; }
export type CompanySize = 'small' | 'medium' | 'large' | string;

export interface NormalizedOnboardingProfile {
  organization?: {
    name?: string;
    legalName?: string;
    displayName?: string;
    arabicName?: string;
    size?: string;
    sector?: string;
    industry?: string;
    country?: string;
    city?: string;
    employeeBand?: string;
    languageCode?: string;
    timezone?: string;
    fiscalYearEnd?: string;
    dataResidency?: string | null;
    businessDays?: string[];
    subSector?: string;
    [key: string]: unknown;
  };
  regulatory?: {
    sectorCode?: string;
    frameworksConfirmed?: string[];
    authorities?: string[];
    regulatedSector?: boolean;
    samaCompliance?: boolean;
    ncaRegistration?: boolean;
    pdplScope?: string;
    crossBorderData?: boolean;
    jurisdictions?: string[];
    auditCadence?: string;
    advancedCustomRegulators?: unknown[];
    [key: string]: unknown;
  };
  technology?: {
    cloudProvider?: string;
    hasERP?: boolean;
    hasIAM?: boolean;
    hasSIEM?: boolean;
    mfaEnabled?: boolean;
    [key: string]: unknown;
  };
  modules?: {
    enabledModules?: string[];
    priorityModules?: string[];
  };
  workspace?: {
    enabledModules?: string[];
    dashboardProfile?: string;
    startupMode?: string;
    riskAppetite?: string;
    [key: string]: unknown;
  };
  operations?: {
    retentionPolicyYears?: number;
    evidenceMode?: string;
    controlTestingModel?: string;
    reportingCadence?: string;
    complianceCadence?: string;
    primaryFrameworkGoal?: string;
    [key: string]: unknown;
  };
  governance?: {
    threeLines?: boolean;
    delegationOfAuthority?: boolean;
    [key: string]: unknown;
  };
  structure?: {
    departments?: unknown[];
    entities?: unknown[];
    [key: string]: unknown;
  };
  people?: {
    invites?: unknown[];
    executiveSponsor?: string;
    cisoName?: string;
    cisoReportsTo?: string;
    [key: string]: unknown;
  };
  maturity?: {
    hasPolicyLibrary?: boolean;
    overallLevel?: string;
    [key: string]: unknown;
  };
  readinessScore?: number;
  [key: string]: unknown;
}

export interface PersonProfileInput {
  fullName: string;
  workEmail: string;
  userId?: string;
  jobTitle?: string;
  department?: string;
  businessFunction?: string;
  [key: string]: unknown;
}

export interface ModuleAssignmentInput {
  userId: string;
  moduleCode: string;
  roleCode?: string;
  roleNameAr?: string;
  isPrimary?: boolean;
  scopeType?: string;
  scopeId?: string;
  [key: string]: unknown;
}

export interface PersonSummary {
  email: string;
  name: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  businessFunction: string;
  modules: string[];
  teamCodes: string[];
  responsibilityCount: number;
  isPrimaryForModules: string[];
}

export interface TeamPreview {
  teamCode: string;
  nameEn: string;
  nameAr: string;
  teamType: string;
  memberCount: number;
  members: Array<{ email: string; role: string; teamRole: string }>;
  escalationChain: string[];
  raciSummary: Record<string, string>;
}

export interface ValidationWarning {
  code: string;
  severity: string;
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  stageCode: string;
  questionCode: string;
  autoFixable: boolean;
}

export interface CreateOnboardingSessionDto {
  organizationName?: string;
  displayName?: string;
  languageCode?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SaveBulkAnswersDto {
  answers: SaveAnswerDto[];
  stageCode?: string;
  [key: string]: unknown;
}

export interface ApproveOnboardingDto {
  approvedByUserId?: string;
  acceptProvisioningImpact: boolean;
  userRoles?: string[];
}

export interface SaveAnswerDto {
  questionCode: string;
  answerText?: string | null;
  answerNumber?: number | null;
  answerBool?: boolean | null;
  answerDate?: string | null;
  answerJson?: unknown | null;
}

export type JourneyRoadmapStatus = 'draft' | 'active' | 'completed' | 'archived' | string;
export type JourneyPhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | string;
export type JourneyMilestoneStatus = 'pending' | 'achieved' | 'overdue' | string;
export type JourneyGapSeverity = 'critical' | 'high' | 'medium' | 'low' | string;
export type JourneyStatus = 'active' | 'on_hold' | 'completed' | string;

export interface JourneyRoadmap {
  roadmapId?: string;
  tenantId?: string;
  status?: JourneyRoadmapStatus;
  phases?: JourneyPhase[];
  [k: string]: unknown;
}

export interface JourneyMilestone {
  milestoneId?: string;
  status?: JourneyMilestoneStatus;
  [k: string]: unknown;
}

export interface JourneyGapItem {
  gapId?: string;
  severity?: JourneyGapSeverity;
  status?: string;
  [k: string]: unknown;
}

export interface JourneyMaturitySnapshot {
  snapshotId?: string;
  score?: number;
  recordedAt?: string;
  [k: string]: unknown;
}

export interface JourneyEventPayload {
  tenantId: string;
  userId?: string;
  entityId: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
}

