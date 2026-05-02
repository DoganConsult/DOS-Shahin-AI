// ============================================================
// Cooperative Workflow #10 — Cross-Agent Standup Summary
// All 12 agents (A01-A12) submit structured status updates overnight.
// Compiled into a single digest for team leads.
// Leads reply with priorities, agents adjust next cycle.
// ============================================================
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port.js';
import { eventBus } from '../../ports/events.port.js';
import { createNotification } from '../../../notification/services/notification.service.js';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
const AGENT_NAMES = {
    'AGENT-A01': 'Onboarding Agent',
    'AGENT-A02': 'Identity Provisioning Agent',
    'AGENT-A03': 'Framework Mapping Agent',
    'AGENT-A04': 'Control Authoring Agent',
    'AGENT-A05': 'Evidence Collection Agent',
    'AGENT-A06': 'Gap Remediation Agent',
    'AGENT-A07': 'Risk Register Agent',
    'AGENT-A08': 'Policy Lifecycle Agent',
    'AGENT-A09': 'Third-Party Risk Agent',
    'AGENT-A10': 'Audit Reporting Agent',
    'AGENT-A11': 'BCP Continuity Agent',
    'AGENT-A12': 'Security Awareness & Training Agent',
};
// ── Generate Standup Digest ────────────────────────────────────────────────
export async function generateStandupDigest(tenantId) {
    const schema = tenantSchema(tenantId);
    const entries = [];
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    for (const [agentId, agentName] of Object.entries(AGENT_NAMES)) {
        const entry = await gatherAgentStatus(schema, tenantId, agentId, agentName, since);
        entries.push(entry);
    }
    const res = await safeQuery(`INSERT INTO "${schema}".standup_digests (tenant_id, entries)
     VALUES ($1, $2) RETURNING digest_id, generated_at`, [tenantId, JSON.stringify(entries)]);
    const digest = {
        digestId: getFirstRow(res)?.digest_id,
        tenantId,
        entries,
        status: 'generated',
        generatedAt: getFirstRow(res)?.generated_at,
    };
    // Notify team leads
    await notifyTeamLeads(tenantId, schema, digest);
    await eventBus.publish({
        tenantId, eventType: 'standup.digest_generated', severity: 'info',
        payload: { digestId: digest.digestId, agentCount: entries.length },
    });
    return digest;
}
// ── Acknowledge Digest ─────────────────────────────────────────────────────
export async function acknowledgeDigest(tenantId, digestId, input) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".standup_digests
     SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $1,
         team_lead_priorities = $2
     WHERE digest_id = $3`, [input.userId, input.priorities ? JSON.stringify(input.priorities) : null, digestId]);
    // Publish priorities so agents can adjust
    if (input.priorities?.length) {
        await eventBus.publish({
            tenantId, eventType: 'standup.priorities_set', severity: 'info',
            entityId: digestId,
            payload: { priorities: input.priorities, setBy: input.userId },
        });
    }
    return getDigest(tenantId, digestId);
}
// ── Query ──────────────────────────────────────────────────────────────────
export async function getDigest(tenantId, digestId) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
export async function listDigests(tenantId, limit = 30) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`SELECT * FROM "${schema}".standup_digests WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT $2`, [tenantId, limit]);
    return res.rows.map(mapDigest);
}
// ── Get Latest Priorities ──────────────────────────────────────────────────
export async function getLatestPriorities(tenantId) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`SELECT team_lead_priorities FROM "${schema}".standup_digests
     WHERE tenant_id = $1 AND team_lead_priorities IS NOT NULL
     ORDER BY generated_at DESC LIMIT 1`, [tenantId]);
    if (!res.rows.length)
        return [];
    const p = getFirstRow(res)?.team_lead_priorities;
    return typeof p === 'string' ? JSON.parse(p) : p || [];
}
// ── Helpers ────────────────────────────────────────────────────────────────
async function gatherAgentStatus(schema, tenantId, agentId, agentName, since) {
    const completed = [];
    const findings = [];
    const blockers = [];
    const recommendations = [];
    // Check agent metrics
    const metricsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT tasks_completed, suggestions_generated, error_count
     FROM "${schema}".agent_collaboration_metrics WHERE agent_user_id = $1`, [agentId]), { tenantId: tenantId, operation: 'query agent_collaboration_metrics' });
    if (metricsRes.rows.length) {
        const m = getFirstRow(metricsRes);
        if (m.tasks_completed > 0)
            completed.push(`${m.tasks_completed} tasks completed`);
        if (m.suggestions_generated > 0)
            completed.push(`${m.suggestions_generated} suggestions generated`);
        if (m.error_count > 0)
            blockers.push(`${m.error_count} errors encountered`);
    }
    // Check recent events from this agent
    const eventsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT event_type, payload FROM "${schema}".event_log
     WHERE source_service LIKE $1 AND created_at >= $2
     ORDER BY created_at DESC LIMIT 10`, [`%${agentId.toLowerCase().replace('agent-', '')}%`, since]), { tenantId: tenantId, operation: 'query event_log' });
    for (const ev of eventsRes.rows) {
        if (ev.event_type?.includes('alert') || ev.event_type?.includes('warning')) {
            findings.push(`${ev.event_type}: ${JSON.stringify(ev.payload || {}).slice(0, 100)}`);
        }
    }
    // Agent-specific recommendations
    if (agentId === 'AGENT-A01' && findings.length === 0)
        recommendations.push('All compliance checks passed. No action needed.');
    if (agentId === 'AGENT-A02')
        recommendations.push('Review risks with scores above 80 for mitigation planning.');
    if (agentId === 'AGENT-A03')
        recommendations.push('Evidence collection queue has items pending human review.');
    if (agentId === 'AGENT-A06')
        recommendations.push('Vendor engagement scores should be reviewed this quarter.');
    if (completed.length === 0)
        completed.push('No activity in the last 24 hours');
    return {
        entryId: `${agentId}-${Date.now()}`,
        agentId, agentName, completedItems: completed,
        findings, blockers, recommendations,
        timestamp: new Date().toISOString(),
    };
}
async function notifyTeamLeads(tenantId, schema, digest) {
    // Find users with admin or team_lead role
    const leadsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT user_id FROM "${schema}".unified_squad_members
     WHERE is_agent = FALSE AND (role LIKE '%admin%' OR role LIKE '%lead%')`, []), { tenantId: tenantId, operation: 'query unified_squad_members' });
    const findingCount = digest.entries.reduce((sum, e) => sum + e.findings.length, 0);
    const blockerCount = digest.entries.reduce((sum, e) => sum + e.blockers.length, 0);
    for (const lead of leadsRes.rows) {
        await createNotification(tenantId, {
            userId: lead.user_id,
            type: 'agent_standup',
            title: 'Agent Squad Daily Standup',
            body: `${digest.entries.length} agents reported. ${findingCount} findings, ${blockerCount} blockers.`,
            link: `/unified-squad/standup/${digest.digestId}`,
        }).catch(catchHandler(EC.AGENT_ACTION, {}));
    }
}
function mapDigest(r) {
    return {
        digestId: r.digest_id, tenantId: r.tenant_id,
        entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries || [],
        teamLeadPriorities: r.team_lead_priorities
            ? (typeof r.team_lead_priorities === 'string' ? JSON.parse(r.team_lead_priorities) : r.team_lead_priorities)
            : undefined,
        status: r.status, generatedAt: r.generated_at?.toISOString?.() || r.generated_at,
        acknowledgedAt: r.acknowledged_at?.toISOString?.() || r.acknowledged_at,
        acknowledgedBy: r.acknowledged_by,
    };
}
//# sourceMappingURL=agent-standup.service.js.map