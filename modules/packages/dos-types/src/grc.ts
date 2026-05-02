export type ModuleCode = string;
export type TenantId = string;
export type UserId = string;
export type EntityId = string;
export type PermissionCode = string;
export type RoleCode = string;
export interface GrcContext { tenantId: TenantId; userId: UserId; moduleCode?: ModuleCode; }

export interface AGRCOSCycleResult {
  runId?: string;
  tenantId?: string;
  status?: 'completed' | 'failed' | 'partial' | string;
  startedAt?: string;
  completedAt?: string;
  steps?: Record<string, { status: string; durationMs?: number; error?: string }>;
  summary?: Record<string, unknown>;
  telemetryIngested?: number;
  controlsEvaluated?: number;
  risksComputed?: number;
  policiesChecked?: number;
  gatesEnforced?: number;
  auditRecordsCreated?: number;
  error?: string;
  risksRecomputed?: Record<string, unknown>;
  enforcementActions?: Record<string, unknown>;
  policyDecisions?: Record<string, unknown>;
  auditEntries?: Record<string, unknown>;
  cycleMs?: number;
  warnings?: string[];
  [key: string]: unknown;
}

export interface RiskAppetiteEntry {
  category: string;
  maxResidualScore: number;
  acceptanceRequiresRole: string;
  reviewCadenceDays: number;
  appetiteLevel?: 'averse' | 'minimal' | 'cautious' | 'flexible' | 'open';
  updatedAt?: string;
}

export interface AuthorityMatrixRule {
  ruleId?: string;
  decisionType: string;
  minCriticality: string;
  requiredApproverRole: string;
  escalationTimeoutHours: number;
}

export interface GateValidationRequest {
  tenantId: string;
  gateType: 'release' | 'vendor' | 'raci' | 'custom';
  subjectId: string;
  subjectName?: string;
  requestedBy: string;
  controlKeys?: string[];
  details?: Record<string, unknown>;
}

export interface GateValidationResult {
  allowed: boolean;
  gateType: string;
  reason: string;
  overrideAvailable?: boolean;
  details?: Record<string, unknown>;
  blockedControls?: string[];
  [key: string]: unknown;
}

export interface GovernanceConstitution {
  riskAppetite: RiskAppetiteEntry[];
  authorityMatrix: AuthorityMatrixRule[];
  escalationThresholds: Array<Record<string, unknown>>;
  updatedAt?: string;
}

export type ControlLifecycleState =
  | 'design' | 'draft' | 'under_review' | 'approved'
  | 'effective' | 'deprecated' | 'archived';

export type MappingRelationship =
  | 'equivalent' | 'partial' | 'related' | 'derived_from';

export interface UCFControl {
  controlId: string;
  code: string;
  objectiveEn: string;
  objectiveAr: string;
  activityEn: string;
  activityAr: string;
  owner: string;
  frequency: string;
  evidenceRequirements: string[];
  testSteps: string[];
  exceptionRules: string[];
  mappings: CrosswalkMapping[];
  lifecycleState: ControlLifecycleState;
}

export interface CrosswalkMapping {
  mappingId: string;
  sourceControlId: string;
  targetRequirementId: string;
  relationship: MappingRelationship;
  confidence: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export type SourceSystemType =
  | 'siem' | 'iam' | 'itsm' | 'cmdb' | 'vuln'
  | 'outlook' | 'sharepoint' | 'teams' | 'onedrive'
  | 'google_drive' | 'jira' | 'servicenow'
  | 'splunk' | 'elastic' | 'crowdstrike'
  | 'aws' | 'azure' | 'gcp'
  | string;

export type ConnectorStatus = 'healthy' | 'degraded' | 'failed';

export interface AuthToken {
  token: string;
  expiresAt: string;
  [key: string]: unknown;
}

export interface ConnectorConfig {
  connectorId: string;
  connectorType?: string;
  credentials: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
  };
  [key: string]: unknown;
}

export interface ConnectorHealth {
  connectorId: string;
  status: ConnectorStatus;
  lastSuccessAt: string | null;
  failureCount: number;
  dataFreshnessMinutes: number;
}

export interface ExtractionQuery {
  criteria: Record<string, unknown>;
  dateRange?: {
    from?: string;
    to?: string;
  };
  [key: string]: unknown;
}

