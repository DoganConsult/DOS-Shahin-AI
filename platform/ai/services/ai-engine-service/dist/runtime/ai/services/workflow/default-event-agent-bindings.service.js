import { logger } from '../../ports/logger.port.js';
// ============================================
// AGRC-OS — Default Event→Agent Trigger Bindings
// Seeds per-tenant event_trigger_binding rows so the
// ai-event-trigger.service afterPublish hook can
// fire agents in real-time on critical domain events.
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
/**
 * Critical event→agent mappings. These are seeded per tenant during
 * provisioning so agents react to domain events in real-time
 * (seconds) instead of waiting for the hourly cron cycle.
 */
export const DEFAULT_EVENT_AGENT_BINDINGS = [
    {
        event_type: 'risk.exceeded_appetite',
        target_agent_id: 'A07',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Risk appetite breach → A07 Risk Monitor',
    },
    {
        event_type: 'control.failed',
        target_agent_id: 'A04',
        action_type: 'run_agent',
        cooldown_seconds: 1800,
        description: 'Control test failure → A04 Control Authoring',
    },
    {
        event_type: 'control.failed',
        target_agent_id: 'A06',
        action_type: 'run_agent',
        cooldown_seconds: 1800,
        description: 'Control test failure → A06 Gap Remediation',
    },
    {
        event_type: 'evidence.expired',
        target_agent_id: 'A05',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Evidence expiry → A05 Evidence Collection',
    },
    {
        event_type: 'incident.created',
        target_agent_id: 'A07',
        action_type: 'run_agent',
        cooldown_seconds: 900,
        description: 'New incident → A07 Incident Responder',
    },
    {
        event_type: 'compliance.gap_detected',
        target_agent_id: 'A06',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Compliance gap → A06 Gap Remediation',
    },
    {
        event_type: 'vendor.risk_changed',
        target_agent_id: 'A09',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Vendor risk change → A09 Vendor Risk',
    },
    {
        event_type: 'policy.violated',
        target_agent_id: 'A08',
        action_type: 'run_agent',
        cooldown_seconds: 1800,
        description: 'Policy violation → A08 Incident & Governance',
    },
    {
        event_type: 'audit.finding_created',
        target_agent_id: 'A10',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Audit finding → A10 Audit Intelligence',
    },
    {
        event_type: 'training.compliance_gap',
        target_agent_id: 'A11',
        action_type: 'run_agent',
        cooldown_seconds: 3600,
        description: 'Training compliance gap → A11 Training & Awareness',
    },
];
/**
 * Seed default event→agent bindings for a tenant.
 * Uses upsert logic to avoid duplicates on re-provisioning.
 * Returns count of newly seeded bindings.
 */
export async function seedDefaultEventAgentBindings(tenantId) {
    const schema = tenantSchema(tenantId);
    let seeded = 0;
    for (const b of DEFAULT_EVENT_AGENT_BINDINGS) {
        try {
            const exists = await safeQuery(`SELECT 1 FROM "${schema}".event_trigger_binding
         WHERE tenant_id = $1 AND event_type = $2 AND target_agent_id = $3
         LIMIT 1`, [tenantId, b.event_type, b.target_agent_id]);
            if (exists.rows.length === 0) {
                await safeQuery(`INSERT INTO "${schema}".event_trigger_binding
             (tenant_id, event_type, target_agent_id, action_type,
              condition_json, enabled, cooldown_seconds)
           VALUES ($1, $2, $3, $4, '{}', TRUE, $5)`, [tenantId, b.event_type, b.target_agent_id, b.action_type, b.cooldown_seconds]);
                seeded++;
            }
        }
        catch {
            // Table may not exist in older schemas — skip gracefully
        }
    }
    if (seeded > 0) {
        logger.info(`[EventBindings] Seeded ${seeded} default event→agent bindings for tenant ${tenantId}`);
    }
    return seeded;
}
//# sourceMappingURL=default-event-agent-bindings.service.js.map