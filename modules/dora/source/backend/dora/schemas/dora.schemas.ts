import { z } from 'zod';
import {
  paginationQuery,
  statusFilter,
  bulkIdsBody,
  grcSeverity as _grcSeverity,
  grcConfidence as _grcConfidence,
  grcJsonMetadata as _grcJsonMetadata,
  grcSanitizedText as _grcSanitizedText,
} from '../../../schemas/common.schemas';

export const createIctAssetBody = z.object({
  name: z.string().min(1).max(500),
  assetType: z.string().min(1).max(60).default('hardware'),
  criticality: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  vendor: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  owner_id: z.string().max(64).optional(),
  network_zone: z.string().max(60).optional(),
  data_classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  third_party_provider: z.string().max(255).optional(),
  contract_ref: z.string().max(120).optional(),
});

export const updateIctAssetBody = createIctAssetBody.partial().extend({
  status: z.enum(['active', 'inactive', 'decommissioned', 'under_review']).optional(),
});

export const listIctAssetsQuery = paginationQuery.merge(statusFilter).extend({
  criticality: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  asset_type: z.string().optional(),
  vendor: z.string().optional(),
});

export const createResilienceTestBody = z.object({
  title: z.string().min(1).max(500),
  testType: z.string().min(1).max(60).default('scenario'),
  scope: z.string().min(1).max(255).default('full'),
  scheduledDate: z.string().datetime({ offset: true }).optional(),
  assetIds: z.array(z.string().uuid()).optional(),
  methodology: z.string().max(120).optional(),
  test_plan: z.record(z.string(), z.unknown()).optional(),
});

export const updateResilienceTestBody = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
  result: z.enum(['pass', 'partial_pass', 'fail', 'inconclusive']).optional(),
  results_summary: z.record(z.string(), z.unknown()).optional(),
  remediation_plan: z.record(z.string(), z.unknown()).optional(),
  findings_count: z.coerce.number().int().min(0).optional(),
});

export const createMajorIncidentBody = z.object({
  title: z.string().min(1).max(500),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('high'),
  classification: z.string().min(1).max(60).default('ict_disruption'),
  root_cause: z.string().max(5000).optional(),
  affected_users_count: z.coerce.number().int().min(0).optional(),
  financial_impact: z.coerce.number().min(0).optional(),
  data_loss: z.boolean().optional(),
  cross_border: z.boolean().optional(),
  assignee_id: z.string().max(64).optional(),
});

export const updateMajorIncidentBody = createMajorIncidentBody.partial().extend({
  status: z.enum(['detected', 'investigating', 'containing', 'resolved', 'closed']).optional(),
  reported_to_authority: z.boolean().optional(),
  authority_ref: z.string().max(120).optional(),
  lessons_learned: z.string().max(10000).optional(),
});

export const createThreatIntelBody = z.object({
  source: z.string().min(1).max(255),
  threat_type: z.string().min(1).max(60).default('generic'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  description: z.string().min(1).max(10000),
  tlp_classification: z.enum(['white', 'green', 'amber', 'red']).default('amber'),
  confidence_score: z.coerce.number().min(0).max(1).optional(),
  indicators: z.array(z.record(z.string(), z.unknown())).optional(),
  recommended_actions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const acknowledgeThreatIntelBody = z.object({
  acknowledged: z.boolean(),
});

export const createBackupConfigBody = z.object({
  asset_id: z.string().uuid().optional(),
  backup_type: z.enum(['full', 'incremental', 'differential', 'snapshot']).default('full'),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  retention_days: z.coerce.number().int().min(1).max(3650).default(90),
  encryption_enabled: z.boolean().default(true),
  storage_location: z.string().max(255).optional(),
  offsite_copy: z.boolean().default(false),
  rpo_hours: z.coerce.number().min(0).optional(),
  rto_hours: z.coerce.number().min(0).optional(),
});

export const updateBackupConfigBody = createBackupConfigBody.partial().extend({
  status: z.enum(['active', 'inactive', 'testing']).optional(),
  last_restore_test_result: z.enum(['pass', 'fail', 'partial']).optional(),
});

export const createThirdPartyProviderBody = z.object({
  provider_name: z.string().min(1).max(500),
  provider_type: z.string().max(60).default('cloud_service'),
  jurisdiction: z.string().max(120).optional(),
  criticality: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  services_provided: z.array(z.string()).optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  exit_strategy: z.string().max(10000).optional(),
  substitutability: z.enum(['low', 'medium', 'high']).default('medium'),
  subcontractors: z.array(z.record(z.string(), z.unknown())).optional(),
  audit_rights: z.boolean().default(false),
  last_audit_date: z.string().optional(),
  risk_assessment: z.record(z.string(), z.unknown()).optional(),
  compliance_status: z.enum(['pending_review', 'compliant', 'non_compliant', 'under_review']).default('pending_review'),
  owner_id: z.string().max(64).optional(),
});

export const updateThirdPartyProviderBody = createThirdPartyProviderBody.partial();

export const listThirdPartyProvidersQuery = paginationQuery.merge(statusFilter).extend({
  criticality: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  provider_type: z.string().optional(),
  compliance_status: z.string().optional(),
});

export const bulkDeleteBody = bulkIdsBody;

// ── Auto-generated validation schemas (enterprise hardening) ──

export const createIctAssetsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateIctAssetsBody = createIctAssetsBody.partial();

export const createResilienceTestsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateResilienceTestsBody = createResilienceTestsBody.partial();

export const createMajorIncidentsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMajorIncidentsBody = createMajorIncidentsBody.partial();

export const updateAcknowledgeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createBackupConfigsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBackupConfigsBody = createBackupConfigsBody.partial();

export const createThirdPartyProvidersBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateThirdPartyProvidersBody = createThirdPartyProvidersBody.partial();

export const createObligationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateObligationsBody = createObligationsBody.partial();

export const createMappingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createFrameworksBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createControlsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTransitionBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRegulatorySummaryBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createGapNarrationBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEvidenceSufficiencyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSettingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

