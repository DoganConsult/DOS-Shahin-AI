import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
export async function getActiveAlerts(tenantId, severity) {
    const schema = tenantSchema(tenantId);
    try {
        const conditions = ['acknowledged_at IS NULL'];
        const params = [];
        if (severity) {
            params.push(severity);
            conditions.push(`severity = $${params.length}`);
        }
        const { rows } = await safeQuery(`SELECT * FROM "${schema}".ai_activity_alerts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`, params);
        return rows;
    }
    catch (err) {
        logger.warn(`[ActivityAlerts] getActiveAlerts failed: ${err instanceof Error ? err.message : String(err)}`);
        return [];
    }
}
export async function evaluateAlertRules(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`CREATE TABLE IF NOT EXISTS "${schema}".ai_activity_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT $1::uuid,
        alert_type VARCHAR(50) NOT NULL DEFAULT 'system',
        severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
        message TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        acknowledged_by VARCHAR(100),
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, [tenantId]);
        await safeQuery(`CREATE TABLE IF NOT EXISTS "${schema}".ai_alert_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT $1::uuid,
        rule_name VARCHAR(100) NOT NULL,
        condition_type VARCHAR(50) NOT NULL,
        condition_config JSONB DEFAULT '{}',
        severity VARCHAR(20) DEFAULT 'warning',
        message_template TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, [tenantId]);
        const { rows: rules } = await safeQuery(`SELECT * FROM "${schema}".ai_alert_rules WHERE is_active = true`, []);
        const newAlerts = [];
        for (const rule of rules) {
            try {
                const condType = rule.condition_type;
                const config = rule.condition_config || {};
                let triggered = false;
                let message = rule.message_template || `Alert rule "${rule.rule_name}" triggered`;
                if (condType === 'denied_count_threshold') {
                    const threshold = config.threshold || 50;
                    const hours = Math.max(1, Math.min(168, parseInt(config.hours || '24', 10)));
                    const { rows } = await safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".role_usage_audit WHERE result = 'denied' AND created_at > NOW() - make_interval(hours => $1)`, [hours]);
                    if (Number(rows[0]?.cnt || 0) >= threshold) {
                        triggered = true;
                        message = `${rows[0].cnt} denied permission checks in last ${hours}h (threshold: ${threshold})`;
                    }
                }
                if (triggered) {
                    const { rows: alertRows } = await safeQuery(`INSERT INTO "${schema}".ai_activity_alerts (tenant_id, alert_type, severity, message, metadata)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`, [tenantId, rule.condition_type, rule.severity || 'warning', message, JSON.stringify({ ruleId: rule.id, ruleName: rule.rule_name })]);
                    if (alertRows[0])
                        newAlerts.push(alertRows[0]);
                }
            }
            catch (err) {
                logger.warn(`[ActivityAlerts] Rule evaluation failed for ${rule.id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return newAlerts;
    }
    catch (err) {
        logger.warn(`[ActivityAlerts] evaluateAlertRules failed: ${err instanceof Error ? err.message : String(err)}`);
        return [];
    }
}
export async function upsertAlertRule(tenantId, data) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".ai_alert_rules (id, tenant_id, rule_name, condition_type, condition_config, severity, message_template)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       rule_name = EXCLUDED.rule_name,
       condition_type = EXCLUDED.condition_type,
       condition_config = EXCLUDED.condition_config,
       severity = EXCLUDED.severity,
       message_template = EXCLUDED.message_template,
       updated_at = NOW()`, [data.ruleId || null, tenantId, data.ruleName, data.conditionType, JSON.stringify(data.conditionConfig || {}), data.severity || 'warning', data.messageTemplate || null]);
}
export async function acknowledgeAlert(tenantId, alertId, userId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_activity_alerts SET acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2`, [userId, alertId]);
}
//# sourceMappingURL=activity-alerts.service.js.map