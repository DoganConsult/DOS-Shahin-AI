import { UnifiedConfigService } from '@dos/platform-core/settings/unified-config.service';
import { resolveSettingWithInheritance } from '@dos/platform-core/settings/settings-resolver.service';
import { CONFIG_OWNERSHIP_MAP } from '../../../platform/contracts/config-boundary';
import type { ConfigResolveOptions, ConfigResolveResult, ConfigResolutionExplanation } from '../contracts/config-center.contracts';

function findOwnership(key: string) {
  return CONFIG_OWNERSHIP_MAP.find(e => e.key === key);
}

function maskSensitive(value: unknown, sensitive: boolean): unknown {
  if (!sensitive || value === undefined || value === null) return value;
  const str = String(value);
  if (str.length < 8) return '****';
  return str.slice(0, 4) + '****' + str.slice(-4);
}

export async function resolveConfig(key: string, options: ConfigResolveOptions): Promise<ConfigResolveResult> {
  const meta = await UnifiedConfigService.resolveWithMetadata(key, options);
  const ownership = findOwnership(key.replace(/\./g, '_').toUpperCase());
  const isSensitive = ownership?.sensitive ?? false;

  return {
    key,
    value: maskSensitive(meta.value, isSensitive),
    source: meta.source,
    overriddenLayers: meta.overridenLayers,
    owner: ownership?.owner,
    sensitive: isSensitive,
    mutable: ownership?.mutable,
  };
}

export async function resolveManyConfigs(keys: string[], options: ConfigResolveOptions): Promise<ConfigResolveResult[]> {
  const results: ConfigResolveResult[] = [];
  for (const key of keys) {
    results.push(await resolveConfig(key, options));
  }
  return results;
}

export async function explainResolution(key: string, options: ConfigResolveOptions): Promise<ConfigResolutionExplanation> {
  const envKey = key.replace(/\./g, '_').toUpperCase();
  const layers: ConfigResolutionExplanation['layers'] = [];
  const ownership = findOwnership(envKey);
  const isSensitive = ownership?.sensitive ?? false;

  const envValue = process.env[envKey];
  layers.push({ layer: 'environment', value: envValue !== undefined ? maskSensitive(envValue, isSensitive) : undefined, active: envValue !== undefined });

  layers.push({ layer: 'deployment', value: undefined, active: false });

  if (options.tenantId) {
    const schema = `tenant_${options.tenantId.replace(/-/g, '_')}`;
    try {
      const resolved = await resolveSettingWithInheritance(schema, key, {
        productKey: undefined,
        moduleCode: options.moduleCode,
        workspaceId: options.workspaceId,
        ownerUserId: options.userId,
      });
      layers.push({ layer: `tenant:${resolved?.resolvedScope ?? 'tenant'}`, value: resolved ? maskSensitive(resolved.value, isSensitive) : undefined, active: resolved !== undefined });
    } catch {
      layers.push({ layer: 'tenant', value: undefined, active: false });
    }
  } else {
    layers.push({ layer: 'tenant', value: undefined, active: false });
  }

  layers.push({ layer: 'product', value: undefined, active: false });

  const meta = await UnifiedConfigService.resolveWithMetadata(key, options);
  layers.push({ layer: 'platform', value: meta.source === 'platform' ? maskSensitive(meta.value, isSensitive) : undefined, active: meta.source === 'platform' });

  return {
    key,
    layers,
    finalValue: maskSensitive(meta.value, isSensitive),
    finalSource: meta.source,
  };
}
