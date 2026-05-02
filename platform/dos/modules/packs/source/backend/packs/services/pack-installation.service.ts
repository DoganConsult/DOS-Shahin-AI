import { safeQuery, tenantSchema } from '../ports/database.port';

import { emitEvent, notifyDomainChange } from '../ports/events.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export async function installPack(tenantId: string, body: Record<string, unknown>, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".pack_installations
       (tenant_id, pack_code, version, status, installed_by, installed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'installed', $4, NOW(), NOW(), NOW())
     ON CONFLICT (tenant_id, pack_code) DO UPDATE SET
       version = EXCLUDED.version, status = 'installed', updated_at = NOW()
     RETURNING *`,
    [tenantId, body.packCode, body.version ?? '1.0.0', uid],
  ).catch((e: any) => { logger.warn('[packs] install query failed', { error: (e as Error).message }); return { rows: [] }; });
  if (rows.length === 0) return { pack_code: body.packCode, status: 'failed', tenant_id: tenantId };
  const record = rows[0];

  recordAudit({
    tenantId, userId: uid, module: 'packs', action: 'create',

    entityType: 'pack_installation', entityId: body.packCode,
    afterState: { packCode: body.packCode, version: body.version ?? '1.0.0', status: 'installed' },
  }).catch((e: any) => logger.warn('[packs] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: uid, module: 'packs', event: 'pack.installed',
      entityType: 'pack_installation', entityId: body.packCode,
      data: { packCode: body.packCode, version: body.version ?? '1.0.0' },
    } as any)).catch((e: any) => logger.warn('[packs] event emission failed', { error: (e as Error).message }));

  notifyDomainChange(tenantId, 'packs', 'create', body.packCode);

  logger.info('[packs] pack installed', { tenantId, packCode: body.packCode, version: body.version ?? '1.0.0' });

  return record;
}

export async function uninstallPack(tenantId: string, packCode: string, userId?: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const uid = userId ?? SYSTEM_JOB_ACTOR;
  const { rows } = await safeQuery(
    `UPDATE "${schema}".pack_installations
     SET status = 'uninstalled', updated_at = NOW()
     WHERE tenant_id = $1 AND pack_code = $2
     RETURNING *`,
    [tenantId, packCode],
  ).catch((e: any) => { logger.warn('[packs] uninstall query failed', { error: (e as Error).message }); return { rows: [] }; });
  if (rows.length === 0) return { pack_code: packCode, status: 'failed', tenant_id: tenantId };
  const record = rows[0];

  recordAudit({
    tenantId, userId: uid, module: 'packs', action: 'delete',
    entityType: 'pack_installation', entityId: packCode,
    afterState: { packCode, status: 'uninstalled' },
  }).catch((e: any) => logger.warn('[packs] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: uid, module: 'packs', event: 'pack.uninstalled',
      entityType: 'pack_installation', entityId: packCode,
      data: { packCode },
    } as any)).catch((e: any) => logger.warn('[packs] event emission failed', { error: (e as Error).message }));

  notifyDomainChange(tenantId, 'packs', 'delete', packCode);

  logger.info('[packs] pack uninstalled', { tenantId, packCode });

  return record;
}
