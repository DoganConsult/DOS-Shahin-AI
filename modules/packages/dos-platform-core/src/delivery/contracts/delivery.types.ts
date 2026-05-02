export type ReleaseStatus =
  | 'draft'
  | 'staged'
  | 'canary'
  | 'rolling'
  | 'released'
  | 'rolled_back'
  | 'cancelled';

export type ReleaseRiskClass = 'low' | 'medium' | 'high' | 'critical';

export type DeploymentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back';

export type RollbackStatus = 'initiated' | 'in_progress' | 'completed' | 'failed';

export type MigrationType = 'schema' | 'data' | 'registry' | 'config';

export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type CompatibilityImpact = 'none' | 'low' | 'medium' | 'high';

export type QualityGateStatus = 'pending' | 'passing' | 'failing' | 'skipped';

export type FeatureGateState = 'off' | 'on' | 'canary' | 'percentage';

export interface ReleaseDefinition {
  releaseId: string;
  releaseCode: string;
  version: string;
  riskClass: ReleaseRiskClass;
  status: ReleaseStatus;
  affectedLayers: string[];
  affectedProducts: string[];
  affectedModules: string[];
  migrations: string[];
  approvalsRequired: string[];
  approvalsMet: string[];
  rollbackPlanId: string | null;
  smokeTestInventory: string[];
  supportOwner: string | null;
  cutoverWindowStart: string | null;
  cutoverWindowEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentRecord {
  deploymentId: string;
  releaseId: string;
  tenantId: string;
  environment: string;
  status: DeploymentStatus;
  deployedBy: string;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  rollbackId: string | null;
}

export interface RollbackRecord {
  rollbackId: string;
  deploymentId: string;
  releaseId: string;
  tenantId: string;
  status: RollbackStatus;
  triggeredBy: string;
  triggerReason: string;
  initiatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  dataIntegrityNotes: string | null;
}

export interface MigrationRecord {
  migrationId: string;
  releaseId: string | null;
  migrationType: MigrationType;
  status: MigrationStatus;
  reversible: boolean;
  compatibilityImpact: CompatibilityImpact;
  affectedSchemas: string[];
  affectedTables: string[];
  validationSteps: string[];
  rollbackNotes: string | null;
  tenantImpact: string | null;
  irreversibleApprovalId: string | null;
  tenantId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface QualityGate {
  gateId: string;
  gateCode: string;
  releaseId: string;
  category: 'unit' | 'integration' | 'contract' | 'migration' | 'access' | 'smoke' | 'performance' | 'rollback';
  status: QualityGateStatus;
  owner: string;
  passThreshold: number | null;
  actualValue: number | null;
  notes: string | null;
  evaluatedAt: string | null;
  createdAt: string;
}

export interface FeatureGate {
  gateCode: string;
  label: string;
  state: FeatureGateState;
  rolloutPercent: number;
  allowedRoles: string[];
  allowedTenants: string[];
  ownerLayer: string;
  ownerCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryHealthSnapshot {
  snapshotAt: string;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  rolledBackDeployments: number;
  successRate: number;
  rollbackRate: number;
  activeReleases: number;
  pendingMigrations: number;
  failedMigrations: number;
}

export interface CutoverPlan {
  cutoverId: string;
  releaseId: string;
  scope: string;
  owner: string;
  executionSequence: string[];
  checkpoints: string[];
  noGoCriteria: string[];
  rollbackTriggers: string[];
  communicationPath: string;
  monitoringWindowMinutes: number;
  createdAt: string;
}

export interface HandoverLock {
  lockId: string;
  releaseId: string;
  asBuiltUpdated: boolean;
  migrationsVerified: boolean;
  releaseNotesFinalized: boolean;
  knownRisksUpdated: boolean;
  operationalDashboardsConfirmed: boolean;
  supportOwnerConfirmed: boolean;
  cutoverOutcome: string | null;
  rollbackOutcome: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
}
