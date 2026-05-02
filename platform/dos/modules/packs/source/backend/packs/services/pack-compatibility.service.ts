import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface CompatibilityResult {
  packCode: string;
  compatible: boolean;
  missingDependencies: string[];
  conflictingPacks: string[];
  platformVersionOk: boolean;
  checkedAt: string;
}

export async function checkCompatibility(tenantId: string, packCode: string): Promise<CompatibilityResult> {
  const schema = tenantSchema(tenantId);
  const result: CompatibilityResult = {
    packCode, compatible: true, missingDependencies: [], conflictingPacks: [],
    platformVersionOk: true, checkedAt: new Date().toISOString(),
  };

  try {
    const { rows: packRows } = await safeQuery(
      `SELECT dependencies, conflicts, min_platform_version FROM "${schema}".pack_registry WHERE pack_code = $1 LIMIT 1`,
      [packCode],
    );
    if (packRows.length === 0) {
      result.compatible = false;
      result.missingDependencies.push(`Pack ${packCode} not found in registry`);

      emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'packs', event: 'compatibility.checked',
              entityType: 'pack_compatibility', entityId: packCode,
              data: { packCode, compatible: false, missingDeps: 1, conflicts: 0, notFound: true },
            } as any)).catch((e) => logger.warn('[packs] compatibility event emission failed', { error: (e as Error).message }));

      logger.info('[packs] compatibility checked (pack not found)', { tenantId, packCode, compatible: false });

      return result;
    }
    const pack = packRows[0];

    const deps: string[] = Array.isArray(pack.dependencies) ? pack.dependencies : (pack.dependencies ? JSON.parse(pack.dependencies) : []);
    if (deps.length > 0) {
      const { rows: installed } = await safeQuery(
        `SELECT pack_code FROM "${schema}".pack_installations WHERE tenant_id = $1 AND status = 'installed'`,
        [tenantId],
      );
      const installedCodes = new Set(installed.map(( r: Record<string, unknown>) => r.pack_code));
      for (const dep of deps) {
        if (!installedCodes.has(dep)) result.missingDependencies.push(dep);
      }
    }

    const conflicts: string[] = Array.isArray(pack.conflicts) ? pack.conflicts : (pack.conflicts ? JSON.parse(pack.conflicts) : []);
    if (conflicts.length > 0) {
      const { rows: installed } = await safeQuery(
        `SELECT pack_code FROM "${schema}".pack_installations WHERE tenant_id = $1 AND status = 'installed' AND pack_code = ANY($2)`,
        [tenantId, conflicts],
      );
      (result as any).conflictingPacks = installed.map(( r: Record<string, unknown>) => r.pack_code);
    }

    result.compatible = result.missingDependencies.length === 0 && result.conflictingPacks.length === 0 && result.platformVersionOk;
  } catch (e) {
    result.compatible = false;
    logger.warn('[packs] compatibility check query failed', { tenantId, packCode, error: (e as Error).message });
  }

  emitEvent(({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'packs', event: 'compatibility.checked',
      entityType: 'pack_compatibility', entityId: packCode,
      data: { packCode, compatible: result.compatible, missingDeps: result.missingDependencies.length, conflicts: result.conflictingPacks.length },
    } as any)).catch((e) => logger.warn('[packs] compatibility event emission failed', { error: (e as Error).message }));

  logger.info('[packs] compatibility checked', { tenantId, packCode, compatible: result.compatible });

  return result;
}
