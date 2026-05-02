import { safeQuery, tenantSchema, emptyResult } from '../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';

export class GovernanceAiRepository {
  async findAllSignals(tenantId: string, params: { page: number; limit: number; status?: string; severity?: string; signalType?: string }): Promise<{ rows: GenericRow[]; total: number }> {
    const schema = tenantSchema(tenantId);
    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let idx = 2;

    if (params.status) { conditions.push(`status = $${idx++}`); values.push(params.status); }
    if (params.severity) { conditions.push(`severity = $${idx++}`); values.push(params.severity); }
    if (params.signalType) { conditions.push(`signal_type = $${idx++}`); values.push(params.signalType); }

    const where = conditions.join(' AND ');
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".governance_signals WHERE ${where}`, values);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await safeQuery(
      `SELECT * FROM "${schema}".governance_signals WHERE ${where} ORDER BY detected_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, params.limit, offset],
    );
    return { rows: result.rows, total };
  }

  async findSignalById(tenantId: string, id: string): Promise<GenericRow | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".governance_signals WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return result.rows[0] ?? null;
  }

  async findInterpretation(tenantId: string, signalId: string): Promise<GenericRow | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT * FROM "${schema}".governance_interpreted_issues WHERE signal_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [signalId, tenantId],
    );
    return result.rows[0] ?? null;
  }

  async findRecommendations(tenantId: string, issueId: string): Promise<GenericRow[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT * FROM "${schema}".governance_recommendations WHERE interpreted_issue_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [issueId, tenantId],
    );
    return result.rows;
  }

  async findEscalations(tenantId: string, signalId: string): Promise<GenericRow[]> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT * FROM "${schema}".governance_escalation_events WHERE source_signal_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [signalId, tenantId],
    );
    return result.rows;
  }

  async findPipelineRuns(tenantId: string, limit: number = 20): Promise<GenericRow[]> {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT * FROM "${schema}".governance_ai_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    ), { tenantId, operation: 'query governance_ai_runs' });
    return result.rows;
  }

  async updateSignalStatus(tenantId: string, signalId: string, status: string): Promise<boolean> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `UPDATE "${schema}".governance_signals SET status = $2, updated_at = NOW() WHERE id = $1 AND tenant_id = $3`,
      [signalId, status, tenantId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
