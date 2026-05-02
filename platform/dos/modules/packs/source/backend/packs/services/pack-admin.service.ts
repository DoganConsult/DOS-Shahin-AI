import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export async function getConfig(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".packs_config WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  return rows[0] ?? {
    tenantId, autoUpdateEnabled: false, marketplaceEnabled: true,
    maxInstalledPacks: 100, requireApproval: true,
  };
}

export async function updateConfig(tenantId: string, body: Record<string, unknown>, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;
  const beforeState = await getConfig(tenantId);

  const { rowCount } = await safeQuery(
    `INSERT INTO "${schema}".packs_config (tenant_id, auto_update_enabled, marketplace_enabled, max_installed_packs, require_approval, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       auto_update_enabled = EXCLUDED.auto_update_enabled,
       marketplace_enabled = EXCLUDED.marketplace_enabled,
       max_installed_packs = EXCLUDED.max_installed_packs,
       require_approval = EXCLUDED.require_approval,
       updated_at = NOW()`,
    [tenantId, body.autoUpdateEnabled ?? false, body.marketplaceEnabled ?? true,
     body.maxInstalledPacks ?? 100, body.requireApproval ?? true],
  ).catch((e: any) => { logger.warn('[packs] config upsert failed', { error: (e as Error).message }); return { rowCount: 0, rows: [] }; }) as unknown;

  if (!rowCount) {
    logger.warn('[packs] config update had no effect', { tenantId });
    return beforeState;
  }

  const afterState = await getConfig(tenantId);

  recordAudit({
    tenantId, userId: uid, module: 'packs', action: 'update',
    entityType: 'packs_config', entityId: tenantId,
    beforeState, afterState,
  }).catch((e: any) => logger.warn('[packs] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: uid, module: 'packs', event: 'config.updated',
      entityType: 'packs_config', entityId: tenantId,
      data: { autoUpdateEnabled: body.autoUpdateEnabled, marketplaceEnabled: body.marketplaceEnabled, requireApproval: body.requireApproval },
    } as any)).catch((e: any) => logger.warn('[packs] event emission failed', { error: (e as Error).message }));

  logger.info('[packs] config updated', { tenantId });

  return afterState;
}
