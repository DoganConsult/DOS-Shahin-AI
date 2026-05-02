import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class PacksRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findRegistryEntries(filters: { status?: string; category?: string } = {}): Promise<GenericRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await safeQuery(`SELECT * FROM public.pack_registry ${where} ORDER BY name ASC`, params);
    return result.rows;
  }

  async findById(packId: string): Promise<GenericRow | null> {
    const result = await safeQuery(`SELECT * FROM public.pack_registry WHERE id = $1`, [packId]);
    return getFirstRow(result);
  }

  async findInstallations(tenantId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".tenant_pack_installations WHERE tenant_id = $1 ORDER BY installed_at DESC`, [tenantId]);
    return result.rows;
  }

  async createInstallation(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".tenant_pack_installations (id, tenant_id, pack_code, version, installed_by, installed_at, status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'active') RETURNING *`,
      [id, data.tenant_id, data.pack_code, data.version, data.installed_by]);
    return getFirstRow(result);
  }

  async removeInstallation(installationId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".tenant_pack_installations SET status = 'uninstalled', uninstalled_at = NOW() WHERE id = $1 RETURNING id`, [installationId]);
    return (result.rows?.length ?? 0) > 0;
  }
}
