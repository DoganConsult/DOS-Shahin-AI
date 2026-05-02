// ============================================
// Proactive Leadership Config Seeder — Enterprise Grade
// Seeds default thresholds, scan schedules, notification
// preferences, and sector-based focus areas.
// Uses UPSERT to avoid duplicates, delegates to upstream
// seeders for module coverage, signal rules, and thresholds.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '../../../utils/error';


import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

// ── Sector-to-focus-area mapping ──

/** Maps ISIC sector codes to recommended proactive leadership focus areas */
const SECTOR_FOCUS_AREAS: Record<string, string[]> = {
  // Financial services: heavy on compliance and risk
  K: ['compliance', 'risk', 'vendor', 'incident', 'audit', 'evidence'],
  // Healthcare: compliance-heavy with BCP focus
  Q: ['compliance', 'risk', 'bcp', 'evidence', 'incident', 'governance'],
  // Information & Communication / Technology
  J: ['ai-governance', 'risk', 'incident', 'vendor', 'compliance', 'evidence'],
  // Government / Public Administration
  O: ['governance', 'compliance', 'audit', 'risk', 'policy', 'evidence'],
  // Education
  P: ['compliance', 'governance', 'training', 'policy', 'evidence', 'audit'],
  // Energy / Mining
  B: ['risk', 'bcp', 'compliance', 'incident', 'vendor', 'evidence'],
  C: ['risk', 'compliance', 'bcp', 'vendor', 'evidence', 'governance'],
  // Retail / Wholesale
  G: ['compliance', 'vendor', 'risk', 'evidence', 'governance', 'audit'],
  // Construction / Real Estate
  F: ['risk', 'compliance', 'bcp', 'vendor', 'governance', 'evidence'],
  L: ['compliance', 'risk', 'governance', 'audit', 'evidence', 'vendor'],
  // Transportation
  H: ['bcp', 'risk', 'compliance', 'incident', 'vendor', 'governance'],
};

/** Default focus areas when sector is any */
const DEFAULT_FOCUS_AREAS = ['compliance', 'risk', 'evidence', 'governance', 'audit', 'incident'];

// ── Default scan schedules ──

const DEFAULT_SCAN_SCHEDULES = [
  {
    name: 'daily_signal_scan',
    cron: '0 6 * * *',
    enabled: true,
    description: 'Daily proactive signal detection at 6 AM',
  },
  {
    name: 'weekly_leadership_cycle',
    cron: '0 8 * * 1',
    enabled: true,
    description: 'Weekly full leadership cycle every Monday at 8 AM',
  },
  {
    name: 'monthly_board_prep',
    cron: '0 10 1 * *',
    enabled: true,
    description: 'Monthly board preparation report on the 1st at 10 AM',
  },
];

// ── Default notification preferences ──

const DEFAULT_NOTIFICATION_TARGETS = [
  { role: 'admin', channel: 'in_app', enabled: true },
  { role: 'compliance_officer', channel: 'email', enabled: true },
  { role: 'compliance_officer', channel: 'in_app', enabled: true },
  { role: 'risk_manager', channel: 'email', enabled: true },
  { role: 'risk_manager', channel: 'in_app', enabled: true },
  { role: 'auditor', channel: 'in_app', enabled: true },
];

// ── Default threshold config items ──

const DEFAULT_CONFIG_ITEMS = [
  { key: 'enabled', value: true, description: 'Master switch for proactive leadership engine' },
  { key: 'cycle_interval_minutes', value: 15, description: 'Minutes between proactive scan cycles' },
  { key: 'max_insights_per_cycle', value: 50, description: 'Maximum AI insights generated per cycle' },
  { key: 'risk_escalation_threshold', value: 0.75, description: 'Confidence threshold for auto-escalating risk signals' },
  { key: 'compliance_drift_threshold', value: 5, description: 'Percentage drop in compliance score that triggers alert' },
  { key: 'workload_imbalance_threshold', value: 3.0, description: 'Max ratio of highest/lowest team workload before rebalance alert' },
];

export interface SeedResult {
  seeded: number;
  configItems: string[];
}

/**
 * Seed all proactive leadership configuration for a tenant.
 *
 * 1. Seeds default thresholds (risk_escalation, compliance_drift, workload_imbalance)
 * 2. Seeds default scan schedules (daily, weekly, monthly)
 * 3. Seeds default notification preferences (roles + channels)
 * 4. Seeds focus areas based on tenant's sector code
 * 5. Seeds module coverage, signal rules, and DB thresholds via upstream seeders
 * 6. Uses UPSERT to avoid duplicates on re-seed
 */
