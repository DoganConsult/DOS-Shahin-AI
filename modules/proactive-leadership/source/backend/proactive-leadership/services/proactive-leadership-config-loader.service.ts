// ============================================
// Proactive Leadership Config Loader — Enterprise Grade
// Loads DB-driven config with in-memory caching (5 min TTL),
// supports config updates and audit trail.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage as _toErrorMessage } from '../../../utils/error';
import type { GenericRow } from '@dos/types';
import { swallowEmpty, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

export interface ProactiveThreshold {
  moduleCode: string;
  thresholdKey: string;
  thresholdValue: unknown;
  thresholdId?: string;
  autoAdjustEnabled?: boolean;
  adjustmentPolicy?: string;
  lastAdjustedAt?: string;
  adjustmentHistory?: Record<string, unknown>[];
}

export interface ProactiveSignalRule {
  ruleCode: string;
  moduleCode: string;
  signalType: string;
  enabled: boolean;
  ruleName?: string;
  initiativeCodePattern?: string;
  confidenceBase?: number;
  thresholdConfig?: Record<string, unknown>;
  detectionQuery?: string;
  severityMapping?: Record<string, unknown>;
  timeframeMapping?: Record<string, unknown>;
  recommendedActionTemplate?: string;
}

export interface ProactiveModuleCoverage {
  moduleCode: string;
  enabled: boolean;
  detectionFrequencyMinutes?: number;
}

// ── Full config shape ──

export interface ProactiveLeadershipConfig {
  enabled: boolean;
  cycleIntervalMinutes: number;
  maxInsightsPerCycle: number;
  moduleCoverage: number;
  signalRules: number;
  thresholds: number;
  /** Scan schedules: daily, weekly, monthly */
  scanSchedules: ScanSchedule[];
  /** Focus areas active for this tenant */
  focusAreas: string[];
  /** Notification preferences for leadership insights */
  notificationTargets: NotificationTarget[];
  /** Merged threshold values (DB overrides defaults) */
  thresholdValues: Record<string, unknown>;
}

export interface ScanSchedule {
  name: string;
  cron: string;
  enabled: boolean;
  description: string;
}

export interface NotificationTarget {
  role: string;
  channel: 'email' | 'in_app' | 'webhook';
  enabled: boolean;
}

export interface ConfigUpdate {
  enabled?: boolean;
  cycleIntervalMinutes?: number;
  maxInsightsPerCycle?: number;
  focusAreas?: string[];
  notificationTargets?: NotificationTarget[];
  scanSchedules?: ScanSchedule[];
  thresholdOverrides?: Record<string, unknown>;
}

export interface ConfigHistoryEntry {
  changeId: string;
  changedAt: string;
  changedBy: string;
  changeType: 'update' | 'reset' | 'seed';
  previousValue: ConfigFieldValue;
  newValue: ConfigFieldValue;
  fieldPath: string;
}

/** Union of all possible proactive-leadership config field values persisted in audit history */
type ConfigFieldValue = boolean | number | string | string[] | ScanSchedule[] | NotificationTarget[] | Record<string, unknown> | null;

// ── In-memory cache with 5-minute TTL ──

interface CacheEntry {
  config: ProactiveLeadershipConfig;
  expiresAt: number;
}

const CONFIG_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Default config values used when no DB config exists */
const DEFAULT_CONFIG: Omit<ProactiveLeadershipConfig, 'moduleCoverage' | 'signalRules' | 'thresholds'> = {
  enabled: false,
  cycleIntervalMinutes: 15,
  maxInsightsPerCycle: 50,
  scanSchedules: [
    { name: 'daily_signal_scan', cron: '0 6 * * *', enabled: true, description: 'Daily proactive signal detection at 6 AM' },
    { name: 'weekly_leadership_cycle', cron: '0 8 * * 1', enabled: true, description: 'Weekly full leadership cycle every Monday at 8 AM' },
    { name: 'monthly_board_prep', cron: '0 10 1 * *', enabled: true, description: 'Monthly board preparation report on the 1st at 10 AM' },
  ],
  focusAreas: ['compliance', 'risk', 'evidence', 'governance'],
  notificationTargets: [
    { role: 'admin', channel: 'in_app', enabled: true },
    { role: 'compliance_officer', channel: 'email', enabled: true },
    { role: 'risk_manager', channel: 'in_app', enabled: true },
  ],
  thresholdValues: {},
};

/**
 * Load proactive leadership configuration for a tenant.
 *
 * Resolution order:
 * 1. Check in-memory cache (5 min TTL)
 * 2. Query tenant_preferences table for proactive_leadership module config
 * 3. Query module coverage, signal rules, and thresholds counts from DB
 * 4. Merge DB config with defaults (DB values override defaults)
 * 5. Cache and return
 */
export async function loadConfig(tenantId: string): Promise<ProactiveLeadershipConfig> {
  // Check cache first
  const cached = CONFIG_CACHE.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  const schema = tenantSchema(tenantId);
  // Gather data in parallel: DB preferences + module counts
  const [prefRes, modules, rules, thresholds] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT preference_key, preference_value
       FROM "${schema}".tenant_preferences
       WHERE tenant_id = $1
         AND module = 'proactive_leadership'`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query tenant_preferences' }),
    swallowEmpty(EC.FALLBACK_QUERY, loadProactiveModuleCoverage(tenantId), { tenantId: tenantId, operation: 'query tenant_preferences' }),
    swallowEmpty(EC.FALLBACK_QUERY, loadProactiveSignalRules(tenantId), { tenantId: tenantId, operation: 'query tenant_preferences' }),
    swallowEmpty(EC.FALLBACK_QUERY, loadProactiveThresholds(tenantId), { tenantId: tenantId, operation: 'query tenant_preferences' }),
  ]);

  // Build preference map from DB rows
  const prefMap = new Map<string, unknown>();
  for (const row of prefRes.rows) {
    try {
      prefMap.set((row as any).preference_key, typeof row.preference_value === 'string'
        ? JSON.parse(row.preference_value)
        : row.preference_value);
    } catch {
      prefMap.set((row as any).preference_key, row.preference_value);
    }
  }

  const enabledModules = modules.filter(m => m.enabled);

  // Build threshold values map (key -> value) for quick lookup
  const thresholdValues: Record<string, unknown> = {};
  for (const t of thresholds) {
    thresholdValues[`${t.moduleCode}.${t.thresholdKey}`] = t.thresholdValue;
  }

  // Merge DB preferences over defaults
  const config: ProactiveLeadershipConfig = {
    enabled: prefMap.has('enabled')
      ? Boolean(prefMap.get('enabled'))
      : enabledModules.length > 0,
    cycleIntervalMinutes: prefMap.has('cycle_interval_minutes')
      ? Number(prefMap.get('cycle_interval_minutes'))
      : (enabledModules.length > 0
          ? Math.min(...enabledModules.map(m => m.detectionFrequencyMinutes || 15))
          : DEFAULT_CONFIG.cycleIntervalMinutes),
    maxInsightsPerCycle: prefMap.has('max_insights_per_cycle')
      ? Number(prefMap.get('max_insights_per_cycle'))
      : DEFAULT_CONFIG.maxInsightsPerCycle,
    moduleCoverage: enabledModules.length,
    signalRules: rules.length,
    thresholds: thresholds.length,

    scanSchedules: prefMap.has('scan_schedules')
      ? prefMap.get('scan_schedules')
      : DEFAULT_CONFIG.scanSchedules,

    focusAreas: prefMap.has('focus_areas')
      ? prefMap.get('focus_areas')
      : DEFAULT_CONFIG.focusAreas,

    notificationTargets: prefMap.has('notification_targets')
      ? prefMap.get('notification_targets')
      : DEFAULT_CONFIG.notificationTargets,
    thresholdValues,
  };

  // Cache the resolved config
  CONFIG_CACHE.set(tenantId, {
    config,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return config;
}

/**
 * Update specific proactive leadership config values.
 *
 * Persists changes to tenant_preferences table (module = 'proactive_leadership'),
 * records change in config history for audit trail, and invalidates cache.
 */
export async function updateConfig(
  tenantId: string,
  updates: ConfigUpdate,
  changedBy: string = 'system',
): Promise<{ updated: boolean; fields: string[] }> {
  const schema = tenantSchema(tenantId);
  const updatedFields: string[] = [];

  // Map of update fields to preference keys
  const fieldMap: Record<string, string> = {
    enabled: 'enabled',
    cycleIntervalMinutes: 'cycle_interval_minutes',
    maxInsightsPerCycle: 'max_insights_per_cycle',
    focusAreas: 'focus_areas',
    notificationTargets: 'notification_targets',
    scanSchedules: 'scan_schedules',
  };

  // Load current config for audit trail comparison
  const currentConfig = await loadConfig(tenantId);

  for (const [field, prefKey] of Object.entries(fieldMap)) {
    const newValue = (updates as any)[field];
    if (newValue === undefined) continue;

    const oldValue = (currentConfig as any)[field];

    // Upsert preference value
    await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences
         (tenant_id, module, preference_key, preference_value, updated_at)
       VALUES ($1, 'proactive_leadership', $2, $3, NOW())
       ON CONFLICT (tenant_id, module, preference_key) DO UPDATE
       SET preference_value = EXCLUDED.preference_value,
           updated_at = NOW()`,
      [tenantId, prefKey, JSON.stringify(newValue)],
    ).catch(() => {
      // Fallback: try without conflict clause if constraint doesn't exist
      safeQuery(
        `UPDATE "${schema}".tenant_preferences
         SET preference_value = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND module = 'proactive_leadership' AND preference_key = $2`,
        [tenantId, prefKey, JSON.stringify(newValue)],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    });

    // Record change in audit trail
    await recordConfigChange(tenantId, schema, {
      changeType: 'update',
      changedBy,
      fieldPath: `proactive_leadership.${prefKey}`,
      previousValue: oldValue,
      newValue,
    });

    updatedFields.push(field);
  }

  // Handle threshold overrides separately
  if (updates.thresholdOverrides) {
    for (const [key, value] of Object.entries(updates.thresholdOverrides)) {
      // key format: "module_code.threshold_key"
      const [moduleCode, ...keyParts] = key.split('.');
      const thresholdKey = keyParts.join('.');
      if (!moduleCode || !thresholdKey) continue;

      await safeQuery(
        `UPDATE "${schema}".proactive_leadership_thresholds
         SET threshold_value = $3, updated_at = NOW()
         WHERE tenant_id = $1 AND module_code = $2 AND threshold_key = $4`,
        [tenantId, moduleCode, JSON.stringify(value), thresholdKey],
      ).catch(catchHandler(EC.EVENT_BUS, {}));

      await recordConfigChange(tenantId, schema, {
        changeType: 'update',
        changedBy,
        fieldPath: `threshold.${key}`,

        previousValue: currentConfig.thresholdValues[key],

        newValue: value,
      });

      updatedFields.push(`threshold:${key}`);
    }
  }

  // Invalidate cache so next loadConfig() fetches fresh data
  CONFIG_CACHE.delete(tenantId);

  return { updated: updatedFields.length > 0, fields: updatedFields };
}

