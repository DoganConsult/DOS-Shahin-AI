import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { ControlAutomationStateRecord, ControlAutomationLevel } from '../../types/controls.types.js';

export interface UpsertAutomationStateInput {
  automation_level: ControlAutomationLevel;
  tool_name?: string;
  tool_integration_id?: string;
  next_run_at?: string;
  alert_on_failure?: boolean;
  updated_by?: string;
}

export interface RecordAutomationRunInput {
  result: string;
  run_at?: string;
}

export interface AutomationCoverageSummary {
  total_active: number;
  manual_count: number;
  semi_automated_count: number;
  automated_count: number;
  healthy_count: number;
  degraded_count: number;
  failing_count: number;
  unknown_count: number;
  automation_coverage_pct: number;
}

export class ControlAutomationStateService {
  async getAutomationState(tenantId: string, controlId: string): Promise<ControlAutomationStateRecord | null> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT id, control_id, automation_level, tool_name, tool_integration_id,
              last_run_at, last_run_result, next_run_at, health_status,
              alert_on_failure, updated_at
         FROM ${schema}.control_automation_state
        WHERE control_id = $1`,
      [controlId]
    );
    return (result.rows[0] as ControlAutomationStateRecord) ?? null;
  }

  async upsertAutomationState(
    tenantId: string,
    controlId: string,
    input: UpsertAutomationStateInput
  ): Promise<ControlAutomationStateRecord> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `INSERT INTO ${schema}.control_automation_state
         (control_id, automation_level, tool_name, tool_integration_id,
          next_run_at, alert_on_failure, health_status)
       VALUES ($1,$2,$3,$4,$5,$6,'unknown')
       ON CONFLICT (control_id) DO UPDATE SET
         automation_level     = EXCLUDED.automation_level,
         tool_name            = COALESCE(EXCLUDED.tool_name, control_automation_state.tool_name),
         tool_integration_id  = COALESCE(EXCLUDED.tool_integration_id, control_automation_state.tool_integration_id),
         next_run_at          = COALESCE(EXCLUDED.next_run_at, control_automation_state.next_run_at),
         alert_on_failure     = EXCLUDED.alert_on_failure,
         updated_at           = NOW()
       RETURNING *`,
      [
        controlId,
        input.automation_level,
        input.tool_name ?? null,
        input.tool_integration_id ?? null,
        input.next_run_at ?? null,
        input.alert_on_failure ?? false,
      ]
    );

    await safeQuery(
      `UPDATE ${schema}.controls
          SET automation_level = $1, updated_at = NOW()
        WHERE control_id = $2 AND deleted_at IS NULL`,
      [input.automation_level, controlId]
    );

    return result.rows[0] as ControlAutomationStateRecord;
  }

  async recordRun(
    tenantId: string,
    controlId: string,
    input: RecordAutomationRunInput
  ): Promise<void> {
    const schema = tenantSchema(tenantId);
    const runAt = input.run_at ?? new Date().toISOString();
    const healthStatus = input.result === 'pass' ? 'healthy' : input.result === 'degraded' ? 'degraded' : 'failing';

    await safeQuery(
      `UPDATE ${schema}.control_automation_state
          SET last_run_at = $1, last_run_result = $2, health_status = $3, updated_at = NOW()
        WHERE control_id = $4`,
      [runAt, input.result, healthStatus, controlId]
    );
  }

  async getFailingAutomations(tenantId: string): Promise<Array<{ control_id: string; title: string; health_status: string; last_run_at: string | null }>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT c.control_id, c.title, a.health_status, a.last_run_at
         FROM ${schema}.controls c
         JOIN ${schema}.control_automation_state a ON a.control_id = c.control_id
        WHERE c.deleted_at IS NULL
          AND a.health_status IN ('failing', 'degraded')
        ORDER BY a.last_run_at ASC NULLS FIRST`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      control_id: r.control_id,
      title: r.title,
      health_status: r.health_status,
      last_run_at: r.last_run_at ?? null,
    }));
  }

  async getCoverageSummary(tenantId: string): Promise<AutomationCoverageSummary> {
    const schema = tenantSchema(tenantId);

    const [totalResult, levelResult, healthResult] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS total FROM ${schema}.controls WHERE deleted_at IS NULL AND status = 'active'`,
        []
      ),
      safeQuery(
        `SELECT c.automation_level, COUNT(*)::int AS cnt
           FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL AND c.status = 'active'
          GROUP BY c.automation_level`,
        []
      ),
      safeQuery(
        `SELECT a.health_status, COUNT(*)::int AS cnt
           FROM ${schema}.control_automation_state a
           JOIN ${schema}.controls c ON c.control_id = a.control_id
          WHERE c.deleted_at IS NULL AND c.status = 'active'
          GROUP BY a.health_status`,
        []
      ),
    ]);

    const total = totalResult.rows[0]?.total ?? 0;

    const levelMap: Record<string, number> = {};
    for (const r of levelResult.rows) {
      levelMap[r.automation_level ?? 'manual'] = r.cnt;
    }

    const healthMap: Record<string, number> = {};
    for (const r of healthResult.rows) {
      healthMap[r.health_status] = r.cnt;
    }

    const automated = levelMap['automated'] ?? 0;
    const semiAutomated = levelMap['semi_automated'] ?? 0;
    const automationCoverage = total > 0 ? Math.round(((automated + semiAutomated) / total) * 100) : 0;

    return {
      total_active: total,
      manual_count: levelMap['manual'] ?? 0,
      semi_automated_count: semiAutomated,
      automated_count: automated,
      healthy_count: healthMap['healthy'] ?? 0,
      degraded_count: healthMap['degraded'] ?? 0,
      failing_count: healthMap['failing'] ?? 0,
      unknown_count: healthMap['unknown'] ?? 0,
      automation_coverage_pct: automationCoverage,
    };
  }
}