export interface RawEvidence {
  sourceId: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface EvidenceSubmission {
  controlId: string;
  evidenceType: string;
  sourceSystem: string;
  collectionTimestamp: string;
  connectorVersion: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CCMCycleResult {
  tenantId: string;
  controlsEvaluated: number;
  staleControls: number;
  escalationsTriggered: number;
  riskRecalculated: boolean;
  cycleMs: number;
  completedAt: string;
}

export interface RiskScoringModel {
  modelId: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  description?: string;
  dimensions: RiskDimension[];
  formula: RiskFormula;
  active?: boolean;
  thresholds?: Record<string, number>;
  zoneDefinitions?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiskDimension {
  dimensionId?: string;
  name: string;
  weight: number;
  minValue?: number;
  maxValue?: number;
  scaleType?: 'linear' | 'logarithmic' | 'exponential';
  scale?: { min: number; max: number };
}

export type RiskFormula = string | {
  type: 'multiplicative' | 'additive' | 'weighted_average' | 'custom';
  expression?: string;
  parameters?: Record<string, number>;
};

export interface EvidenceCatalogEntry {
  catalogId?: string;
  controlId: string;
  evidenceType: string;
  sourceSystem?: string;
  frequency?: EvidenceFrequency | string;
  namingStandard?: string;
  requiredFormat?: string;
  retentionDays?: number;
  attachRole?: string;
  approveRole?: string;
  qualityGates?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EvidenceFrequency =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  | 'semi_annual' | 'annual' | 'on_demand' | 'continuous';

export interface QualityGateResult {
  passed: boolean;
  gateId?: string;
  gateName?: string;
  score?: number;
  threshold?: number;
  failures: QualityGateFailure[];
  evaluatedAt?: string;
}

export interface QualityGateFailure {
  field?: string;
  rule: string;
  expected?: string;
  actual?: string;
  severity?: 'error' | 'warning';
  message?: string;
}

export type AIStepTriggerReason = 'scheduled' | 'event' | 'manual' | 'escalation' | string;
export interface AIAgentDefinition { agentCode?: string; name?: string; status?: AIAgentStatusValue; capabilities?: string[]; autonomyLevel?: AutonomyLevel; [k: string]: unknown; }
export interface AIAgentUser { userId?: string; agentCode?: string; role?: string; assignedAt?: string; [k: string]: unknown; }
export type AIAgentStatusValue = 'active' | 'paused' | 'disabled' | 'error' | string;
export interface AIAgentStatusLog { agentCode?: string; previousStatus?: string; newStatus?: string; changedBy?: string; changedAt?: string; reason?: string; [k: string]: unknown; }
export interface TeamRole { roleId?: string; roleName?: string; roleNameAr?: string; teamId?: string; permissions?: string[]; [k: string]: unknown; }
export interface TelemetrySignal { signalId?: string; type?: TelemetrySignalType; source?: string; value?: number; timestamp?: string; metadata?: Record<string, unknown>; [k: string]: unknown; }
export type TelemetrySignalType = 'metric' | 'event' | 'log' | 'trace' | string;
export type ThreatProbability = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain' | string;
export interface ExceptionRecord { exceptionId?: string; entityType?: string; entityId?: string; reason?: string; status?: ExceptionStatus; approvedBy?: string; expiresAt?: string; [k: string]: unknown; }
export type RiskImpactLevel = 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic' | string;
export type ExceptionStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked' | string;
export interface ApprovalRecord { approvalId?: string; entityType?: string; entityId?: string; requestedBy?: string; approvedBy?: string; status?: string; decidedAt?: string; [k: string]: unknown; }
export interface ContentPackManifest { packCode?: string; name?: string; version?: string; modules?: string[]; templates?: string[]; seeds?: string[]; [k: string]: unknown; }
export type CadencePeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | string;
export interface AssessmentTemplate { templateId?: string; name?: string; frameworkCode?: string; questionCount?: number; version?: string; [k: string]: unknown; }
export interface AssessmentQuestion { questionId?: string; text?: string; textAr?: string; category?: string; weight?: number; responseType?: string; [k: string]: unknown; }
export type ScoringMethodology = 'weighted_average' | 'simple_average' | 'maturity_model' | 'risk_based' | string;
export interface GeneratedTask { taskId?: string; title?: string; moduleCode?: string; assignee?: string; dueDate?: string; status?: string; priority?: string; [k: string]: unknown; }
export interface ContentPackInstallation { installId?: string; packCode?: string; tenantId?: string; installedAt?: string; installedBy?: string; status?: string; [k: string]: unknown; }
export interface RoPAEntry { entryId?: string; processingActivity?: string; legalBasis?: string; dataCategories?: string[]; retentionPeriod?: string; [k: string]: unknown; }
export interface ConsentRecord { consentId?: string; userId?: string; consentType?: string; granted?: boolean; grantedAt?: string; expiresAt?: string; [k: string]: unknown; }
export interface AIStepExecution { executionId?: string; stepId?: string; agentCode?: string; status?: string; startedAt?: string; completedAt?: string; output?: Record<string, unknown>; [k: string]: unknown; }
export interface StepGuidance { stepId?: string; guidanceText?: string; guidanceTextAr?: string; links?: string[]; [k: string]: unknown; }
export interface StepAutofill { stepId?: string; fieldId?: string; suggestedValue?: unknown; confidence?: number; source?: string; [k: string]: unknown; }
export interface AutonomousWorkflowConfig { workflowId?: string; autonomyLevel?: AutonomyLevel; requiresApproval?: boolean; maxRetries?: number; [k: string]: unknown; }
export type AutonomyLevel = 'human_only' | 'ai_assisted' | 'ai_copilot' | 'ai_autonomous' | string;
export type AbsenceStatus = 'present' | 'absent' | 'on_leave' | 'delegated' | string;
export interface WorkflowNotificationConfig { workflowId?: string; channel?: string; recipients?: string[]; triggers?: string[]; [k: string]: unknown; }
