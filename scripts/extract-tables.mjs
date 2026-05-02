#!/usr/bin/env node
/**
 * extract-tables.mjs
 *
 * Scans the legacy monolith's SQL migration files and ownership contracts
 * to produce a real table-ownership-map.json for Phase A.
 *
 * Sources:
 *   1. /home/Dr-Dogan-AGRC-OS/backend/src/migrations/master/*.sql   (master-schema tables)
 *   2. /home/Dr-Dogan-AGRC-OS/backend/src/migrations/tenant/*.sql   (tenant-schema tables)
 *   3. /home/Dr-Dogan-AGRC-OS/backend/src/migrations/baseline/*.sql (baseline tables)
 *   4. /home/Dr-Dogan-AGRC-OS/backend/db/patches/tenant/*.sql       (advanced domain tables)
 *   5. /home/Dr-Dogan-AGRC-OS/backend/db/patches/public/*.sql       (public reference tables)
 *   6. /home/Dr-Dogan-AGRC-OS/backend/db/patches/both/*.sql         (cross-schema tables)
 *   7. /home/Dr-Dogan-AGRC-OS/backend/migrations/master/*.sql       (additional master)
 *   8. /home/Dr-Dogan-AGRC-OS/backend/migrations/tenant/*.sql       (additional tenant)
 *
 * Ownership resolution:
 *   - ownership-matrix.ts  (32 canonical modules → tiers, service dirs, permission families)
 *   - *.ownership.ts       (46 per-module ownership rules → entity types)
 *   - Table name heuristic  (prefix matching against canonical module codes)
 *   - Migration file name   (e.g., 032_risk_advanced_tables.sql → risk module)
 *
 * Output:
 *   /root/Dogan-Ai OS Platfrom/migration/inventory/table-ownership-map.json
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ── Configuration ───────────────────────────────────────────────────────

const LEGACY_ROOT = '/home/Dr-Dogan-AGRC-OS';
const TARGET_ROOT = '/root/Dogan-Ai OS Platfrom';
const OUTPUT_FILE = join(TARGET_ROOT, 'migration/inventory/table-ownership-map.json');

const SQL_DIRS = [
  join(LEGACY_ROOT, 'backend/src/migrations/master'),
  join(LEGACY_ROOT, 'backend/src/migrations/tenant'),
  join(LEGACY_ROOT, 'backend/src/migrations/baseline'),
  join(LEGACY_ROOT, 'backend/db/patches/tenant'),
  join(LEGACY_ROOT, 'backend/db/patches/public'),
  join(LEGACY_ROOT, 'backend/db/patches/both'),
  join(LEGACY_ROOT, 'backend/migrations/master'),
  join(LEGACY_ROOT, 'backend/migrations/tenant'),
];

// ── Module → Service mapping (from services.registry.json + ownership-matrix.ts) ──

const MODULE_TO_SERVICE = {
  // Platform core
  foundation: 'tenant-service',
  admin: 'tenant-service',
  team: 'tenant-service',
  onboarding: 'onboarding-service',
  'module-onboarding': 'onboarding-service',
  provisioning: 'tenant-service',
  bootstrap: 'tenant-service',
  navigation: 'tenant-service',
  workflow: 'workflow-service',
  notification: 'notification-service',
  inbox: 'notification-service',

  // Platform AI
  ai: 'ai-gateway-service',
  'ai-governance': 'ai-gateway-service',
  'agrc-engine': 'ai-gateway-service',
  mcp: 'ai-gateway-service',

  // Auth / DAuth
  auth: 'auth-service',
  dauth: 'auth-service',
  identity: 'auth-service',
  session: 'auth-service',
  access: 'auth-service',
  delegation: 'auth-service',
  sod: 'auth-service',

  // User
  user: 'user-service',
  person: 'user-service',
  profile: 'user-service',

  // Product AGRC (Shahin)
  risk: 'risk-incident-service',
  compliance: 'compliance-controls-service',
  controls: 'compliance-controls-service',
  exception: 'compliance-controls-service',
  policy: 'governance-policy-service',
  governance: 'governance-policy-service',
  'governance-ai': 'governance-policy-service',
  'governance-os': 'governance-policy-service',
  evidence: 'evidence-audit-reporting-service',
  audit: 'evidence-audit-reporting-service',
  reporting: 'evidence-audit-reporting-service',
  analytics: 'evidence-audit-reporting-service',
  dashboard: 'evidence-audit-reporting-service',
  widgets: 'evidence-audit-reporting-service',
  incident: 'risk-incident-service',
  bcp: 'risk-incident-service',
  playbook: 'risk-incident-service',
  vendor: 'risk-incident-service',
  fitch: 'risk-incident-service',
  asset: 'risk-incident-service',
  remediation: 'risk-incident-service',
  action: 'risk-incident-service',
  issues: 'risk-incident-service',
  training: 'compliance-controls-service',
  qiyas: 'compliance-controls-service',
  dora: 'compliance-controls-service',
  privacy: 'compliance-controls-service',
  records: 'evidence-audit-reporting-service',
  knowledge: 'compliance-controls-service',
  'local-knowledge': 'compliance-controls-service',

  // Edge / External
  integrations: 'gateway',
  connectors: 'gateway',
  portals: 'gateway',
  mobile: 'notification-service',
  webhooks: 'gateway',

  // Platform ops
  config: 'tenant-service',
  'config-center': 'tenant-service',
  'quality-gate': 'tenant-service',
  'platform-stats': 'tenant-service',
  security: 'auth-service',
  operating: 'tenant-service',
  workspace: 'tenant-service',
};

// ── PII / secrets heuristics ────────────────────────────────────────────

const PII_PATTERNS = [
  'email', 'phone', 'address', 'name', 'ssn', 'personal_id', 'salary',
  'bank_account', 'ip_address', 'user_agent', 'person_', 'password',
  'display_name', 'first_name', 'last_name', 'date_of_birth',
];
const SECRET_PATTERNS = [
  'password', 'token', 'secret', 'key_hash', 'credential', 'api_key',
  'refresh_token', 'mfa_secret', 'encryption_key',
];

// ── Retention heuristics ────────────────────────────────────────────────

const RETENTION_RULES = [
  { pattern: /token|session|attempt|blacklist|reset/, retention: '30d' },
  { pattern: /verification|invitation/, retention: '90d' },
  { pattern: /event_queue|websocket|dlq|cache/, retention: '7d' },
  { pattern: /audit|sod_conflict|security_event|compliance/, retention: '7y' },
  { pattern: /log|history|metric|snapshot|activity/, retention: '1y' },
  { pattern: /workflow_instance|approval|attestation/, retention: '7y' },
];

// ── SQL Parsing ─────────────────────────────────────────────────────────

function listSqlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => join(dir, f));
}

/**
 * Parse a single SQL file and extract table definitions.
 * Returns array of { tableName, columns[], schema, sourceFile, indexes[], foreignKeys[] }
 */
