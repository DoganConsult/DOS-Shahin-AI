// ================================================================
// A08 — Policy Lifecycle
// Tools: list policies, check review dates, flag overdue policies
// ================================================================
import { tenantSchema } from '@dos/db';
import { createProcessTask } from '@dos/platform-core/workflows';
import { safeRows } from '@dos/module-sdk';
export function buildA08Tools() {
    return [
        {
            name: 'list_policies_with_health',
            description: 'List all policies with their status, review dates, and health indicators.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = tenantSchema(tenantId);
                const policies = await safeRows(`SELECT policy_id, title, status, review_date, version, owner, created_at, updated_at
           FROM "${schema}".policies ORDER BY
             CASE WHEN review_date < NOW() THEN 0 ELSE 1 END,
             review_date NULLS LAST LIMIT 50`);
                const overdue = policies.filter((p) => p.review_date && new Date(p.review_date) < new Date() && p.status === 'published');
                const pendingApproval = policies.filter((p) => p.status === 'pending_approval');
                const expiringSoon = policies.filter((p) => p.review_date && new Date(p.review_date) > new Date() && new Date(p.review_date) < new Date(Date.now() + 30 * 86400000));
                return { policies, overdueCount: overdue.length, pendingApprovalCount: pendingApproval.length, expiringSoonCount: expiringSoon.length };
            },
        },
        {
            name: 'flag_policy_issue',
            description: 'Flag a policy issue (overdue review, missing approval, etc.) as a task.',
            input_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    policyId: { type: 'string' },
                    priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                },
                required: ['title', 'description', 'priority'],
            },
            handler: async (tenantId, input) => {
                await createProcessTask(tenantId, {
                    title: `[A08] ${input.title}`,
                    description: input.description,
                    taskType: 'policy_creation',
                    priority: input.priority || 'medium',
                    entityType: 'policy',
                    entityId: input.policyId,
                    triggerSource: 'agent_A08',
                    createdBy: 'agent-A08',
                });
                return { flagged: true };
            },
        },
        {
            name: 'analyze_regulatory_impact',
            description: 'Analyze which KSA regulations (NCA-ECC, SAMA-CSF, PDPL) require specific policies and which are missing.',
            input_schema: { type: 'object', properties: {}, required: [] },
            handler: async (tenantId) => {
                const schema = tenantSchema(tenantId);
                const frameworks = await safeRows(`SELECT framework_id, name FROM "${schema}".frameworks`);
                const policies = await safeRows(`SELECT policy_id, title, tags FROM "${schema}".policies WHERE status IN ('published', 'draft')`);
                const requiredPolicyTypes = ['Information Security', 'Data Protection', 'Access Control', 'Incident Response', 'Business Continuity', 'Risk Management', 'Acceptable Use', 'Change Management'];
                const existingTypes = policies.map((p) => p.title?.toLowerCase() || '');
                const missing = requiredPolicyTypes.filter(rp => !existingTypes.some((e) => e.includes(rp.toLowerCase())));
                return { adoptedFrameworks: frameworks, existingPolicies: policies.length, missingPolicyTypes: missing };
            },
        },
    ];
}
//# sourceMappingURL=a08-policy-tools.js.map