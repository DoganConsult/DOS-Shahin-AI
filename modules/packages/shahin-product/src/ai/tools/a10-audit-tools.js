// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A10 — Audit & Reporting
// Tools: list findings, check audit readiness, generate compliance summary
// ================================================================
import { tenantSchema } from '@dos/db';
import { recordAudit } from '@dos/platform-core/observability';
import { safeRows } from '@dos/module-sdk';
export function buildA10Tools() {
    return [
        {
            name: 'list_audit_findings',
            description: 'List all open audit findings with severity, source, and aging.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = tenantSchema(tenantId);
                const findings = await safeRows(`SELECT finding_id, title, severity, status, source_type, source_id, created_at
           FROM "${schema}".findings WHERE status = 'open'
           ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END LIMIT 50`);
                return { findings, count: findings.length };
            },
        },
        {
            name: 'check_audit_readiness',
            description: 'Assess overall audit readiness: evidence coverage, control effectiveness, policy completeness.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = tenantSchema(tenantId);
                const [controls, evidence, policies, findings] = await Promise.all([
                    safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE test_status = 'passed')::int AS passed FROM "${schema}".ucf_controls`),
                    safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW()))::int AS current FROM "${schema}".evidence`),
                    safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published FROM "${schema}".policies`),
                    safeRows(`SELECT COUNT(*)::int AS open_count FROM "${schema}".findings WHERE status = 'open'`),
                ]);
                const ct = controls[0] || { total: 0, passed: 0 };
                const ev = evidence[0] || { total: 0, current: 0 };
                const po = policies[0] || { total: 0, published: 0 };
                const controlEffectiveness = ct.total > 0 ? Math.round(ct.passed / ct.total * 100) : 0;
                const evidenceCoverage = ev.total > 0 ? Math.round(ev.current / ev.total * 100) : 0;
                const policyCompleteness = po.total > 0 ? Math.round(po.published / po.total * 100) : 0;
                const readinessScore = Math.round((controlEffectiveness + evidenceCoverage + policyCompleteness) / 3);
                return { controlEffectiveness, evidenceCoverage, policyCompleteness, openFindings: findings[0]?.open_count || 0, readinessScore, readinessLevel: readinessScore >= 80 ? 'ready' : readinessScore >= 60 ? 'partially_ready' : 'not_ready' };
            },
        },
        {
            name: 'generate_compliance_summary',
            description: 'Generate a compliance summary report with framework coverage, risk posture, and key metrics.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = tenantSchema(tenantId);
                const [fw, risks, gaps, remediations] = await Promise.all([
                    safeRows(`SELECT name, controls_total, controls_compliant FROM "${schema}".frameworks ORDER BY name`),
                    safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE risk_score > 15)::int AS high, AVG(risk_score)::numeric(5,1) AS avg_score FROM "${schema}".risks WHERE status != 'closed'`),
                    safeRows(`SELECT COUNT(*)::int AS open FROM "${schema}".compliance_gaps WHERE status = 'open'`),
                    safeRows(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS done FROM "${schema}".remediation_tasks`),
                ]);
                return { frameworks: fw, riskPosture: risks[0] || {}, openGaps: gaps[0]?.open || 0, remediationProgress: remediations[0] || {} };
            },
        },
        {
            name: 'create_finding',
            description: 'Create a new audit finding.',
            input_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    sourceType: { type: 'string', description: 'Source of finding (e.g., agent_A10, internal_audit)' },
                },
                required: ['title', 'description', 'severity'],
            },
            handler: async (tenantId, input) => {
                const schema = tenantSchema(tenantId);
                const rows = await safeRows(`INSERT INTO "${schema}".findings (title, description, severity, status, source_type, created_at)
           VALUES ($1, $2, $3, 'open', $4, NOW()) RETURNING finding_id`, [`[A10] ${input.title}`, input.description, input.severity, input.sourceType || 'agent_A10']);
                if (rows.length === 0)
                    return { created: false, reason: 'Insert failed' };
                await recordAudit({ tenantId, userId: 'agent-A10', module: 'audit', action: 'create', entityType: 'finding', entityId: String(rows[0].finding_id), afterState: { title: input.title, severity: input.severity, sourceType: input.sourceType || 'agent_A10' } });
                return { created: true, findingId: rows[0].finding_id };
            },
        },
    ];
}
//# sourceMappingURL=a10-audit-tools.js.map