function parseCreateTables(filePath) {
  const sql = readFileSync(filePath, 'utf-8');
  const fileName = basename(filePath);
  const results = [];

  // Match CREATE TABLE blocks
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:__TENANT_SCHEMA__|"\$\{schema\}"|\$\{schema\})\.)?\s*"?([a-z_][a-z0-9_]*)"?\s*\(([\s\S]*?)(?:\)\s*;|\)\s*$)/gim;

  let match;
  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase().trim();
    const bodyBlock = match[2];

    // Determine schema from context
    const linesBefore = sql.substring(Math.max(0, match.index - 200), match.index);
    const isTenantSchema =
      linesBefore.includes('__TENANT_SCHEMA__') ||
      linesBefore.includes('${schema}') ||
      filePath.includes('/tenant/') ||
      match[0].includes('__TENANT_SCHEMA__') ||
      match[0].includes('${schema}');
    const schema = isTenantSchema ? 'tenant' : 'public';

    // Parse columns from body
    const columns = parseColumns(bodyBlock);

    // Parse constraints
    const primaryKey = parsePrimaryKey(bodyBlock);
    const foreignKeys = parseForeignKeys(bodyBlock);

    results.push({
      tableName,
      columns,
      schema,
      sourceFile: fileName,
      primaryKey,
      foreignKeys,
    });
  }

  return results;
}

function parseColumns(body) {
  const columns = [];
  const lines = body.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip constraints, indexes, empty lines, comments
    if (!line || line.startsWith('--') || line.startsWith('/*')) continue;
    if (/^\s*(PRIMARY\s+KEY|UNIQUE|CHECK|CONSTRAINT|FOREIGN\s+KEY|CREATE\s+INDEX)/i.test(line)) continue;
    if (/^\)/.test(line)) continue;

    // Match: column_name TYPE [NOT NULL] [DEFAULT ...] [constraints]
    const colMatch = line.match(/^"?([a-z_][a-z0-9_]*)"?\s+([A-Z][A-Z0-9_(),.  ]*?)(?:\s+(NOT\s+NULL|NULL))?(?:\s+DEFAULT\s+(.+?))?(?:\s*,?\s*$)/i);
    if (colMatch) {
      const name = colMatch[1].toLowerCase();
      const type = colMatch[2].trim().replace(/,\s*$/, '');
      const nullable = colMatch[3] ? !/NOT\s+NULL/i.test(colMatch[3]) : true;
      const defaultVal = colMatch[4] ? colMatch[4].replace(/,\s*$/, '').trim() : null;

      // Skip if type looks like a keyword (constraint leaking through)
      if (/^(PRIMARY|UNIQUE|CHECK|CONSTRAINT|FOREIGN|REFERENCES)/i.test(type)) continue;

      columns.push({ name, type, nullable, default: defaultVal });
    }
  }

  return columns;
}

