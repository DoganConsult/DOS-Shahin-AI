import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — Cost Attribution Service
// Adds cost center/project tagging to LLM usage
// Requirements: ai-os-7.2
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { trackUsage, estimateCost } from '../gateway/llm-usage-tracker.service.js';
import { getFirstRow } from '@dos/db';
/**
 * Track usage with cost attribution
 */
export async function trackUsageWithAttribution(record) {
    // Track base usage
    await trackUsage(record);
    // Record attribution
    if (record.costCenterId || record.projectId) {
        const schema = tenantSchema(record.tenantId);
        const costUsd = estimateCost(record.model, record.inputTokens, record.outputTokens);
        await safeQuery(`INSERT INTO "${schema}".llm_cost_attribution
       (tenant_id, user_id, agent_id, run_id, cost_center_id, project_id,
        cost_center_code, project_code, cost_usd, tokens, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`, [
            record.tenantId,
            record.userId || null,
            record.agentId || null,
            record.runId || null,
            record.costCenterId || null,
            record.projectId || null,
            record.costCenterCode || null,
            record.projectCode || null,
            costUsd,
            record.inputTokens + record.outputTokens,
        ]).catch(catchHandler(EC.EVENT_BUS, {}));
    }
}
/**
 * Create or update cost center
 */
export async function upsertCostCenter(center) {
    const schema = tenantSchema(center.tenantId);
    await safeQuery(`INSERT INTO "${schema}".cost_centers
     (id, tenant_id, name, code, description, budget_limit, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       code = EXCLUDED.code,
       description = EXCLUDED.description,
       budget_limit = EXCLUDED.budget_limit,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`, [
        center.id,
        center.tenantId,
        center.name,
        center.code,
        center.description || null,
        center.budgetLimit || null,
        center.isActive,
    ]);
}
/**
 * Create or update project
 */
export async function upsertProject(project) {
    const schema = tenantSchema(project.tenantId);
    await safeQuery(`INSERT INTO "${schema}".projects
     (id, tenant_id, cost_center_id, name, code, description, budget_limit, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       cost_center_id = EXCLUDED.cost_center_id,
       name = EXCLUDED.name,
       code = EXCLUDED.code,
       description = EXCLUDED.description,
       budget_limit = EXCLUDED.budget_limit,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`, [
        project.id,
        project.tenantId,
        project.costCenterId || null,
        project.name,
        project.code,
        project.description || null,
        project.budgetLimit || null,
        project.isActive,
    ]);
}
/**
 * Get cost attribution summary
 */
export async function getCostAttributionSummary(tenantId, daysBack = 30) {
    const schema = tenantSchema(tenantId);
    const summary = {
        byCostCenter: [],
        byProject: [],
        unattributed: { cost: 0, tokens: 0 },
    };
    try {
        // By cost center
        const centerResult = await safeQuery(`SELECT cost_center_id, cost_center_code,
              SUM(cost_usd)::real AS cost,
              SUM(tokens)::int AS tokens
       FROM "${schema}".llm_cost_attribution
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND cost_center_id IS NOT NULL
       GROUP BY cost_center_id, cost_center_code`, [tenantId, daysBack]);
        summary.byCostCenter = centerResult.rows.map((r) => ({
            costCenterId: r.cost_center_id,
            costCenterCode: r.cost_center_code || '',
            cost: r.cost || 0,
            tokens: r.tokens || 0,
        }));
        // By project
        const projectResult = await safeQuery(`SELECT project_id, project_code,
              SUM(cost_usd)::real AS cost,
              SUM(tokens)::int AS tokens
       FROM "${schema}".llm_cost_attribution
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND project_id IS NOT NULL
       GROUP BY project_id, project_code`, [tenantId, daysBack]);
        summary.byProject = projectResult.rows.map((r) => ({
            projectId: r.project_id,
            projectCode: r.project_code || '',
            cost: r.cost || 0,
            tokens: r.tokens || 0,
        }));
        // Unattributed
        const unattributedResult = await safeQuery(`SELECT SUM(cost_usd)::real AS cost, SUM(tokens)::int AS tokens
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".llm_cost_attribution
           WHERE llm_cost_attribution.run_id = llm_usage_log.run_id
         )`, [tenantId, daysBack]);
        if (unattributedResult.rows.length > 0) {
            summary.unattributed = {
                cost: getFirstRow(unattributedResult)?.cost || 0,
                tokens: getFirstRow(unattributedResult)?.tokens || 0,
            };
        }
    }
    catch {
        // Non-fatal
    }
    return summary;
}
//# sourceMappingURL=cost-attribution.service.js.map