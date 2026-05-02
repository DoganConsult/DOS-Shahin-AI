// ============================================
// Pack Registry Types — Pack System v2
// ============================================

/** Supported pack types (layers) */
export type PackType = 'base' | 'country' | 'sector' | 'regulator' | 'maturity' | 'integration' | 'demo' | 'module' | 'standard';

/** Pack layer ordering — lower number = installed first */
export const PACK_LAYER_ORDER: Record<PackType, number> = {
  base: 0,
  country: 100,
  sector: 200,
  regulator: 300,
  standard: 350,
  maturity: 400,
  module: 450,
  integration: 500,
  demo: 600,
};

/** Supported artifact types within a pack */
export type ArtifactType =
  | 'frameworks' | 'controls' | 'evidence' | 'risks' | 'workflows'
  | 'dashboards' | 'widgets' | 'navigation' | 'teams' | 'raci'
  | 'automation_rules' | 'feature_flags' | 'reference_data' | 'sla_config'
  | 'roles' | 'policies' | 'assessments' | 'audit_templates' | 'incidents'
  | 'vendor_risk' | 'governance_bodies' | 'scoring_policies'
  | 'notification_templates' | 'report_templates' | 'checklist'
  | 'sample_data' | 'integration_stubs' | 'cross_mappings';

/** Framework type classification (from GRC standards research) */
export type FrameworkType = 'certification' | 'regulation' | 'voluntary' | 'guidance';

// ─── Manifest Schema ────────────────────────────────────────────

export interface PackManifest {
  code: string;
  version: string;
  type: PackType;
  layer?: number;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  depends_on: string[];
  applies_to: PackAppliesTo;
  compat?: PackCompat;
  install_order?: number;
  idempotent?: boolean;
  framework_type?: FrameworkType;
  audit_cadence?: 'continuous' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | '3_year';
  artifacts: Record<string, string>;  // artifact_type -> filename
}

export interface PackAppliesTo {
  countries?: string[];
  industries?: string[];    // ISIC letter codes
  regulators?: string[];
  sectors?: string[];       // alias for industries
  modules?: string[];
}

export interface PackCompat {
  min_platform_version?: string;
  required_modules?: string[];
}

// ─── DB Row Types ────────────────────────────────────────────

export interface PackRegistryRow {
  pack_id: string;
  code: string;
  version: string;
  pack_type: PackType;
  pack_layer: number;
  hash: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  depends_on: string[];
  applies_to: PackAppliesTo;
  compat: PackCompat;
  manifest_json: PackManifest;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackArtifactRow {
  artifact_id: string;
  pack_id: string;
  artifact_type: ArtifactType;
  content_json: any;
  item_count: number;
  checksum: string;
  created_at: string;
}

export interface TenantPackInstallationRow {
  installation_id: string;
  tenant_id: string;
  pack_code: string;
  pack_version: string;
  pack_hash: string;
  status: 'pending' | 'installing' | 'installed' | 'upgrading' | 'failed' | 'uninstalled' | 'rollback';
  artifact_counts: Record<string, number>;
  installed_at: string;
  installed_by: string;
  install_log: unknown[];
  install_duration_ms: number | null;
}

export interface ProvisioningPlanRow {
  plan_id: string;
  session_id: string;
  tenant_id: string | null;
  input_answers: Record<string, unknown>;
  selected_packs: PackSelection[];
  excluded_packs: Array<{ code: string; reason: string }>;
  impact_summary: ImpactSummary;
  plan_json: any;
  status: 'draft' | 'previewing' | 'approved' | 'rejected' | 'executing' | 'executed' | 'failed';
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  execution_log: unknown[];
  created_at: string;
}

// ─── Service DTOs ────────────────────────────────────────────

export interface PackSelection {
  code: string;
  version: string;
  reason: string;
  layer: number;
  type: PackType;
}

export interface ImpactSummary {
  total_packs: number;
  total_frameworks: number;
  total_controls: number;
  total_risks: number;
  total_evidence: number;
  total_workflows: number;
  total_teams: number;
  total_roles: number;
  total_dashboards: number;
  total_nav_items: number;
  total_feature_flags: number;
  total_automation_rules: number;
  total_sla_tiers: number;
  per_pack: Record<string, Record<string, number>>;
}

export interface PackFilter {
  type?: PackType;
  is_active?: boolean;
  applies_to_country?: string;
  applies_to_industry?: string;
  applies_to_regulator?: string;
}

export interface SyncResult {
  added: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export interface ResolvedPack {
  code: string;
  version: string;
  reason: string;
  manifest: PackManifest;
}

export interface PackInstallProgress {
  pack_code: string;
  status: 'pending' | 'installing' | 'installed' | 'failed';
  artifacts_installed: number;
  artifacts_total: number;
  current_artifact?: string;
  error?: string;
}