function parsePrimaryKey(body) {
  // Inline PRIMARY KEY on column
  const inlineMatch = body.match(/(\w+)\s+\w+[^,]*PRIMARY\s+KEY/i);
  if (inlineMatch) return [inlineMatch[1].toLowerCase()];

  // Separate PRIMARY KEY constraint
  const constraintMatch = body.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (constraintMatch) {
    return constraintMatch[1].split(',').map(c => c.trim().replace(/"/g, '').toLowerCase());
  }
  return [];
}

function parseForeignKeys(body) {
  const fks = [];
  const fkRegex = /(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-z_][a-z0-9_.]*)\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi;

  let match;
  while ((match = fkRegex.exec(body)) !== null) {
    fks.push({
      columns: match[1].split(',').map(c => c.trim().replace(/"/g, '').toLowerCase()),
      referencesTable: match[2].replace(/__TENANT_SCHEMA__\./, '').replace(/"/g, '').toLowerCase(),
      referencesColumns: match[3].split(',').map(c => c.trim().replace(/"/g, '').toLowerCase()),
      onDelete: match[4] ? match[4].toUpperCase().replace(/\s+/g, '_') : 'NO_ACTION',
    });
  }

  // Also match inline REFERENCES
  const inlineRefRegex = /(\w+)\s+\w+[^,]*REFERENCES\s+([a-z_][a-z0-9_.]*)\s*\(([^)]+)\)/gi;
  while ((match = inlineRefRegex.exec(body)) !== null) {
    const col = match[1].toLowerCase();
    // Avoid duplicates from constraint-based parsing
    if (!fks.some(fk => fk.columns.includes(col))) {
      fks.push({
        columns: [col],
        referencesTable: match[2].replace(/__TENANT_SCHEMA__\./, '').replace(/"/g, '').toLowerCase(),
        referencesColumns: match[3].split(',').map(c => c.trim().replace(/"/g, '').toLowerCase()),
        onDelete: 'NO_ACTION',
      });
    }
  }

  return fks;
}

// ── Ownership Resolution ────────────────────────────────────────────────

/**
 * Infer which module owns a table, using multiple signals:
 * 1. Migration filename prefix (e.g., 032_risk_advanced_tables.sql → risk)
 * 2. Table name prefix matching canonical modules
 * 3. Foreign key references to known tables
 */
function inferModuleFromTableName(tableName) {
  // Direct prefix matches (longest match wins)
  const prefixes = Object.keys(MODULE_TO_SERVICE).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    const normalized = prefix.replace(/-/g, '_');
    if (tableName.startsWith(normalized + '_') || tableName === normalized) {
      return prefix;
    }
  }

  // Domain-specific heuristics
  const domainHints = [
    { patterns: ['risk_', 'risk_register', 'risk_appetite', 'risk_treatment', 'risk_category', 'risk_score', 'risk_likelihood'], module: 'risk' },
    { patterns: ['compliance_', 'framework', 'control_', 'assertion'], module: 'compliance' },
    { patterns: ['governance_', 'charter', 'committee', 'mandate', 'board_'], module: 'governance' },
    { patterns: ['audit_', 'finding', 'auditor'], module: 'audit' },
    { patterns: ['evidence_', 'attestation'], module: 'evidence' },
    { patterns: ['vendor_', 'fitch_'], module: 'vendor' },
    { patterns: ['incident_', 'near_miss', 'post_incident'], module: 'incident' },
    { patterns: ['bcp_', 'bcm_', 'business_impact', 'crisis_', 'recovery_'], module: 'bcp' },
    { patterns: ['policy_', 'policy_attestation'], module: 'policy' },
    { patterns: ['workflow_', 'approval_', 'process_task', 'process_event'], module: 'workflow' },
    { patterns: ['notification_', 'notification_template', 'notification_delivery'], module: 'notification' },
    { patterns: ['training_', 'phishing_', 'quiz_'], module: 'training' },
    { patterns: ['report_', 'saved_query', 'dashboard_', 'widget_'], module: 'reporting' },
    { patterns: ['analytics_', 'kpi_', 'metric_'], module: 'analytics' },
    { patterns: ['user_', 'person_', 'profile_'], module: 'user' },
    { patterns: ['tenant_', 'workspace_', 'organization_'], module: 'foundation' },
    { patterns: ['module_', 'platform_', 'feature_flag'], module: 'admin' },
    { patterns: ['session_', 'login_', 'token_', 'access_', 'permission_', 'role_', 'delegation_', 'sod_', 'authz_', 'authorization_'], module: 'auth' },
    { patterns: ['ai_', 'agent_', 'agrc_'], module: 'ai' },
    { patterns: ['connector_', 'webhook_', 'inbound_webhook', 'integration_'], module: 'integrations' },
    { patterns: ['action_', 'action_item'], module: 'action' },
    { patterns: ['remediation_', 'capa_'], module: 'remediation' },
    { patterns: ['issue_', 'issues_'], module: 'issues' },
    { patterns: ['exception_'], module: 'exception' },
    { patterns: ['asset_'], module: 'asset' },
    { patterns: ['dora_'], module: 'dora' },
    { patterns: ['privacy_', 'data_subject', 'consent_', 'data_processing'], module: 'privacy' },
    { patterns: ['record_', 'document_', 'retention_'], module: 'records' },
    { patterns: ['qiyas_', 'benchmark_', 'executive_'], module: 'qiyas' },
    { patterns: ['onboarding_'], module: 'onboarding' },
    { patterns: ['journey_'], module: 'onboarding' },
    { patterns: ['navigation_', 'nav_'], module: 'navigation' },
    { patterns: ['search_', 'command_palette'], module: 'admin' },
    { patterns: ['config_center', 'config_'], module: 'config-center' },
    { patterns: ['mobile_', 'push_token'], module: 'mobile' },
    { patterns: ['schema_migration'], module: 'admin' },
    { patterns: ['proactive_', 'leadership_'], module: 'qiyas' },
    { patterns: ['regulatory_', 'ksa_'], module: 'dora' },
    { patterns: ['playbook_'], module: 'bcp' },
    { patterns: ['shadow_'], module: 'ai' },
    { patterns: ['cooperative_', 'squad_', 'raci_'], module: 'workflow' },
    { patterns: ['dos_'], module: 'admin' },
    { patterns: ['pack_', 'content_pack'], module: 'admin' },
    { patterns: ['lookup_'], module: 'admin' },
    { patterns: ['seed_'], module: 'admin' },
    // Additional patterns for unresolved tables
    { patterns: ['org_', 'organization_', 'org_hierarchy', 'org_validation'], module: 'foundation' },
    { patterns: ['business_service', 'business_unit'], module: 'foundation' },
    { patterns: ['custom_field'], module: 'admin' },
    { patterns: ['data_asset', 'data_quality', 'data_sharing', 'data_processing', 'data_mapping', 'data_subject'], module: 'privacy' },
    { patterns: ['dogan_', 'guardian_'], module: 'ai' },
    { patterns: ['effective_user', 'effective_permission'], module: 'auth' },
    { patterns: ['event_trigger', 'event_log'], module: 'workflow' },
    { patterns: ['external_audit'], module: 'audit' },
    { patterns: ['field_rbac'], module: 'auth' },
    { patterns: ['functional_role'], module: 'auth' },
    { patterns: ['grc_'], module: 'compliance' },
    { patterns: ['obligation_'], module: 'compliance' },
    { patterns: ['os_case', 'os_knowledge'], module: 'governance-os' },
    { patterns: ['pipeline_'], module: 'integrations' },
    { patterns: ['vuln_', 'vulnerability_'], module: 'risk' },
    { patterns: ['activated_template', 'template_'], module: 'admin' },
    { patterns: ['activity_'], module: 'notification' },
    { patterns: ['actor_'], module: 'auth' },
    { patterns: ['alert_'], module: 'notification' },
    { patterns: ['code_search'], module: 'admin' },
    { patterns: ['entity_link', 'entity_attachment', 'entity_comment', 'entity_tag'], module: 'admin' },
    { patterns: ['email_template'], module: 'notification' },
    { patterns: ['automation_'], module: 'workflow' },
    { patterns: ['contextual_'], module: 'ai' },
    { patterns: ['inline_'], module: 'admin' },
    { patterns: ['websocket_'], module: 'notification' },
    { patterns: ['command_palette'], module: 'admin' },
    { patterns: ['cross_framework'], module: 'compliance' },
    { patterns: ['tier_'], module: 'foundation' },
    { patterns: ['sector_'], module: 'foundation' },
    { patterns: ['subscription_'], module: 'foundation' },
    { patterns: ['entitlement_'], module: 'foundation' },
    { patterns: ['license_'], module: 'foundation' },
    { patterns: ['maturity_'], module: 'compliance' },
    { patterns: ['objective_'], module: 'governance' },
    { patterns: ['stakeholder_'], module: 'governance' },
    { patterns: ['loss_event'], module: 'risk' },
    { patterns: ['scenario_'], module: 'risk' },
    { patterns: ['emerging_risk'], module: 'risk' },
    { patterns: ['treatment_'], module: 'risk' },
    { patterns: ['gap_'], module: 'compliance' },
    { patterns: ['sanction_'], module: 'compliance' },
    { patterns: ['regulator_'], module: 'dora' },
    { patterns: ['filing_'], module: 'dora' },
    { patterns: ['communication_'], module: 'notification' },
    { patterns: ['calendar_'], module: 'workflow' },
    { patterns: ['sla_'], module: 'workflow' },
    { patterns: ['task_'], module: 'workflow' },
    { patterns: ['job_', 'cron_'], module: 'workflow' },
    { patterns: ['import_', 'export_'], module: 'integrations' },
    { patterns: ['sync_'], module: 'integrations' },
    { patterns: ['api_key', 'api_token'], module: 'auth' },
    { patterns: ['chart_'], module: 'reporting' },
    { patterns: ['kpi_'], module: 'analytics' },
    { patterns: ['scoring_'], module: 'risk' },
    { patterns: ['survey_'], module: 'compliance' },
    { patterns: ['portal_'], module: 'integrations' },
    { patterns: ['register_'], module: 'risk' },
    // Round 3 — remaining unresolved prefixes
    { patterns: ['os_'], module: 'governance-os' },
    { patterns: ['entity_'], module: 'admin' },
    { patterns: ['event_'], module: 'workflow' },
    { patterns: ['ccm_'], module: 'compliance' },
    { patterns: ['project_'], module: 'governance' },
    { patterns: ['iam_'], module: 'auth' },
    { patterns: ['kri_'], module: 'risk' },
    { patterns: ['assessment_', 'assessments'], module: 'compliance' },
    { patterns: ['authority_'], module: 'auth' },
    { patterns: ['change_'], module: 'governance' },
    { patterns: ['cmdb_'], module: 'asset' },
    { patterns: ['csa_'], module: 'compliance' },
    { patterns: ['erp_'], module: 'integrations' },
    { patterns: ['escalation_'], module: 'workflow' },
    { patterns: ['itsm_'], module: 'integrations' },
    { patterns: ['m365_'], module: 'integrations' },
    { patterns: ['member_'], module: 'foundation' },
    { patterns: ['memory_'], module: 'ai' },
    { patterns: ['process_'], module: 'workflow' },
    { patterns: ['product_'], module: 'foundation' },
    { patterns: ['saved_'], module: 'reporting' },
    { patterns: ['siem_'], module: 'integrations' },
    { patterns: ['archetype_'], module: 'auth' },
    { patterns: ['auto_'], module: 'workflow' },
    { patterns: ['automated_'], module: 'ai' },
    { patterns: ['bia_'], module: 'bcp' },
    { patterns: ['cache_'], module: 'admin' },
    { patterns: ['case_'], module: 'incident' },
    { patterns: ['cep_'], module: 'workflow' },
    { patterns: ['component_'], module: 'admin' },
    { patterns: ['cross_'], module: 'compliance' },
    { patterns: ['decision_'], module: 'governance' },
    { patterns: ['engagement_'], module: 'governance-os' },
    { patterns: ['enterprise_'], module: 'auth' },
    { patterns: ['esg_'], module: 'compliance' },
    { patterns: ['ethics_'], module: 'compliance' },
    { patterns: ['external_'], module: 'integrations' },
    { patterns: ['gate_'], module: 'workflow' },
    { patterns: ['handoff_'], module: 'ai' },
    { patterns: ['hitl_'], module: 'ai' },
    { patterns: ['initiative_'], module: 'governance' },
    { patterns: ['lifecycle_'], module: 'admin' },
    { patterns: ['llm_'], module: 'ai' },
    { patterns: ['milestone_'], module: 'governance' },
    { patterns: ['mode_'], module: 'admin' },
    { patterns: ['pdpl_'], module: 'privacy' },
    { patterns: ['prompt_'], module: 'ai' },
    { patterns: ['rcsa_'], module: 'compliance' },
    { patterns: ['responsibility_'], module: 'governance' },
    { patterns: ['roadmap_'], module: 'governance' },
    { patterns: ['route_'], module: 'admin' },
    { patterns: ['strategic_'], module: 'qiyas' },
    { patterns: ['anonymous_'], module: 'compliance' },
    { patterns: ['api_'], module: 'admin' },
    { patterns: ['applications'], module: 'admin' },
    { patterns: ['approved_'], module: 'governance' },
    { patterns: ['approver_'], module: 'workflow' },
    { patterns: ['artifacts'], module: 'evidence' },
    { patterns: ['standard_'], module: 'compliance' },
    { patterns: ['test_'], module: 'compliance' },
    { patterns: ['verification_'], module: 'evidence' },
    { patterns: ['parallel_'], module: 'workflow' },
    { patterns: ['near_miss'], module: 'incident' },
    { patterns: ['root_cause'], module: 'incident' },
    { patterns: ['impact_'], module: 'risk' },
    { patterns: ['inherent_'], module: 'risk' },
    { patterns: ['residual_'], module: 'risk' },
  ];

  for (const hint of domainHints) {
    for (const p of hint.patterns) {
      if (tableName.startsWith(p) || tableName === p.replace(/_$/, '')) {
        return hint.module;
      }
    }
  }

  return null; // unresolved
}

function inferModuleFromFileName(fileName) {
  // e.g., 032_risk_advanced_tables.sql → risk
  const match = fileName.match(/^\d+_([a-z_]+?)(?:_tables|_advanced|_seed|_data|_migration|_repair|_fix|_columns|_indexes|_views)?\.sql$/);
  if (match) {
    const candidate = match[1].replace(/_+$/, '');
    // Check if this maps to a known module
    if (MODULE_TO_SERVICE[candidate]) return candidate;
    // Check variations
    const variations = [
      candidate,
      candidate.replace(/_/g, '-'),
      candidate.replace(/s$/, ''), // depluralize
    ];
    for (const v of variations) {
      if (MODULE_TO_SERVICE[v]) return v;
    }
  }
  return null;
}

// Specific table → module overrides for generic names that can't be resolved by prefix
const TABLE_OVERRIDES = {
  assets: 'asset',
  audits: 'audit',
  workflows: 'workflow',
  risks: 'risk',
  cases: 'incident',
  contracts: 'vendor',
  departments: 'foundation',
  documents: 'records',
  exceptions: 'exception',
  favorites: 'admin',
  invitations: 'auth',
  locations: 'foundation',
  modules: 'admin',
  obligations: 'compliance',
  organizations: 'foundation',
  permissions: 'auth',
  positions: 'foundation',
  processes: 'workflow',
  products: 'foundation',
  projects: 'governance',
  questionnaires: 'compliance',
  requirements: 'compliance',
  responsibilities: 'governance',
  roles: 'auth',
  sections: 'foundation',
  settings: 'admin',
  teams: 'foundation',
  notifications_log: 'notification',
  delegations: 'auth',
  delegated_authorities: 'auth',
  defense_lines: 'compliance',
  closure_reviews: 'audit',
  repeat_findings: 'audit',
  assignment_resolution_log: 'workflow',
  authentication_policies: 'auth',
  autonomous_workflow_config: 'workflow',
  autonomy_progression_log: 'ai',
  blueprint_generation_runs: 'ai',
  breach_reporting_records: 'incident',
  cadence_overrides: 'workflow',
  canonical_requirements: 'compliance',
  co_draft_sessions: 'workflow',
  cockpit_signal: 'ai',
  command_history: 'admin',
  company_profiles: 'foundation',
  compensating_controls: 'compliance',
  conditional_access_grants: 'auth',
  consultant_assignments: 'vendor',
  contract_control_links: 'vendor',
  copilot_proposed_actions: 'ai',
  country_regulators: 'dora',
  cryptographic_inventory: 'compliance',
  data_classifications: 'privacy',
  data_domains: 'privacy',
  data_retention_policies: 'records',
  data_stewards: 'privacy',
  default_automation_templates: 'workflow',
  digital_signatures: 'evidence',
  dpia_assessments: 'privacy',
  dpias: 'privacy',
  drawer_templates: 'governance-os',
  effective_config_cache: 'admin',
  email_send_log: 'notification',
  endpoint_config: 'ai',
  enforcement_gate_log: 'governance-os',
  expert_packs: 'ai',
  explainability_links: 'ai',
  file_storage: 'admin',
  first_visits: 'onboarding',
  function_authorities: 'auth',
  guard_decision_log: 'auth',
  human_oversight_config: 'ai',
  inbound_handler_registry: 'workflow',
  input_validation_rules: 'governance-os',
  instrument_versions: 'compliance',
  intervention_audit_log: 'ai',
  kernel_snapshots: 'admin',
  langgraph_agent_metrics: 'ai',
  legal_entities: 'foundation',
  metadata_records: 'privacy',
  mitigating_control_mappings: 'risk',
  ndmo_classification_levels: 'dora',
  ninety_day_plans: 'onboarding',
  nudge_feedback: 'ai',
  nudges: 'ai',
  openclaw_api_keys: 'integrations',
  outcome_links: 'governance',
  pending_assignment_queue: 'workflow',
  performance_cache: 'admin',
  personal_agent_assignments: 'ai',
  pir_sign_offs: 'incident',
  plan_item_instances: 'onboarding',
  powerbi_reports: 'reporting',
  pqc_test_results: 'compliance',
  preventive_control_mappings: 'risk',
  quantum_migration_plans: 'compliance',
  rate_limit_config: 'admin',
  rbac_config_audit: 'auth',
  reasoning_chain_summary: 'ai',
  recent_searches: 'admin',
  recommendation_triggers: 'governance-os',
  reference_categories: 'admin',
  regulation_diffs: 'dora',
  resource_allocations: 'governance',
  roadmaps: 'governance',
  runtime_overrides: 'admin',
  score_calibrations: 'risk',
  seeding_depth_config: 'onboarding',
  severity_escalation_thresholds: 'governance-os',
  shell_config_overrides: 'admin',
  signal_detector_registry: 'ai',
  sop_procedures: 'governance-os',
  standup_digests: 'workflow',
  system_health_snapshots: 'admin',
  table_system_flags: 'admin',
  telemetry_signals: 'admin',
  triage_proposals: 'workflow',
  ucf_control_versions: 'compliance',
  unified_squad_members: 'workflow',
  war_rooms: 'incident',
  wf_approval_decisions: 'workflow',
  workload_snapshots: 'auth',
};

function resolveOwnerService(tableName, sourceFile) {
  // 0. Check explicit overrides first
  if (TABLE_OVERRIDES[tableName] && MODULE_TO_SERVICE[TABLE_OVERRIDES[tableName]]) {
    return { ownerService: MODULE_TO_SERVICE[TABLE_OVERRIDES[tableName]], module: TABLE_OVERRIDES[tableName] };
  }

  // 1. Try table name prefix
  let module = inferModuleFromTableName(tableName);

  // 2. Try migration filename
  if (!module) {
    module = inferModuleFromFileName(sourceFile);
  }

  // 3. Map module to service
  if (module && MODULE_TO_SERVICE[module]) {
    return { ownerService: MODULE_TO_SERVICE[module], module };
  }

  return { ownerService: 'UNRESOLVED', module: module || 'UNKNOWN' };
}

function containsPii(tableName, columns) {
  const allFields = [tableName, ...columns.map(c => c.name)].join(' ');
  return PII_PATTERNS.some(p => allFields.includes(p));
}

function containsSecrets(tableName, columns) {
  const allFields = [tableName, ...columns.map(c => c.name)].join(' ');
  return SECRET_PATTERNS.some(p => allFields.includes(p));
}

function inferRetention(tableName) {
  for (const rule of RETENTION_RULES) {
    if (rule.pattern.test(tableName)) return rule.retention;
  }
  return 'permanent';
}

function inferArchivalMode(retention) {
  if (retention === 'permanent') return 'none';
  return 'time-based';
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  console.log('=== extract-tables.mjs ===');
  console.log('Scanning legacy monolith SQL migrations...\n');

  // Collect all SQL files
  const allSqlFiles = [];
  for (const dir of SQL_DIRS) {
    const files = listSqlFiles(dir);
    allSqlFiles.push(...files);
    if (files.length > 0) {
      console.log(`  ${dir}: ${files.length} SQL files`);
    }
  }
  console.log(`\nTotal SQL files to scan: ${allSqlFiles.length}\n`);

  // Parse all CREATE TABLE statements
  const tableMap = new Map(); // tableName → best definition (latest wins)
  let totalParsed = 0;

  for (const filePath of allSqlFiles) {
    const tables = parseCreateTables(filePath);
    for (const t of tables) {
      totalParsed++;
      const existing = tableMap.get(t.tableName);
      // Keep the one with more columns (more complete definition)
      if (!existing || t.columns.length > existing.columns.length) {
        tableMap.set(t.tableName, t);
      }
    }
  }

  console.log(`CREATE TABLE statements found: ${totalParsed}`);
  console.log(`Unique tables (deduplicated): ${tableMap.size}\n`);

  // Build ownership map entries
  const tables = [];
  const unresolvedModules = new Map();

  for (const [tableName, def] of [...tableMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const { ownerService, module } = resolveOwnerService(tableName, def.sourceFile);
    const tenantScopeMode = def.schema === 'tenant' ? 'tenant-scoped' : 'platform-global';
    const ownerScope = tenantScopeMode === 'platform-global' ? 'platform' : 'product';

    // Track unresolved
    if (ownerService === 'UNRESOLVED') {
      const count = unresolvedModules.get(module) || 0;
      unresolvedModules.set(module, count + 1);
    }

    // Determine product code
    const isPlatformService = ['auth-service', 'tenant-service', 'user-service', 'workflow-service', 'notification-service', 'gateway'].includes(ownerService);
    const productCode = isPlatformService ? null : 'shahin';

    tables.push({
      table_name: tableName,
      owner_service: ownerService,
      owner_module: module,
      owner_scope: isPlatformService ? 'platform' : ownerScope,
      product_code: productCode,
      tenant_scope_mode: tenantScopeMode,
      lifecycle_status: 'active',
      source_baseline: def.sourceFile,
      retention_profile: inferRetention(tableName),
      contains_pii: containsPii(tableName, def.columns),
      contains_secrets: containsSecrets(tableName, def.columns),
      archival_mode: inferArchivalMode(inferRetention(tableName)),
      column_count: def.columns.length,
      has_foreign_keys: def.foreignKeys.length > 0,
    });
  }

  // Build output JSON
  const output = {
    $schema: 'dos-table-registry-v1',
    $description: 'Every table extracted from legacy monolith SQL migrations with ownership resolution. Generated by extract-tables.mjs.',
    $generated: new Date().toISOString().split('T')[0],
    $source: 'Extracted from /home/Dr-Dogan-AGRC-OS/backend/{src/migrations,migrations,db/patches}',
    $stats: {
      total_sql_files_scanned: allSqlFiles.length,
      total_create_statements: totalParsed,
      unique_tables: tableMap.size,
      resolved_ownership: tables.filter(t => t.owner_service !== 'UNRESOLVED').length,
      unresolved_ownership: tables.filter(t => t.owner_service === 'UNRESOLVED').length,
      platform_tables: tables.filter(t => t.owner_scope === 'platform').length,
      product_tables: tables.filter(t => t.product_code === 'shahin').length,
      tenant_scoped: tables.filter(t => t.tenant_scope_mode === 'tenant-scoped').length,
      platform_global: tables.filter(t => t.tenant_scope_mode === 'platform-global').length,
      tables_with_pii: tables.filter(t => t.contains_pii).length,
      tables_with_secrets: tables.filter(t => t.contains_secrets).length,
    },
    $field_spec: {
      table_name: 'Database table name (lowercase, underscore-separated)',
      owner_service: 'Service that has exclusive write access (from services.registry.json)',
      owner_module: 'Canonical module code that owns this table',
      owner_scope: 'platform | product',
      product_code: 'null for platform tables, shahin for product tables',
      tenant_scope_mode: 'platform-global | tenant-scoped',
      lifecycle_status: 'active | deprecated | archived',
      source_baseline: 'Migration file that created this table',
      retention_profile: 'permanent | 7d | 30d | 90d | 1y | 7y',
      contains_pii: 'true if table stores personal identifiable information',
      contains_secrets: 'true if table stores credentials, keys, tokens',
      archival_mode: 'none | time-based | event-based | manual',
      column_count: 'Number of columns extracted from CREATE TABLE',
      has_foreign_keys: 'true if table has foreign key constraints',
    },
    tables,
  };

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');

  // Report
  console.log('--- EXTRACTION REPORT ---');
  console.log(`Tables written: ${tables.length}`);
  console.log(`Resolved ownership: ${output.$stats.resolved_ownership}`);
  console.log(`Unresolved ownership: ${output.$stats.unresolved_ownership}`);
  console.log(`Platform tables: ${output.$stats.platform_tables}`);
  console.log(`Product (shahin) tables: ${output.$stats.product_tables}`);
  console.log(`Tenant-scoped: ${output.$stats.tenant_scoped}`);
  console.log(`Platform-global: ${output.$stats.platform_global}`);
  console.log(`Tables with PII: ${output.$stats.tables_with_pii}`);
  console.log(`Tables with secrets: ${output.$stats.tables_with_secrets}`);

  if (unresolvedModules.size > 0) {
    console.log('\n--- UNRESOLVED TABLES ---');
    for (const [mod, count] of [...unresolvedModules.entries()].sort((a, b) => b - a)) {
      console.log(`  ${mod}: ${count} tables`);
    }
  }

  // Service breakdown
  const byService = new Map();
  for (const t of tables) {
    const svc = t.owner_service;
    byService.set(svc, (byService.get(svc) || 0) + 1);
  }
  console.log('\n--- TABLES PER SERVICE ---');
  for (const [svc, count] of [...byService.entries()].sort((a, b) => b - a)) {
    console.log(`  ${svc}: ${count}`);
  }

  console.log(`\nOutput: ${OUTPUT_FILE}`);

  // Also output a column-level schema file for the detailed contracts
  const schemaOutput = {
    $schema: 'dos-table-schema-v1',
    $generated: new Date().toISOString().split('T')[0],
    $source: 'Extracted from legacy SQL migrations by extract-tables.mjs',
    tables: [...tableMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tableName, def]) => ({
        tableName,
        schema: def.schema,
        sourceFile: def.sourceFile,
        columns: def.columns,
        primaryKey: def.primaryKey,
        foreignKeys: def.foreignKeys,
      })),
  };

  const schemaOutputFile = join(TARGET_ROOT, 'migration/inventory/table-schemas.extracted.json');
  writeFileSync(schemaOutputFile, JSON.stringify(schemaOutput, null, 2) + '\n');
  console.log(`Schema detail: ${schemaOutputFile}`);
  console.log(`\nDone.`);
}

main();
