import { CONFIG_OWNERSHIP_MAP } from '../../../platform/contracts/config-boundary';
import { UnifiedConfigService } from '@dos/platform-core/settings/unified-config.service';
import { getSettingsForScope } from '@dos/platform-core/settings/settings-resolver.service';
import { tenantSchema } from '../ports/database.port';
import type { EnvHealthReport, SecretBindingReport, ConfigDriftReport, ConfigDriftItem } from '../contracts/config-center.contracts';

const REQUIRED_ENV_KEYS = ['JWT_SECRET', 'PG_HOST', 'PG_PASSWORD', 'PG_DATABASE', 'PG_USER', 'CORS_ORIGINS'];

export function checkEnvHealth(): EnvHealthReport {
  const totalRegistered = CONFIG_OWNERSHIP_MAP.length;
  let totalSet = 0;
  let totalMissing = 0;
  let totalSensitive = 0;
  let totalSensitiveSet = 0;
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];

  for (const entry of CONFIG_OWNERSHIP_MAP) {
    const val = process.env[entry.key];
    if (entry.sensitive) totalSensitive++;

    if (val !== undefined && val !== '') {
      totalSet++;
      if (entry.sensitive) totalSensitiveSet++;
    } else {
      totalMissing++;
      if (REQUIRED_ENV_KEYS.includes(entry.key)) {
        missingRequired.push(entry.key);
      } else {
        missingOptional.push(entry.key);
      }
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET is shorter than 32 characters');
  }
  if (process.env.CORS_ORIGINS === '*') {
    warnings.push('CORS_ORIGINS is wildcard (*) — not safe for production');
  }

  let overallStatus: EnvHealthReport['overallStatus'] = 'healthy';
  if (missingRequired.length > 0) overallStatus = 'critical';
  else if (missingOptional.length > 10) overallStatus = 'degraded';

  return {
    totalRegistered,
    totalSet,
    totalMissing,
    totalSensitive,
    totalSensitiveSet,
    missingRequired,
    missingOptional,
    warnings,
    overallStatus,
  };
}

export function checkSecretBindings(): SecretBindingReport {
  const secretEntries = CONFIG_OWNERSHIP_MAP.filter(e => e.sensitive);
  const items = secretEntries.map(entry => ({
    key: entry.key,
    bound: process.env[entry.key] !== undefined && process.env[entry.key] !== '',
    sensitive: true,
  }));

  return {
    totalSecrets: secretEntries.length,
    bound: items.filter(i => i.bound).length,
    unbound: items.filter(i => !i.bound).length,
    items,
  };
}

export async function detectConfigDrift(tenantId: string): Promise<ConfigDriftReport> {
  const schema = tenantSchema(tenantId);
  const driftItems: ConfigDriftItem[] = [];

  try {
    const tenantSettings = await getSettingsForScope({
      schema,
      scope: 'tenant',
    });

    for (const setting of tenantSettings) {
      const meta = UnifiedConfigService.resolveSyncWithMetadata(setting.key);
      if (meta.source === 'environment' || meta.source === 'deployment') {
        driftItems.push({
          key: setting.key,
          expectedSource: 'tenant',
          actualSource: meta.source,
          expectedValue: setting.value,
          actualValue: meta.value,
          severity: meta.source === 'environment' ? 'warning' : 'info',
        });
      }
    }
  } catch {
    // tenant_settings table may not exist
  }

  const hasCritical = driftItems.some(d => d.severity === 'critical');

  return {
    tenantId,
    checkedAt: new Date().toISOString(),
    driftItems,
    totalDrift: driftItems.length,
    overallStatus: hasCritical ? 'critical_drift' : driftItems.length > 0 ? 'drifted' : 'clean',
  };
}