export async function seedDefaultConfig(tenantId: string): Promise<SeedResult> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const configItems: string[] = [];

  // Resolve tenant sector for focus area selection
  const sectorCode = await resolveTenantSector(tenantId, schema);
  const focusAreas = SECTOR_FOCUS_AREAS[sectorCode] || DEFAULT_FOCUS_AREAS;

  // 1. Seed core config items to tenant_preferences
  for (const item of DEFAULT_CONFIG_ITEMS) {
    try {
      const res = await safeQuery(
        `INSERT INTO "${schema}".tenant_preferences
           (tenant_id, module, preference_key, preference_value, updated_at)
         VALUES ($1, 'proactive_leadership', $2, $3, NOW())
         ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`,
        [tenantId, item.key, JSON.stringify(item.value)],
      );
      if (res.rowCount && res.rowCount > 0) {
        seeded++;
        configItems.push(item.key);
      }
    } catch {
      // Try without ON CONFLICT if constraint doesn't exist
      try {
        const existing = await safeQuery(
          `SELECT 1 FROM "${schema}".tenant_preferences
           WHERE tenant_id = $1 AND module = 'proactive_leadership' AND preference_key = $2`,
          [tenantId, item.key],
        );
        if (existing.rows.length === 0) {
          await safeQuery(
            `INSERT INTO "${schema}".tenant_preferences
               (tenant_id, module, preference_key, preference_value, updated_at)
             VALUES ($1, 'proactive_leadership', $2, $3, NOW())`,
            [tenantId, item.key, JSON.stringify(item.value)],
          );
          seeded++;
          configItems.push(item.key);
        }
      } catch { /* best-effort */ }
    }
  }

  // 2. Seed scan schedules
  try {
    const res = await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'scan_schedules', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`,
      [tenantId, JSON.stringify(DEFAULT_SCAN_SCHEDULES)],
    );
    if (res.rowCount && res.rowCount > 0) {
      seeded++;
      configItems.push('scan_schedules');
    }
  } catch { /* best-effort */ }

  // 3. Seed notification targets
  try {
    const res = await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'notification_targets', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`,
      [tenantId, JSON.stringify(DEFAULT_NOTIFICATION_TARGETS)],
    );
    if (res.rowCount && res.rowCount > 0) {
      seeded++;
      configItems.push('notification_targets');
    }
  } catch { /* best-effort */ }

  // 4. Seed sector-based focus areas
  try {
    const res = await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', 'focus_areas', $2, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO NOTHING`,
      [tenantId, JSON.stringify(focusAreas)],
    );
    if (res.rowCount && res.rowCount > 0) {
      seeded++;
      configItems.push(`focus_areas(${sectorCode || 'default'})`);
    }
  } catch { /* best-effort */ }

  // 5. Seed DB-driven module coverage, signal rules, and thresholds
  const [coverage, rules, thresholds] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, { seeded: 0 }, seedProactiveModuleCoverage(tenantId), { tenantId: tenantId, operation: 'fallback query' }),
    swallowDefault(EC.FALLBACK_QUERY, { seeded: 0 }, seedProactiveSignalRules(tenantId), { tenantId: tenantId, operation: 'fallback query' }),
    swallowDefault(EC.FALLBACK_QUERY, { seeded: 0 }, seedProactiveThresholds(tenantId), { tenantId: tenantId, operation: 'fallback query' }),
  ]);

  seeded += coverage.seeded + rules.seeded + thresholds.seeded;
  if (coverage.seeded > 0) configItems.push(`module_coverage(${coverage.seeded})`);
  if (rules.seeded > 0) configItems.push(`signal_rules(${rules.seeded})`);
  if (thresholds.seeded > 0) configItems.push(`thresholds(${thresholds.seeded})`);

  // 6. Record seed event in config history (best-effort)
  await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), 'system', 'seed', 'all',
             '"null"', $2)`,
    [tenantId, JSON.stringify({ seeded, configItems, sectorCode })],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  return { seeded, configItems };
}

/**
 * Reset proactive leadership config to defaults.
 *
 * 1. Deletes all tenant-specific proactive leadership preferences
 * 2. Deletes module coverage, signal rules, and thresholds
 * 3. Re-seeds all defaults
 * 4. Records reset in config history
 */
export async function resetConfig(tenantId: string): Promise<{
  reset: boolean;
  reseeded: SeedResult;
}> {
  const schema = tenantSchema(tenantId);

  // Delete all proactive leadership preferences
  await Promise.all([
    safeQuery(
      `DELETE FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1 AND module = 'proactive_leadership'`,
      [tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {})),
    safeQuery(
      `DELETE FROM "${schema}".proactive_module_coverage WHERE tenant_id = $1`,
      [tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {})),
    safeQuery(
      `DELETE FROM "${schema}".proactive_signal_rules WHERE tenant_id = $1`,
      [tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {})),
    safeQuery(
      `DELETE FROM "${schema}".proactive_leadership_thresholds WHERE tenant_id = $1`,
      [tenantId],
    ).catch(catchHandler(EC.EVENT_BUS, {})),
  ]);

  // Record reset in history before re-seeding
  await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), 'system', 'reset', 'all', '"deleted"', '"re-seeding"')`,
    [tenantId],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Invalidate cache
  const { invalidateConfigCache } = await import('./proactive-leadership-config-loader.service.js');
  invalidateConfigCache(tenantId);

  // Re-seed all defaults
  const reseeded = await seedDefaultConfig(tenantId);

  return { reset: true, reseeded };
}

