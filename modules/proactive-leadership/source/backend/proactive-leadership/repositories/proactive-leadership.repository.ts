import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class ProactiveLeadershipRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findInsights(filters: { severity?: string; limit?: number } = {}): Promise<GenericRow[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    const limit = Math.min(50, filters.limit || 20);
    params.push(limit);
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".proactive_leadership_insights WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx}`, params);
    return result.rows;
  }

  async findAlerts(filters: { acknowledged?: boolean } = {}): Promise<GenericRow[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.acknowledged !== undefined) { conditions.push(`acknowledged = $${idx++}`); params.push(filters.acknowledged); }
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".proactive_leadership_alerts WHERE ${conditions.join(' AND ')} ORDER BY triggered_at DESC LIMIT 50`, params);
    return result.rows;
  }

  async createInsight(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".proactive_leadership_insights (id, tenant_id, insight_type, title, summary, severity, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [id, data.tenant_id, data.insight_type, data.title, data.summary, data.severity, JSON.stringify(data.data)]);
    return getFirstRow(result);
  }

  async createAlert(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".proactive_leadership_alerts (id, tenant_id, alert_type, title, message, severity, triggered_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [id, data.tenant_id, data.alert_type, data.title, data.message, data.severity]);
    return getFirstRow(result);
  }
}
