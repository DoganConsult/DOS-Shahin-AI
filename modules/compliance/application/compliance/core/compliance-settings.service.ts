/**
 * Compliance Settings Service — DB-driven limits, pagination, cache TTL.
 * Reads from tenant_settings via resolveSettingWithInheritance (scope: module, moduleCode: 'compliance').
 * Code defaults used when key is missing (no DB rows required).
 */

import { tenantSchema } from '../../../ports/database.port';
import { resolveSettingWithInheritance } from '../../../ports/platform.port';
import { safeQuery } from "@dos/db";

export interface ComplianceSettings {
  overviewControlsLimit: number;
  overviewEvidenceLimit: number;
  overviewFindingsLimit: number;
  overviewRemediationLimit: number;
  overviewIncludeDomainHealth: boolean;
  cacheTtlSeconds: number;
  paginationDefaultPageSize: number;
  paginationMaxPageSize: number;
  gapsListLimit: number;
}

const DEFAULTS: ComplianceSettings = {
  overviewControlsLimit: 1000,
  overviewEvidenceLimit: 500,
  overviewFindingsLimit: 500,
  overviewRemediationLimit: 500,
  overviewIncludeDomainHealth: true,
  cacheTtlSeconds: 90,
  paginationDefaultPageSize: 50,
  paginationMaxPageSize: 200,
  gapsListLimit: 200,
};

const KEYS: (keyof ComplianceSettings)[] = [
  'overviewControlsLimit',
  'overviewEvidenceLimit',
  'overviewFindingsLimit',
  'overviewRemediationLimit',
  'overviewIncludeDomainHealth',
  'cacheTtlSeconds',
  'paginationDefaultPageSize',
  'paginationMaxPageSize',
  'gapsListLimit',
];

const SETTING_KEYS: Record<keyof ComplianceSettings, string> = {
  overviewControlsLimit: 'compliance.overview_controls_limit',
  overviewEvidenceLimit: 'compliance.overview_evidence_limit',
  overviewFindingsLimit: 'compliance.overview_findings_limit',
  overviewRemediationLimit: 'compliance.overview_remediation_limit',
  overviewIncludeDomainHealth: 'compliance.overview_include_domain_health',
  cacheTtlSeconds: 'compliance.cache_ttl_seconds',
  paginationDefaultPageSize: 'compliance.pagination_default_page_size',
  paginationMaxPageSize: 'compliance.pagination_max_page_size',
  gapsListLimit: 'compliance.gaps_list_limit',
};

function coerceNumber(val: any, defaultVal: number, min?: number, max?: number): number {
  if (val === undefined || val === null) return defaultVal;
  const n = Number(val);
  if (Number.isNaN(n)) return defaultVal;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return Math.floor(n);
}

function coerceBoolean(val: any, defaultVal: boolean): boolean {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
  return Boolean(val);
}

/**
 * Load effective compliance settings for a tenant.
 * Uses tenant_settings with scope inheritance (module 'compliance' then tenant/product/platform).
 * Missing keys fall back to DEFAULTS.
 */
export async function getComplianceSettings(tenantId: string): Promise<ComplianceSettings> {
  const schema = tenantSchema(tenantId);
  const context = { moduleCode: 'compliance' };
  const out = { ...DEFAULTS };

  for (const key of KEYS) {
    const settingKey = SETTING_KEYS[key];
    const resolved = await resolveSettingWithInheritance(schema, settingKey, context);
    const raw = resolved?.value;

    switch (key) {
      case 'overviewControlsLimit':
      case 'overviewEvidenceLimit':
      case 'overviewFindingsLimit':
      case 'overviewRemediationLimit':
        out[key] = coerceNumber(raw, DEFAULTS[key], 1, 2000);
        break;
      case 'cacheTtlSeconds':
        out[key] = coerceNumber(raw, DEFAULTS[key], 0, 86400);
        break;
      case 'paginationDefaultPageSize':
        out[key] = coerceNumber(raw, DEFAULTS[key], 1, 500);
        break;
      case 'paginationMaxPageSize':
        out[key] = coerceNumber(raw, DEFAULTS[key], 1, 500);
        break;
      case 'gapsListLimit':
        out[key] = coerceNumber(raw, DEFAULTS[key], 1, 1000);
        break;
      case 'overviewIncludeDomainHealth':
        out[key] = coerceBoolean(raw, DEFAULTS[key]);
        break;
      default:
        (out as any)[key] = raw !== undefined ? raw : DEFAULTS[key];
    }
  }

  if (out.paginationDefaultPageSize > out.paginationMaxPageSize) {
    out.paginationDefaultPageSize = out.paginationMaxPageSize;
  }

  return out;
}
