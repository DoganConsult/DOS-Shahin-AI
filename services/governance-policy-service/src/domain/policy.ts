import type { FieldClassification } from './module';

export interface DataRetentionPolicy {
  retentionDays: number;
  archiveAfterDays: number;
  purgeStrategy: 'soft_delete' | 'archive' | 'hard_delete';
  piiFields?: string[];
  legalHoldSupported?: boolean;
  legalHoldField?: string | null;
}

export interface FieldLevelRestriction {
  field: string;
  visibleToRoles: string[];
}

export interface AccessScopePolicy {
  defaultVisibility: 'team' | 'department' | 'org' | 'global';
  rowLevelSecurity: boolean;
  fieldLevelRestrictions: FieldLevelRestriction[];
}

export interface AutomationGuardrails {
  autoApprovable: string[];
  requireHumanApproval: string[];
  maxAutoActionsPerHour: number;
}

export interface AiGuardrails {
  allowedAiActions: string[];
  blockedAiActions: string[];
  requireHumanReview: string[];
  maxAiActionsPerHour: number;
  promptInjectionProtection: boolean;
  outputValidation: boolean;
}

export interface DataResidencyPolicy {
  allowedRegions: string[];
  defaultRegion: string;
  crossBorderTransferAllowed: boolean;
  crossBorderApprovalRequired: boolean;
}

export interface ExportImportGuardrails {
  exportAllowed: boolean;
  exportFormats: string[];
  exportRequiresApproval: boolean;
  exportApproverRole: string | null;
  importAllowed: boolean;
  importValidationRequired: boolean;
  externalSharingAllowed: boolean;
  externalSharingRoles: string[];
}

export interface EvidenceRequirements {
  requiredForStatusChanges: string[];
  requiredForApprovals: boolean;
  minimumEvidenceCount: number;
  allowedEvidenceTypes: string[];
}

export interface AuditLoggingPolicy {
  logAllReads: boolean;
  logAllWrites: boolean;
  logFieldChanges: boolean;
  sensitiveFieldsRedacted: boolean;
  retentionDays: number;
}

export interface FieldSensitivityEntry {
  field: string;
  classification: FieldClassification;
  maskInLogs: boolean;
  encryptAtRest: boolean;
}

export interface LifecycleRules {
  requiredModules: string[];
  optionalEnhancements: string[];
}

export interface ModulePolicy {
  moduleCode: string;
  dataRetention?: DataRetentionPolicy;
  accessScope?: AccessScopePolicy;
  automationGuardrails?: AutomationGuardrails;
  aiGuardrails?: AiGuardrails;
  dataResidency?: DataResidencyPolicy;
  exportImport?: ExportImportGuardrails;
  evidenceRequirements?: EvidenceRequirements;
  auditLogging?: AuditLoggingPolicy;
  fieldSensitivity?: FieldSensitivityEntry[];
  lifecycleRules?: LifecycleRules;
}
