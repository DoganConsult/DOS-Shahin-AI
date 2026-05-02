"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrief = createBrief;
exports.listBriefs = listBriefs;
exports.approveBrief = approveBrief;
exports.createObjective = createObjective;
exports.listObjectives = listObjectives;
exports.updateObjective = updateObjective;
exports.createAppetite = createAppetite;
exports.listAppetites = listAppetites;
exports.evaluateAppetiteBreaches = evaluateAppetiteBreaches;
exports.runDiagnostics = runDiagnostics;
// @ts-nocheck
/**
 * Executive Service — Spec §3.1: Briefing Generation, Strategic Objectives, Risk Appetite, Diagnostics
 */
const executive_ports_1 = require("../ports/executive.ports");
const module_auth_1 = require("@dos/module-auth");
// ── Briefing Generation Service ──
async function createBrief(tenantId, userId, data) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`INSERT INTO "${schema}".executive_briefs (title, reference_date, generation_method, generated_by_user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING brief_id as "briefId", title, generated_content_html as "generatedContentHtml", reference_date as "referenceDate", generation_method as "generationMethod", status, generated_by_user_id as "generatedByUserId", approved_by_user_id as "approvedByUserId", approved_at as "approvedAt", metadata_json as "metadataJson", created_at as "createdAt", updated_at as "updatedAt"`, [data.title, data.referenceDate || new Date().toISOString().split('T')[0], data.generationMethod || 'ai_generated', userId]);
    const brief = result.rows[0];
    await (0, module_auth_1.setAuditData)(tenantId, 'executive_briefs', brief.briefId, 'create', null, brief, userId);
    return brief;
}
async function listBriefs(tenantId) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`SELECT brief_id as "briefId", title, generated_content_html as "generatedContentHtml", reference_date as "referenceDate", generation_method as "generationMethod", status, generated_by_user_id as "generatedByUserId", approved_by_user_id as "approvedByUserId", approved_at as "approvedAt", metadata_json as "metadataJson", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".executive_briefs ORDER BY reference_date DESC LIMIT 50`);
    return result.rows;
}
async function approveBrief(tenantId, briefId, userId, status) {
    await (0, executive_ports_1.safeQuery)("UPDATE __TENANT_SCHEMA__.executive_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// ── Strategic Objective Service ──
async function createObjective(tenantId, userId, data) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`INSERT INTO "${schema}".executive_objectives (title, description, parent_id, target_kpi, target_value, owner_user_id, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING objective_id as "objectiveId", title, description, parent_id as "parentId", target_kpi as "targetKpi", current_value as "currentValue", target_value as "targetValue", progress_pct as "progressPct", status, owner_user_id as "ownerUserId", due_date as "dueDate", created_at as "createdAt", updated_at as "updatedAt"`, [data.title, data.description || null, data.parentId || null, data.targetKpi || null, data.targetValue || null, data.ownerUserId || null, data.dueDate || null]);
    await (0, module_auth_1.setAuditData)(tenantId, 'executive_objectives', result.rows[0].objectiveId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
async function listObjectives(tenantId) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`SELECT objective_id as "objectiveId", title, description, parent_id as "parentId", target_kpi as "targetKpi", current_value as "currentValue", target_value as "targetValue", progress_pct as "progressPct", status, owner_user_id as "ownerUserId", due_date as "dueDate", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".executive_objectives WHERE status != 'cancelled' ORDER BY created_at DESC LIMIT 100`);
    return result.rows;
}
async function updateObjective(tenantId, objectiveId, userId, data) {
    const result = await (0, executive_ports_1.safeQuery)("SELECT * FROM __TENANT_SCHEMA__.executive_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
// ── Risk Appetite Service ──
async function createAppetite(tenantId, userId, data) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`INSERT INTO "${schema}".executive_risk_appetite (domain_category, quantitative_limit, qualitative_limit_desc)
     VALUES ($1, $2, $3)
     RETURNING appetite_id as "appetiteId", domain_category as "domainCategory", quantitative_limit as "quantitativeLimit", qualitative_limit_desc as "qualitativeLimitDesc", current_exposure as "currentExposure", is_breached as "isBreached", last_evaluated_at as "lastEvaluatedAt", created_at as "createdAt", updated_at as "updatedAt"`, [data.domainCategory, data.quantitativeLimit || null, data.qualitativeLimitDesc || null]);
    await (0, module_auth_1.setAuditData)(tenantId, 'executive_risk_appetite', result.rows[0].appetiteId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
async function listAppetites(tenantId) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const result = await (0, executive_ports_1.safeQuery)(`SELECT appetite_id as "appetiteId", domain_category as "domainCategory", quantitative_limit as "quantitativeLimit", qualitative_limit_desc as "qualitativeLimitDesc", current_exposure as "currentExposure", is_breached as "isBreached", last_evaluated_at as "lastEvaluatedAt", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".executive_risk_appetite ORDER BY domain_category`);
    return result.rows;
}
async function evaluateAppetiteBreaches(tenantId) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    // Auto-evaluate breaches based on quantitative limits
    await (0, executive_ports_1.safeQuery)(`UPDATE "${schema}".executive_risk_appetite SET is_breached = (current_exposure > quantitative_limit), last_evaluated_at = NOW() WHERE quantitative_limit IS NOT NULL`);
    const all = await listAppetites(tenantId);
    const breaches = all.filter(a => a.isBreached);
    return { totalDomains: all.length, breachedDomains: breaches.length, breaches };
}
// ── Diagnostics Service ──
async function runDiagnostics(tenantId) {
    const schema = (0, executive_ports_1.tenantSchema)(tenantId);
    const checks = [];
    const briefCount = await (0, executive_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".executive_briefs`);
    checks.push({ check: 'total_briefs', value: briefCount.rows[0]?.count || 0, status: 'ok' });
    const pendingBriefs = await (0, executive_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".executive_briefs WHERE status = 'draft'`);
    checks.push({ check: 'pending_briefs', value: pendingBriefs.rows[0]?.count || 0, status: parseInt(pendingBriefs.rows[0]?.count || '0') > 5 ? 'warning' : 'ok' });
    const breachedAppetites = await (0, executive_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".executive_risk_appetite WHERE is_breached = true`);
    checks.push({ check: 'breached_risk_appetites', value: breachedAppetites.rows[0]?.count || 0, status: parseInt(breachedAppetites.rows[0]?.count || '0') > 0 ? 'critical' : 'ok' });
    const atRiskObjectives = await (0, executive_ports_1.safeQuery)(`SELECT COUNT(*) as count FROM "${schema}".executive_objectives WHERE status = 'at_risk'`);
    checks.push({ check: 'at_risk_objectives', value: atRiskObjectives.rows[0]?.count || 0, status: parseInt(atRiskObjectives.rows[0]?.count || '0') > 0 ? 'warning' : 'ok' });
    return { status: 'operational', checks };
}
//# sourceMappingURL=executive.service.js.map