/**
 * Get config change audit trail for a tenant.
 *
 * Returns chronological list of all proactive leadership config changes
 * with before/after values for compliance and governance review.
 */
export async function getConfigHistory(
  tenantId: string,
  limit: number = 50,
): Promise<ConfigHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT change_id, changed_at, changed_by, change_type,
            previous_value, new_value, field_path
     FROM "${schema}".proactive_leadership_config_history
     WHERE tenant_id = $1
     ORDER BY changed_at DESC
     LIMIT $2`,
    [tenantId, limit],
  ), { tenantId: tenantId, operation: 'query proactive_leadership_config_history' });

  return res.rows.map((row: GenericRow) => ({
    changeId: row.change_id,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    changeType: row.change_type,
    previousValue: typeof row.previous_value === 'string'
      ? JSON.parse(row.previous_value) : row.previous_value,
    newValue: typeof row.new_value === 'string'
      ? JSON.parse(row.new_value) : row.new_value,
    fieldPath: row.field_path,
  }));
}

/**
 * Invalidate cached config for a tenant.
 * Called after config reset or bulk updates.
 */
export function invalidateConfigCache(tenantId: string): void {
  CONFIG_CACHE.delete(tenantId);
}

// ── Internal helper ──

/** Record a config change in the audit history table */
async function recordConfigChange(
  tenantId: string,
  schema: string,
  change: {
    changeType: 'update' | 'reset' | 'seed';
    changedBy: string;
    fieldPath: string;
    previousValue: ConfigFieldValue;
    newValue: ConfigFieldValue;
  },
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_config_history
       (tenant_id, changed_at, changed_by, change_type, field_path,
        previous_value, new_value)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
    [
      tenantId,
      change.changedBy,
      change.changeType,
      change.fieldPath,
      JSON.stringify(change.previousValue ?? null),
      JSON.stringify(change.newValue ?? null),
    ],
  ).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'record proactive leadership config history change',
    tenantId,
  }));
}

export async function loadProactiveThresholds(tenantId: string): Promise<ProactiveThreshold[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT module_code, threshold_key, threshold_value FROM "${schema}".proactive_leadership_thresholds`,
  );
  return rows.map((r: GenericRow) => ({ moduleCode: r.module_code, thresholdKey: r.threshold_key, thresholdValue: r.threshold_value }));
}

