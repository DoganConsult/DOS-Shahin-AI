// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
/** Inline team CRUD — DOS foundation scope (team module deleted, tables remain). */
async function createTeam(tenantId, data) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`INSERT INTO "${schema}".teams (team_code, name_en, team_type, active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (team_code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING team_id, team_code, name_en`, [data.team_code, data.name_en, data.team_type || 'operational']);
    return res.rows[0];
}
async function addMember(tenantId, teamId, userId, role) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".team_members (team_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`, [teamId, userId, role]);
}
import { getAgentCatalog } from '../../ports/platform.port';
const DOMAIN_TO_STEP = {
    onboarding: 'onboarding', 'identity & rbac': 'identity', frameworks: 'framework',
    controls: 'control', evidence: 'evidence', roadmaps: 'compliance',
    'risk scoring': 'risk', governance: 'policy', 'third-party': 'vendor',
    'audit reports': 'audit', 'business continuity': 'bcp',
    'training & awareness': 'training',
};
function _buildAgentStepMap() {
    const catalog = getAgentCatalog();
    return Object.fromEntries(catalog.map(a => {
        const stepKey = DOMAIN_TO_STEP[a.domain.toLowerCase()] || a.id.toLowerCase();
        return [stepKey, a.id];
    }));
}
// Proxy provides dynamic map from catalog + legacy alias (incident → A06); no Object.assign to avoid redefine errors
export const AGENT_STEP_MAP = new Proxy({}, {
    get(_, prop) { return { ..._buildAgentStepMap(), incident: 'A06' }[prop]; },
    has(_, prop) { return prop in { ..._buildAgentStepMap(), incident: 'A06' }; },
    ownKeys() { return Object.keys({ ..._buildAgentStepMap(), incident: 'A06' }); },
    getOwnPropertyDescriptor(_, prop) {
        const map = { ..._buildAgentStepMap(), incident: 'A06' };
        if (prop in map)
            return { value: map[prop], enumerable: true, configurable: true };
        return undefined;
    },
});
export const DEFAULT_AGENT = "A06";
const AGENT_SPECIALIZATIONS = {
    A01: 'User onboarding and organizational profiling',
    A02: 'Identity provisioning and access management',
    A03: 'Framework mapping and crosswalk analysis',
    A04: 'Control authoring and test procedure generation',
    A05: 'Evidence collection and validation',
    A06: 'Gap analysis, remediation planning, and incident triage',
    A07: 'Enterprise risk identification, scoring, and treatment',
    A08: 'Policy drafting, review, and lifecycle management',
    A09: 'Vendor risk assessment and monitoring',
    A10: 'Audit preparation, reporting, and findings',
    A11: 'Business continuity planning, exercises, and RTO/RPO monitoring',
    A12: 'Security awareness programs, training campaigns, and completion tracking',
};
const AGENT_TEAM_ROLES = {
    A01: 'member', A02: 'member', A05: 'member',
};
const _catalog = (() => { try {
    const c = getAgentCatalog();
    return Array.isArray(c) ? c : [];
}
catch {
    return [];
} })();
export const AI_AGENT_DEFINITIONS = _catalog.map(a => ({
    userId: `ai-agent-${a.id.toLowerCase()}`,
    agentId: a.id,
    nameEn: a.name,
    nameAr: a.nameAr,
    role: DOMAIN_TO_STEP[a.domain.toLowerCase()] || a.id.toLowerCase(),
    specialization: AGENT_SPECIALIZATIONS[a.id] || `${a.domain} automation`,
    teamRole: (AGENT_TEAM_ROLES[a.id] || 'reviewer'),
}));
const AI_SQUAD_TEAM_ID = "ai-squad-team";
const VALID_TRANSITIONS = {
    idle: ["working", "disabled"],
    working: ["completed", "error", "idle"],
    completed: ["idle", "disabled"],
    error: ["idle", "disabled"],
    disabled: ["idle"],
};
export function resolveAgentForStep(stepSubType) {
    const prefix = stepSubType.split("_")[0]?.toLowerCase() || "";
    return AGENT_STEP_MAP[prefix] || DEFAULT_AGENT;
}
export function isValidStatusTransition(from, to) {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
export async function seedAIAgents(tenantId) {
    let seeded = 0;
    let teamCreated = false;
    for (const agent of AI_AGENT_DEFINITIONS) {
        const existing = await safeQuery(`SELECT user_id FROM users WHERE user_id = $1`, [agent.userId]);
        if (existing.rows.length === 0) {
            await safeQuery(`INSERT INTO users (user_id, email, password_hash, name, tenant_id, role, user_type, agent_id, onboarding_complete)
         VALUES ($1, $2, 'AI_AGENT_NO_PASSWORD', $3, $4, 'agent', 'ai_agent', $5, TRUE)`, [agent.userId, `${agent.userId}@ai.shahin.grc`, agent.nameEn, tenantId, agent.agentId]);
            seeded++;
        }
    }
    const schema = tenantSchema(tenantId);
    const teamExists = await safeQuery(`SELECT team_id FROM ${schema}.teams WHERE team_id = $1`, [AI_SQUAD_TEAM_ID]);
    if (teamExists.rows.length === 0) {
        const adminResult = await safeQuery(`SELECT user_id FROM users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1`, [tenantId]);
        const teamLead = adminResult.rows[0]?.user_id || AI_AGENT_DEFINITIONS[0].userId;
        try {
            await createTeam(tenantId, {
                team_code: 'ai-squad',
                name_en: "AI Squad Team",
                team_type: 'ai',
            });
            teamCreated = true;
        }
        catch {
            await safeQuery(`INSERT INTO ${schema}.teams (team_id, team_code, name_en, name_ar, description_en, description_ar, team_lead_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (team_id) DO UPDATE SET
           name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
           description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar
         WHERE (teams.name_en, teams.description_en) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.description_en)`, [AI_SQUAD_TEAM_ID, "ai_squad_team", "AI Squad Team", "فريق الذكاء الاصطناعي", "Autonomous AI agent team — 10 specialist agents operating as employees", "فريق وكلاء الذكاء الاصطناعي المستقل — 10 وكلاء متخصصين يعملون كموظفين", teamLead]);
            teamCreated = true;
        }
        for (const agent of AI_AGENT_DEFINITIONS) {
            try {
                await addMember(tenantId, AI_SQUAD_TEAM_ID, agent.userId, agent.teamRole);
            }
            catch {
                // ignore duplicates
            }
        }
    }
    return { seeded, teamCreated };
}
export async function getAISquad(tenantId) {
    const schema = tenantSchema(tenantId);
    const agents = [];
    for (const def of AI_AGENT_DEFINITIONS) {
        const stats = await getAgentStats(schema, def.userId, def.agentId);
        const latestStatus = await getLatestAgentStatus(schema, def.userId);
        agents.push({
            userId: def.userId,
            agentId: def.agentId,
            nameEn: def.nameEn,
            nameAr: def.nameAr,
            role: def.role,
            specialization: def.specialization,
            status: latestStatus,
            totalTasksCompleted: stats.totalCompleted,
            successRate: stats.successRate,
            avgResponseTimeMs: stats.avgResponseTimeMs,
            lastActiveAt: stats.lastActiveAt,
        });
    }
    return {
        teamId: AI_SQUAD_TEAM_ID,
        nameEn: "AI Squad Team",
        nameAr: "فريق الذكاء الاصطناعي",
        agents,
    };
}
export async function getAgentProfile(tenantId, agentId) {
    const def = AI_AGENT_DEFINITIONS.find((a) => a.agentId === agentId);
    if (!def)
        return null;
    const schema = tenantSchema(tenantId);
    const stats = await getAgentStats(schema, def.userId, def.agentId);
    const latestStatus = await getLatestAgentStatus(schema, def.userId);
    return {
        userId: def.userId,
        agentId: def.agentId,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        role: def.role,
        specialization: def.specialization,
        status: latestStatus,
        totalTasksCompleted: stats.totalCompleted,
        successRate: stats.successRate,
        avgResponseTimeMs: stats.avgResponseTimeMs,
        lastActiveAt: stats.lastActiveAt,
    };
}
export async function logAgentStatus(tenantId, agentUserId, agentId, previousStatus, newStatus, detail) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".ai_agent_status_log
      (agent_user_id, agent_id, previous_status, new_status, workflow_execution_id, step_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        agentUserId,
        agentId,
        previousStatus,
        newStatus,
        detail?.workflowExecutionId || null,
        detail?.stepId || null,
        JSON.stringify(detail || {}),
    ]);
    await recordAudit({
        tenantId,
        userId: agentUserId,
        module: "ai_squad",
        action: "update",
        entityType: "agent_status",
        entityId: agentId,
        afterState: { previousStatus, newStatus, detail },
    });
}
export async function getAgentStatusLog(tenantId, agentId, limit = 50, offset = 0) {
    const schema = tenantSchema(tenantId);
    const def = AI_AGENT_DEFINITIONS.find((a) => a.agentId === agentId);
    if (!def)
        return { logs: [], count: 0 };
    const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}".ai_agent_status_log WHERE agent_user_id = $1`, [def.userId]);
    const count = parseInt(countResult.rows[0]?.total || "0", 10);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_status_log
     WHERE agent_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [def.userId, limit, offset]);
    const logs = result.rows.map((r) => ({
        logId: r.log_id,
        agentUserId: r.agent_user_id,
        agentId: r.agent_id,
        previousStatus: r.previous_status,
        newStatus: r.new_status,
        workflowExecutionId: r.workflow_execution_id,
        stepId: r.step_id,
        detail: r.detail || {},
        createdAt: r.created_at,
    }));
    return { logs, count };
}
async function getAgentStats(schema, agentUserId, _agentId) {
    try {
        const execResult = await safeQuery(`SELECT
         COUNT(*) FILTER (WHERE status IN ('completed', 'pending_review')) as total_completed,
         COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
         AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) * 1000) FILTER (WHERE reviewed_at IS NOT NULL) as avg_response_ms,
         MAX(created_at) as last_active
       FROM "${schema}".ai_step_executions
       WHERE agent_user_id = $1`, [agentUserId]);
        const row = execResult.rows[0];
        const completed = parseInt(row?.total_completed || "0", 10);
        const failed = parseInt(row?.total_failed || "0", 10);
        const total = completed + failed;
        return {
            totalCompleted: completed,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
            avgResponseTimeMs: Math.round(parseFloat(row?.avg_response_ms || "0")),
            lastActiveAt: row?.last_active || null,
        };
    }
    catch {
        return { totalCompleted: 0, successRate: 100, avgResponseTimeMs: 0, lastActiveAt: null };
    }
}
async function getLatestAgentStatus(schema, agentUserId) {
    try {
        const result = await safeQuery(`SELECT new_status FROM "${schema}".ai_agent_status_log
       WHERE agent_user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`, [agentUserId]);
        return result.rows[0]?.new_status || "idle";
    }
    catch {
        return "idle";
    }
}
//# sourceMappingURL=ai-squad.service.js.map