/**
 * Validate that proactive config is complete for a tenant.
 * Checks for minimum required configuration: module coverage, signal rules, thresholds.
 */
export async function validateConfig(tenantId: string): Promise<{
  valid: boolean;
  missing: string[];
}> {
  const schema = tenantSchema(tenantId);
  const missing: string[] = [];

  const [coverage, rules, thresholds, preferences] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_module_coverage
       WHERE tenant_id = $1 AND enabled = true`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query proactive_module_coverage' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_signal_rules
       WHERE tenant_id = $1 AND enabled = true`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query proactive_module_coverage' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".proactive_leadership_thresholds
       WHERE tenant_id = $1`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query proactive_module_coverage' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT preference_key FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1 AND module = 'proactive_leadership'`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query proactive_leadership_thresholds' }),
  ]);

  if (parseInt((coverage as any).rows[0]?.cnt || '0') === 0) missing.push('module_coverage');
  if (parseInt((rules as any).rows[0]?.cnt || '0') === 0) missing.push('signal_rules');
  if (parseInt((thresholds as any).rows[0]?.cnt || '0') === 0) missing.push('thresholds');

  // Check for required preference keys
  const prefKeys = new Set(preferences.rows.map((r: GenericRow) => r.preference_key));
  const requiredKeys = ['enabled', 'scan_schedules', 'focus_areas', 'notification_targets'];
  for (const key of requiredKeys) {
    if (!prefKeys.has(key)) missing.push(`preference:${key}`);
  }

  return { valid: missing.length === 0, missing };
}

// ── Internal helpers ──

/**
 * Resolve tenant's sector code from workspace or onboarding data.
 * Used to determine sector-specific focus areas.
 */
async function resolveTenantSector(tenantId: string, schema: string): Promise<string> {
  try {
    // Try workspace profile first (golden truth)
    const wpRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT sector_code FROM "${schema}".workspace_profile
       WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query workspace_profile' });

    if (wpRes.rows[0]?.sector_code) {

      return wpRes.rows[0].sector_code;
    }

    // Fallback: check tenants table
    const tRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT sector_code FROM "${schema}".tenants
       WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query workspace_profile' });

    return tRes.rows[0]?.sector_code || '';
  } catch {
    return '';
  }
}

async function seedProactiveModuleCoverage(tenantId: string): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_module_coverage (module_code, enabled)
     SELECT unnest(ARRAY['risk','compliance','policy','evidence','audit','incident','vendor','bcp','asset','governance']),
            true
     ON CONFLICT (module_code) DO NOTHING`,
  );
  return { seeded: rowCount || 0 };
}

async function seedProactiveSignalRules(tenantId: string): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_signal_rules (rule_code, module_code, signal_type, enabled)
     VALUES ('default_risk', 'risk', 'threshold', true),
            ('default_compliance', 'compliance', 'deadline', true),
            ('default_incident', 'incident', 'frequency', true)
     ON CONFLICT (rule_code) DO NOTHING`,
  );
  return { seeded: rowCount || 0 };
}

async function seedProactiveThresholds(tenantId: string): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const { rowCount } = await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_thresholds (module_code, threshold_key, threshold_value)
     VALUES ('risk', 'high_risk_count', '5'),
            ('compliance', 'overdue_days', '30'),
            ('incident', 'open_count', '10')
     ON CONFLICT (module_code, threshold_key) DO NOTHING`,
  );
  return { seeded: rowCount || 0 };
}
