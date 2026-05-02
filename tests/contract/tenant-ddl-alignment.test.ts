import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

const DDL_FILE = 'modules/onboarding/source/config/db.ts';
const STEP_FILES = [
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/tenant-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-core-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-compliance-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-operations-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-team-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/seed-governance-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/activation-steps.ts',
  'modules/onboarding/source/backend/onboarding/services/provisioning-steps/misc-steps.ts',
];

function extractDdlColumns(ddlSrc: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const tableRe = /CREATE TABLE IF NOT EXISTS\s+"\$\{schema\}"\.\"?(\w+)\"?\s*\(([\s\S]*?)\);/g;
  let match;
  while ((match = tableRe.exec(ddlSrc)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const cols = new Set<string>();
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('UNIQUE')
        || trimmed.startsWith('PRIMARY') || trimmed.startsWith('CHECK')
        || trimmed.startsWith('REFERENCES') || trimmed.startsWith('CONSTRAINT')
        || trimmed.startsWith('FOREIGN') || trimmed.startsWith(')')) continue;
      const colMatch = trimmed.match(/^(\w+)\s/);
      if (colMatch) cols.add(colMatch[1]);
    }
    result.set(tableName, cols);
  }
  return result;
}

function extractInsertColumns(stepSrc: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const insertRe = /INSERT INTO\s+"?\$\{schema\}"?\.(\w+)\s*\(([^)]+)\)/g;
  let match;
  while ((match = insertRe.exec(stepSrc)) !== null) {
    const tableName = match[1];
    const colList = match[2].split(',').map(c => c.trim().replace(/['"]/g, ''));
    if (!result.has(tableName)) result.set(tableName, new Set());
    const cols = result.get(tableName)!;
    for (const col of colList) {
      if (col && !col.startsWith('$') && !col.startsWith('(')) cols.add(col);
    }
  }
  return result;
}

function extractOnConflictColumns(stepSrc: string): Array<{ table: string; cols: string[] }> {
  const result: Array<{ table: string; cols: string[] }> = [];
  const re = /INSERT INTO\s+"?\$\{schema\}"?\.(\w+)[\s\S]*?ON CONFLICT\s*\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(stepSrc)) !== null) {
    const table = match[1];
    const cols = match[2].split(',').map(c => c.trim().replace(/['"]/g, ''));
    result.push({ table, cols });
  }
  return result;
}

describe('Tenant Schema DDL Alignment', () => {
  const ddlSrc = read(DDL_FILE);
  const ddlColumns = extractDdlColumns(ddlSrc);

  const allInsertColumns = new Map<string, Set<string>>();
  const allConflicts: Array<{ table: string; cols: string[] }> = [];

  for (const stepFile of STEP_FILES) {
    const src = read(stepFile);
    const inserts = extractInsertColumns(src);
    for (const [table, cols] of inserts) {
      if (!allInsertColumns.has(table)) allInsertColumns.set(table, new Set());
      for (const c of cols) allInsertColumns.get(table)!.add(c);
    }
    allConflicts.push(...extractOnConflictColumns(src));
  }

  it('DDL file exists and contains CREATE TABLE statements', () => {
    expect(ddlColumns.size).toBeGreaterThan(30);
  });

  it('every INSERT target table exists in DDL', () => {
    const missing: string[] = [];
    for (const table of allInsertColumns.keys()) {
      if (!ddlColumns.has(table)) missing.push(table);
    }
    expect(missing, `Tables used in INSERT but missing from DDL: ${missing.join(', ')}`).toEqual([]);
  });

  it('every INSERT column exists in the DDL table', () => {
    const mismatches: string[] = [];
    for (const [table, insertCols] of allInsertColumns) {
      const ddlCols = ddlColumns.get(table);
      if (!ddlCols) continue;
      for (const col of insertCols) {
        if (!ddlCols.has(col)) {
          mismatches.push(`${table}.${col}`);
        }
      }
    }
    expect(mismatches, `Columns used in INSERT but missing from DDL:\n${mismatches.join('\n')}`).toEqual([]);
  });

  it('critical ON CONFLICT columns have matching UNIQUE constraints or partial indexes in DDL', () => {
    const criticalConflicts = [
      { table: 'workspaces', cols: ['name'] },
      { table: 'workspace_profile', cols: ['tenant_id'] },
      { table: 'frameworks', cols: ['framework_id'] },
      { table: 'controls', cols: ['control_id'] },
      { table: 'risks', cols: ['risk_id'] },
      { table: 'risk_appetite_config', cols: ['workspace_id'] },
      { table: 'role_profiles', cols: ['role'] },
      { table: 'teams', cols: ['team_code'] },
      { table: 'team_members', cols: ['team_id', 'user_id'] },
      { table: 'team_raci_assignments', cols: ['scope_type', 'scope_id', 'team_id', 'raci_role'] },
      { table: 'dashboard_widget_registry', cols: ['widget_key'] },
      { table: 'dashboard_registry', cols: ['dashboard_code'] },
      { table: 'dashboard_layouts', cols: ['dashboard_code'] },
      { table: 'navigation_registry', cols: ['nav_key'] },
      { table: 'feature_flags', cols: ['feature_key'] },
      { table: 'assessments', cols: ['assessment_id'] },
      { table: 'sla_config', cols: ['process_type', 'team_id', 'priority_level'] },
      { table: 'tenant_module_entitlements', cols: ['module_code'] },
      { table: 'team_escalation_paths', cols: ['from_team_id', 'escalation_level'] },
      { table: 'qiyas_models', cols: ['code'] },
      { table: 'qiyas_benchmark_profiles', cols: ['code'] },
      { table: 'qiyas_rating_scales', cols: ['code'] },
      { table: 'qiyas_scoring_methods', cols: ['code'] },
    ];

    const issues: string[] = [];
    for (const conflict of criticalConflicts) {
      const ddlCols = ddlColumns.get(conflict.table);
      if (!ddlCols) { issues.push(`${conflict.table} not in DDL`); continue; }
      const conflictKey = conflict.cols.sort().join(',');
      const tableSection = ddlSrc.split(new RegExp(`\\.${conflict.table}\\s*\\(`))[1];
      if (!tableSection) { issues.push(`${conflict.table} DDL section not found`); continue; }
      const tableBody = tableSection.split(');')[0];
      const hasUniqueInTable = tableBody.includes('UNIQUE');
      if (!hasUniqueInTable) {
        issues.push(`${conflict.table} ON CONFLICT (${conflict.cols.join(', ')}) — no UNIQUE constraint in table`);
        continue;
      }
      const uniqueMatches = [...tableBody.matchAll(/UNIQUE\(([^)]+)\)/g)];
      const hasMatch = uniqueMatches.some(u => {
        const uCols = u[1].split(',').map(c => c.trim()).sort().join(',');
        return uCols === conflictKey;
      });
      if (!hasMatch) {
        issues.push(`${conflict.table} ON CONFLICT (${conflict.cols.join(', ')}) — UNIQUE doesn't match`);
      }
    }
    expect(issues, `ON CONFLICT alignment issues:\n${issues.join('\n')}`).toEqual([]);
  });

  const CRITICAL_TABLES = [
    { table: 'workspace_profile', mustHave: ['tenant_id', 'industry', 'org_size', 'sectors', 'default_dashboard', 'risk_appetite', 'settings'] },
    { table: 'frameworks', mustHave: ['framework_id', 'name', 'description', 'category', 'status', 'workspace_id'] },
    { table: 'controls', mustHave: ['control_id', 'title', 'description', 'frameworks', 'status', 'workspace_id'] },
    { table: 'risks', mustHave: ['risk_id', 'title', 'description', 'category', 'likelihood', 'impact', 'status', 'workspace_id'] },
    { table: 'role_profiles', mustHave: ['role', 'modules', 'dashboard_widgets', 'default_landing_page', 'custom'] },
    { table: 'teams', mustHave: ['team_id', 'team_code', 'name_en', 'name_ar', 'description_en', 'team_type', 'active', 'metadata'] },
    { table: 'team_members', mustHave: ['team_id', 'user_id', 'team_role'] },
    { table: 'team_raci_assignments', mustHave: ['scope_type', 'scope_id', 'team_id', 'raci_role', 'notes', 'created_by'] },
    { table: 'dashboard_widget_registry', mustHave: ['widget_key', 'label_en', 'label_ar', 'module_code', 'component_key', 'default_width', 'default_height'] },
    { table: 'dashboard_registry', mustHave: ['dashboard_code', 'name_en', 'name_ar', 'audience', 'module_code', 'route', 'layout'] },
    { table: 'navigation_registry', mustHave: ['nav_key', 'parent_nav_key', 'label_en', 'label_ar', 'route', 'icon', 'module_code', 'item_type', 'sort_order'] },
    { table: 'feature_flags', mustHave: ['feature_key', 'enabled'] },
    { table: 'sla_config', mustHave: ['process_type', 'priority_level', 'initial_sla_hours', 'team_id', 'active'] },
    { table: 'connector_configs', mustHave: ['name', 'source_system_type', 'platform', 'auth_method', 'schedule', 'status', 'created_by'] },
    { table: 'person_profiles', mustHave: ['person_id', 'full_name', 'work_email', 'direct_manager_user_id', 'business_function', 'source', 'created_by'] },
    { table: 'module_assignments', mustHave: ['user_id', 'person_id', 'module_code', 'scope_type', 'responsibility_type', 'is_primary', 'sla_hours', 'source', 'created_by'] },
    { table: 'user_role_assignments', mustHave: ['user_id', 'person_id', 'role_code', 'assigned_by', 'source'] },
    { table: 'assessments', mustHave: ['assessment_id', 'title', 'framework_id', 'status', 'score', 'created_by'] },
    { table: 'audit_plan', mustHave: ['plan_id', 'plan_year', 'start_month', 'methodology', 'universe_size', 'status', 'metadata'] },
    { table: 'audit_universe', mustHave: ['plan_id', 'entity_name', 'entity_type', 'risk_rating', 'next_audit_date', 'status'] },
    { table: 'tenant_module_entitlements', mustHave: ['module_code', 'is_active', 'entitlement_source', 'activated_at'] },
    { table: 'risk_scoring_models', mustHave: ['name_en', 'name_ar', 'dimensions', 'thresholds', 'formula', 'zone_definitions', 'is_default', 'status'] },
    { table: 'evidence_tasks', mustHave: ['tenant_id', 'control_id', 'evidence_requirement_id', 'cadence', 'status', 'workspace_id', 'due_at'] },
    { table: 'evidence_schedules', mustHave: ['control_id', 'cron_expression', 'reminder_text', 'enabled'] },
    { table: 'risk_appetite_config', mustHave: ['workspace_id', 'appetite_name', 'overall_score', 'status', 'review_cycle', 'next_review'] },
    { table: 'authority_matrix', mustHave: ['workspace_id', 'decision_type', 'threshold_value', 'approver_role', 'escalation_role', 'requires_board'] },
  ];

  for (const { table, mustHave } of CRITICAL_TABLES) {
    it(`${table} DDL contains all required columns`, () => {
      const cols = ddlColumns.get(table);
      expect(cols, `Table ${table} not found in DDL`).toBeDefined();
      const missing = mustHave.filter(c => !cols!.has(c));
      expect(missing, `${table} missing columns: ${missing.join(', ')}`).toEqual([]);
    });
  }
});
