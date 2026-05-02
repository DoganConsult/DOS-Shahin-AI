// @ts-nocheck
// ============================================================
// Cooperative Workflow #2 — Live Co-Drafting (A04 + Human)
// Agent generates first draft with inline questions,
// human resolves uncertain sections, agent learns style.
// ============================================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { eventBus } from '../../ports/events.port.js';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service.js';
import { randomUUID } from 'crypto';
import { getFirstRow } from '@dos/db';
// ── Start Co-Draft Session ─────────────────────────────────────────────────
export async function startCoDraftSession(tenantId, input) {
    const schema = tenantSchema(tenantId);
    // Generate initial draft with uncertain sections
    const { draftContent, uncertainSections } = generateInitialDraft(input.entityType, input.context);
    const res = await safeQuery(`INSERT INTO "${schema}".co_draft_sessions
       (entity_type, entity_id, agent_id, human_user_id, draft_content, uncertain_sections)
     VALUES ($1,$2,'AGENT-A04',$3,$4,$5) RETURNING session_id, created_at, updated_at`, [input.entityType, input.entityId, input.humanUserId, draftContent, JSON.stringify(uncertainSections)]);
    await eventBus.publish({
        tenantId, eventType: 'codraft.session_started', severity: 'info',
        entityId: getFirstRow(res)?.session_id,
        payload: { entityType: input.entityType, questionsCount: uncertainSections.length },
    });
    return {
        sessionId: getFirstRow(res)?.session_id,
        entityType: input.entityType,
        entityId: input.entityId,
        agentId: 'AGENT-A04',
        humanUserId: input.humanUserId,
        status: 'drafting',
        draftContent,
        uncertainSections,
        humanResolutions: [],
        createdAt: getFirstRow(res)?.created_at,
    };
}
// ── Resolve Question ───────────────────────────────────────────────────────
export async function resolveQuestion(tenantId, sessionId, resolution) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
// ── Finalize Session ───────────────────────────────────────────────────────
export async function finalizeSession(tenantId, sessionId, userId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".co_draft_sessions SET status = 'finalized', updated_at = NOW() WHERE session_id = $1`, [sessionId]);
    await recordAudit({
        tenantId, userId, module: 'cooperative-workflows',
        action: 'update', entityType: 'co_draft_session', entityId: sessionId,
        afterState: { status: 'finalized' },
    });
    return getSession(tenantId, sessionId);
}
// ── Get Session ────────────────────────────────────────────────────────────
export async function getSession(tenantId, sessionId) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
export async function listSessions(tenantId, userId) {
    const schema = tenantSchema(tenantId);
    const where = userId ? `WHERE human_user_id = $1` : '';
    const params = userId ? [userId] : [];
    const res = await safeQuery(`SELECT * FROM "${schema}".co_draft_sessions ${where} ORDER BY updated_at DESC LIMIT 50`, params);
    return res.rows.map(mapSession);
}
// ── Helpers ────────────────────────────────────────────────────────────────
function generateInitialDraft(entityType, context) {
    const questions = [];
    let draft = '';
    if (entityType === 'policy') {
        draft = `# Policy Document\n\n## 1. Purpose\nThis policy establishes the framework for [SCOPE_PLACEHOLDER].\n\n## 2. Scope\n[SCOPE_QUESTION]\n\n## 3. Policy Statements\n3.1 [STATEMENT_PLACEHOLDER]\n\n## 4. Roles & Responsibilities\n[ROLES_QUESTION]\n\n## 5. Compliance\nNon-compliance with this policy may result in [ENFORCEMENT_QUESTION].`;
        questions.push({ questionId: randomUUID(), sectionRef: 'SCOPE_QUESTION', questionText: 'What organizational units does this policy cover?', suggestedOptions: ['All departments', 'IT department only', 'Customer-facing units', 'Custom scope'], resolved: false }, { questionId: randomUUID(), sectionRef: 'ROLES_QUESTION', questionText: 'Who is the primary policy owner?', suggestedOptions: ['CISO', 'Compliance Officer', 'Department Head', 'Board-level sponsor'], resolved: false }, { questionId: randomUUID(), sectionRef: 'ENFORCEMENT_QUESTION', questionText: 'What enforcement mechanism applies?', suggestedOptions: ['Disciplinary action', 'Access revocation', 'Formal warning', 'Custom enforcement'], resolved: false });
    }
    else if (entityType === 'procedure') {
        draft = `# Procedure Document\n\n## 1. Objective\n[OBJECTIVE_QUESTION]\n\n## 2. Steps\n2.1 Initiate process\n2.2 [STEPS_PLACEHOLDER]\n2.3 Review and approve\n\n## 3. Frequency\n[FREQUENCY_QUESTION]`;
        questions.push({ questionId: randomUUID(), sectionRef: 'OBJECTIVE_QUESTION', questionText: 'What is the primary objective of this procedure?', suggestedOptions: ['Risk mitigation', 'Compliance verification', 'Incident handling', 'Custom objective'], resolved: false }, { questionId: randomUUID(), sectionRef: 'FREQUENCY_QUESTION', questionText: 'How often should this procedure be executed?', suggestedOptions: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'On-demand'], resolved: false });
    }
    else {
        draft = `# Control Description\n\n## Control Objective\n[OBJECTIVE_QUESTION]\n\n## Implementation\n[IMPL_PLACEHOLDER]\n\n## Testing Approach\n[TESTING_QUESTION]`;
        questions.push({ questionId: randomUUID(), sectionRef: 'OBJECTIVE_QUESTION', questionText: 'What risk does this control mitigate?', suggestedOptions: ['Unauthorized access', 'Data loss', 'Regulatory non-compliance', 'Custom risk'], resolved: false }, { questionId: randomUUID(), sectionRef: 'TESTING_QUESTION', questionText: 'How should this control be tested?', suggestedOptions: ['Automated scan', 'Manual review', 'Sampling', 'Continuous monitoring'], resolved: false });
    }
    if (context)
        draft = `${draft}\n\n<!-- Context: ${context} -->`;
    return { draftContent: draft, uncertainSections: questions };
}
function applyResolution(draft, questionId, chosen, freeText) {
    const value = freeText || chosen;
    // Replace first placeholder found — simplified approach
    return draft.replace(/\[([A-Z_]+QUESTION)\]/, value);
}
function mapSession(r) {
    return {
        sessionId: r.session_id, entityType: r.entity_type, entityId: r.entity_id,
        agentId: r.agent_id, humanUserId: r.human_user_id, status: r.status,
        draftContent: r.draft_content,
        uncertainSections: typeof r.uncertain_sections === 'string' ? JSON.parse(r.uncertain_sections) : r.uncertain_sections || [],
        humanResolutions: typeof r.human_resolutions === 'string' ? JSON.parse(r.human_resolutions) : r.human_resolutions || [],
        createdAt: r.created_at?.toISOString?.() || r.created_at,
    };
}
//# sourceMappingURL=co-drafting.service.js.map