export async function loadProactiveSignalRules(tenantId: string): Promise<ProactiveSignalRule[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT rule_code, module_code, signal_type, enabled FROM "${schema}".proactive_leadership_signal_rules`,
  );
  return rows.map((r: GenericRow) => ({ ruleCode: r.rule_code, moduleCode: r.module_code, signalType: r.signal_type, enabled: r.enabled }));
}

export async function loadProactiveModuleCoverage(tenantId: string): Promise<ProactiveModuleCoverage[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT module_code, enabled, detection_frequency_minutes FROM "${schema}".proactive_leadership_module_coverage`,
  );
  return rows.map((r: GenericRow) => ({ moduleCode: r.module_code, enabled: r.enabled, detectionFrequencyMinutes: r.detection_frequency_minutes }));
}

export function getThreshold(thresholds: ProactiveThreshold[], moduleCode: string, key: string, fallback: unknown = null): unknown {
  const t = thresholds.find(t => t.moduleCode === moduleCode && t.thresholdKey === key);
  return t ? t.thresholdValue : fallback;
}

export async function resolveThresholdConfig(tenantId: string, moduleCode: string): Promise<Record<string, unknown>> {
  const thresholds = await loadProactiveThresholds(tenantId);
  const result: Record<string, unknown> = {};
  for (const t of thresholds.filter(t => t.moduleCode === moduleCode)) {
    result[t.thresholdKey] = t.thresholdValue;
  }
  return result;
}

export async function isModuleEnabled(tenantId: string, moduleCode: string): Promise<boolean> {
  const coverage = await loadProactiveModuleCoverage(tenantId);
  const entry = coverage.find(c => c.moduleCode === moduleCode);
  return entry?.enabled ?? false;
}

export async function getEnabledSignalTypes(tenantId: string): Promise<string[]> {
  const rules = await loadProactiveSignalRules(tenantId);
  const types = new Set<string>();
  for (const r of rules) {
    if (r.enabled) types.add(r.signalType);
  }
  return [...types];
}
