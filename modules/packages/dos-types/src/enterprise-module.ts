/**
 * Enterprise Module Standards - Enhanced Module Manifest
 * 
 * Extends the base ModuleManifest with all 17 enterprise-grade standards
 * 
 * @owner platform
 * @since 2026-04-10
 */

import type { ModuleManifest } from './module';

export interface EnterpriseModuleManifest extends ModuleManifest {
  // Enhanced ownership and boundary
  businessPurpose: string;
  owningTeam: string;
  owningTeamContact: string;
  dataOwnershipBoundary: string;
  permissionBoundary: string;
  hiddenDependencies?: string[]; // Should be empty for enterprise compliance

  // Enhanced canonical identity
  healthEndpoint?: string;
  metricsEndpoint?: string;
  tracingEnabled: boolean;
  auditEnabled: boolean;

  // API contract specifics
  apiVersion: string;
  openApiSpecPath?: string;
  requestSchemasPath?: string;
  responseSchemasPath?: string;
  errorSchemasPath?: string;

  // Security specifics
  defaultAuthRequired: boolean;
  adminRouteBase?: string;
  rateLimitingEnabled: boolean;
  inputSanitizationEnabled: boolean;
  auditTrailEnabled: boolean;

  // Data integrity specifics
  migrationPath?: string;
  idempotencyStrategy?: 'optimistic_locking' | 'version_check' | 'business_key' | 'none';
  tenantIsolationEnabled: boolean;
  auditFields: AuditFieldConfig[];

  // Error handling specifics
  domainErrorTypes?: string[];
  errorTranslationEnabled: boolean;
  structuredLoggingEnabled: boolean;
  retryPolicy?: RetryPolicy;

  // Observability specifics
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  correlationIdEnabled: boolean;
  metricsEnabled: boolean;
  tracingSamplingRate?: number;
  healthChecks: HealthCheck[];

  // Testing specifics
  testCoverageThreshold?: number;
  integrationTestPath?: string;
  e2eTestPath?: string;
  performanceTestPath?: string;
  securityTestPath?: string;

  // Resilience specifics
  externalTimeouts?: Record<string, number>;
  circuitBreakerEnabled: boolean;
  gracefulDegradationEnabled: boolean;
  outboxPatternEnabled: boolean;

  // Event discipline specifics
  eventSchemaPath?: string;
  eventRetryPolicy?: EventRetryPolicy;
  idempotencyConfig?: IdempotencyConfig;

  // Frontend parity specifics
  frontendRouteBase?: string;
  permissionAwareNav: boolean;
  i18nEnabled: boolean;
  loadingStatesConfig?: LoadingStatesConfig;

  // Configuration specifics
  requiredEnvVars?: string[];
  optionalEnvVars?: string[];
  featureFlagsPath?: string;
  configSchemaPath?: string;
  tenantConfigEnabled: boolean;

  // Documentation specifics
  documentationPath?: string;
  apiDocsPath?: string;
  runbookPath?: string;
  operationalNotesPath?: string;

  // AI governance specifics (if aiEnabled)
  aiGovernance?: AiGovernanceConfig;
}

export interface AuditFieldConfig {
  fieldName: string;
  fieldType: 'string' | 'uuid' | 'timestamp' | 'json';
  required: boolean;
  autoPopulated: boolean;
  description: string;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface HealthCheck {
  name: string;
  description: string;
  critical: boolean;
  timeoutMs: number;
  checkFunction: string; // Reference to health check function
}

export interface EventRetryPolicy {
  maxRetries: number;
  delayMs: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  deadLetterEnabled: boolean;
  deadLetterTopic?: string;
}

export interface IdempotencyConfig {
  enabled: boolean;
  keyGenerator: string; // Reference to key generator function
  storage: 'memory' | 'redis' | 'database';
  ttlSeconds?: number;
}

export interface LoadingStatesConfig {
  defaultLoadingMessage: { en: string; ar: string };
  defaultErrorMessage: { en: string; ar: string };
  defaultEmptyMessage: { en: string; ar: string };
}

export interface AiGovernanceConfig {
  modelAllowlist: string[];
  promptValidationEnabled: boolean;
  promptInjectionGuardEnabled: boolean;
  confidenceThreshold: number;
  humanInTheLoopRequired: boolean;
  humanInTheLoopActions: string[];
  outputSafetyScanning: boolean;
  auditModelDecisions: boolean;
  timeoutSeconds: number;
  fallbackBehavior: 'fail_closed' | 'fail_open' | 'graceful_degradation';
  nonAutonomousActions: string[];
}

export interface ModuleComplianceReport {
  moduleCode: string;
  timestamp: string;
  overallScore: number;
  compliant: boolean;
  categoryScores: Record<string, number>;
  gaps: ComplianceGap[];
  recommendations: string[];
  nextReviewDate: string;
}

export interface ComplianceGap {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  requirement: string;
  actualState: string;
  fixRecommendation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  blockedBy?: string[];
}

export interface EnterpriseModuleTemplate {
  manifest: Partial<EnterpriseModuleManifest>;
  folderStructure: Record<string, string[]>;
  fileTemplates: Record<string, string>;
  securityTemplates: Record<string, string>;
  testTemplates: Record<string, string>;
  documentationTemplates: Record<string, string>;
}

// Standard enterprise module templates
export const ENTERPRISE_MODULE_TEMPLATES = {
  domain: 'domain',
  platform: 'platform',
  microservice: 'microservice',
  ai_enabled: 'ai_enabled'
} as const;

export type EnterpriseModuleTemplateType = typeof ENTERPRISE_MODULE_TEMPLATES[keyof typeof ENTERPRISE_MODULE_TEMPLATES];
