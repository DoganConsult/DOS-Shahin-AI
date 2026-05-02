// ============================================
// AGRC-OS — Control Monitoring Admin Service
// CRUD for monitoring rules and alert
// management (list, acknowledge).
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MonitoringRule {
  id: string;
  control_id: string | null;
  name: string;
  description: string | null;
  rule_type: string;
  condition: string;
  threshold: number | null;
  severity: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleData {
  control_id?: string;
  name: string;
  description?: string;
  rule_type: string;
  condition: string;
  threshold?: number;
  severity: string;
  created_by: string;
}

export interface UpdateRuleData {
  name?: string;
  description?: string;
  rule_type?: string;
  condition?: string;
  threshold?: number;
  severity?: string;
  enabled?: boolean;
}

export interface MonitoringAlert {
  id: string;
  control_id: string;
  rule_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  status: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlMonitoringAdminService {
  /**
   * Lists all monitoring rules for the tenant.
   */
  async listRules(tenantId: string): Promise<MonitoringRule[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT id, control_id, name, description, rule_type,
              condition, threshold, severity, enabled, created_at, updated_at
         FROM ${schema}.control_monitoring_rules
        ORDER BY created_at DESC`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      control_id: r.control_id,
      name: r.name,
      description: r.description,
      rule_type: r.rule_type,
      condition: r.condition,
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Creates a new monitoring rule.
   */
  async createRule(
    tenantId: string,
    data: CreateRuleData
  ): Promise<{ ruleId: string }> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `INSERT INTO ${schema}.control_monitoring_rules
         (control_id, name, description, rule_type, condition,
          threshold, severity, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       RETURNING id`,
      [
        data.control_id ?? null,
        data.name,
        data.description ?? null,
        data.rule_type,
        data.condition,
        data.threshold ?? null,
        data.severity,
        data.created_by,
      ]
    );

    return { ruleId: result.rows[0].id };
  }

  /**
   * Updates an existing monitoring rule. Only provided fields are updated.
   */
  async updateRule(
    tenantId: string,
    ruleId: string,
    data: UpdateRuleData
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Build SET clause dynamically from provided fields
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    const fields: Array<[keyof UpdateRuleData, string]> = [
      ["name", "name"],
      ["description", "description"],
      ["rule_type", "rule_type"],
      ["condition", "condition"],
      ["threshold", "threshold"],
      ["severity", "severity"],
      ["enabled", "enabled"],
    ];

    for (const [key, col] of fields) {
      if (data[key] !== undefined) {
        setClauses.push(`${col} = $${paramIdx}`);
        params.push(data[key]);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return; // Nothing to update
    }

    // Always update the timestamp
    setClauses.push("updated_at = NOW()");

    params.push(ruleId);

    await safeQuery(
      `UPDATE ${schema}.control_monitoring_rules
          SET ${setClauses.join(", ")}
        WHERE id = $${paramIdx}`,
      params
    );
  }

  /**
   * Soft-deletes a monitoring rule by disabling it and marking deleted_at.
   */
  async deleteRule(tenantId: string, ruleId: string): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `UPDATE ${schema}.control_monitoring_rules
          SET enabled = false,
              deleted_at = NOW()
        WHERE id = $1`,
      [ruleId]
    );
  }

  /**
   * Lists all monitoring alerts for the tenant, ordered by most recent.
   */
  async listAlerts(tenantId: string): Promise<MonitoringAlert[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT id, control_id, rule_id, alert_type, severity,
              message, status, acknowledged_by, acknowledged_at, created_at
         FROM ${schema}.control_monitoring_alerts
        ORDER BY created_at DESC
        LIMIT 200`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      control_id: r.control_id,
      rule_id: r.rule_id,
      alert_type: r.alert_type,
      severity: r.severity,
      message: r.message,
      status: r.status,
      acknowledged_by: r.acknowledged_by,
      acknowledged_at: r.acknowledged_at,
      created_at: r.created_at,
    }));
  }

  /**
   * Acknowledges an alert by recording the user and timestamp.
   */
  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    userId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `UPDATE ${schema}.control_monitoring_alerts
          SET status = 'acknowledged',
              acknowledged_by = $1,
              acknowledged_at = NOW()
        WHERE id = $2`,
      [userId, alertId]
    );
  }
}
