"use strict";
// @ts-nocheck — module-layer imports not yet extracted
// ================================================================
// A06 — Gap Remediation & Compliance Watch
// Tools: analyze compliance gaps, generate remediation roadmap, check remediation status
// ================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildA06Tools = buildA06Tools;
const db_1 = require("@dos/db");
const workflows_1 = require("@dos/platform-core/workflows");
const module_sdk_1 = require("@dos/module-sdk");
function buildA06Tools() {
    return [
        {
            name: 'analyze_gaps',
            description: 'Analyze open compliance gaps with severity breakdown and aging.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const gaps = await (0, module_sdk_1.safeRows)(`SELECT gap_id, framework_id, control_id, severity, status, description, created_at
           FROM "${schema}".compliance_gaps WHERE status = 'open'
           ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
           LIMIT 50`);
                const overdue = await (0, module_sdk_1.safeRows)(`SELECT COUNT(*)::int AS n FROM "${schema}".remediation_tasks WHERE status = 'open' AND due_date < NOW()`);
                const compScore = await (0, module_sdk_1.safeRows)(`SELECT AVG(score)::int AS avg_score FROM "${schema}".compliance_assessments WHERE created_at > NOW() - INTERVAL '30 days'`);
                return { openGaps: gaps, gapCount: gaps.length, overdueRemediations: overdue[0]?.n || 0, avgComplianceScore: compScore[0]?.avg_score || null };
            },
        },
        {
            name: 'generate_roadmap',
            description: 'Generate a prioritized remediation roadmap based on open gaps and their severity.',
            input_schema: {
                type: 'object',
                properties: {
                    maxItems: { type: 'number', description: 'Max roadmap items (default 10)' },
                },
            },
            handler: async (tenantId, input) => {
                const schema = (0, db_1.tenantSchema)(tenantId);
                const limit = input.maxItems || 10;
                const gaps = await (0, module_sdk_1.safeRows)(`SELECT g.gap_id, g.framework_id, g.control_id, g.severity, g.description,
                  c.title AS control_title, c.code AS control_code
           FROM "${schema}".compliance_gaps g
           LEFT JOIN "${schema}".ucf_controls c ON g.control_id = c.control_id
           WHERE g.status = 'open'
           ORDER BY CASE g.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
           LIMIT $1`, [limit]);
                return { roadmap: gaps.map((g, i) => ({ rank: i + 1, ...g, suggestedDueInDays: g.severity === 'critical' ? 7 : g.severity === 'high' ? 14 : 30 })) };
            },
        },
        {
            name: 'create_remediation_task',
            description: 'Create a remediation task for a specific compliance gap.',
            input_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    gapId: { type: 'string' },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    dueInDays: { type: 'number' },
                },
                required: ['title', 'description', 'priority'],
            },
            handler: async (tenantId, input) => {
                await (0, workflows_1.createProcessTask)(tenantId, {
                    title: `[A06] ${input.title}`,
                    description: input.description,
                    taskType: 'remediation',
                    priority: input.priority || 'medium',
                    entityType: 'compliance_gap',
                    entityId: input.gapId,
                    dueInHours: input.dueInDays ? input.dueInDays * 24 : undefined,
                    triggerSource: 'agent_A06',
                    createdBy: 'agent-A06',
                });
                return { created: true };
            },
        },
    ];
}
//# sourceMappingURL=a06-gap-remediation-tools.js.map