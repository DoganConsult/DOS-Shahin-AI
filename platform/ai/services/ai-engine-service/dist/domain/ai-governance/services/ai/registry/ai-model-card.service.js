// @ts-nocheck
// ============================================
// AI Model Card Service (ISO 42001, SDAIA, EU AI Act Annex IV)
// Auto-generates model cards from runtime config + performance metrics
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { claudeJSON } from '../../../ports/ai.port';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
/**
 * Generate a comprehensive bilingual model card for an AI agent.
 * Pulls runtime config, 30-day performance metrics, bias detections,
 * and system registry data to produce an ISO 42001 / SDAIA compliant card.
 */
export async function generateModelCard(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const [agentConfig, performance, biasDetections, systemReg] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".agent_runtime_config WHERE agent_id = $1`, [agentId]), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT metric_type, AVG(metric_value) AS avg_val, COUNT(*) AS sample_count
              FROM "${schema}".ai_agent_performance_metrics WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '30 days'
              GROUP BY metric_type`, [agentId]), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT protected_attribute, bias_metric, metric_value, threshold, violation_detected
              FROM "${schema}".ai_agent_bias_detection WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10`, [agentId]), { tenantId: tenantId, operation: 'query ai_agent_performance_metrics' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".ai_system_registry WHERE system_id = $1 OR system_name ILIKE '%' || $1 || '%' LIMIT 1`, [agentId]), { tenantId: tenantId, operation: 'query ai_agent_bias_detection' }),
    ]);
    const config = agentConfig.rows[0] || {};
    const perfMetrics = {};
    for (const row of performance.rows) {
        perfMetrics[row.metric_type] = { average: parseFloat(row.avg_val), samples: parseInt(row.sample_count) };
    }
    const aiCard = await claudeJSON({
        systemPrompt: `You are an AI model card generator following ISO 42001 and SDAIA standards. Generate a comprehensive, bilingual model card.
Respond with JSON: {
  purpose_en: string, purpose_ar: string,
  capabilities: string[], limitations: string[],
  intended_use: string, out_of_scope_use: string[],
  fairness_considerations: string[],
  ethical_considerations: string[],
  regulatory_compliance: string[],
  environmental_impact: {estimated_co2_per_1k_calls: number}
}`,
        userMessage: `Generate model card for agent "${agentId}":\nConfig: ${JSON.stringify(config)}\nPerformance (30d): ${JSON.stringify(perfMetrics)}\nBias detections: ${JSON.stringify(biasDetections.rows)}\nSystem registry: ${JSON.stringify(systemReg.rows[0] || {})}`,
        maxTokens: 2048,
        temperature: 0.3,
        tenantId,
        agentId: 'model-card-generator',
        decisionType: 'model_card_generation',
    });
    const card = {
        model_id: agentId,
        model_name: config.display_name || agentId,
        version: config.version || '1.0',
        ...aiCard,
        training_data_provenance: 'Claude API (Anthropic) — no tenant-specific training data used',
        performance_metrics: perfMetrics,
        contact: config.responsible_ai_officer || 'ai-governance@organization',
        last_updated: new Date().toISOString(),
    };
    // Persist the card (upsert by tenant + agent)
    await safeQuery(`INSERT INTO "${schema}".ai_model_cards (tenant_id, agent_id, card_json, generated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id, agent_id) DO UPDATE SET card_json = $3, generated_at = NOW()`, [tenantId, agentId, JSON.stringify(card)]).catch(catchHandler(EC.EVENT_BUS, {}));
    return card;
}
/**
 * Retrieve a previously generated model card for an agent.
 */
export async function getModelCard(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT card_json FROM "${schema}".ai_model_cards WHERE tenant_id = $1 AND agent_id = $2`, [tenantId, agentId]);
    if (!result.rows[0])
        return null;
    return typeof result.rows[0].card_json === 'string' ? JSON.parse(result.rows[0].card_json) : result.rows[0].card_json;
}
/**
 * List all model cards for a tenant (summary view).
 */
export async function listModelCards(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT agent_id, card_json->>'model_name' AS model_name, card_json->>'version' AS version,
            card_json->>'purpose_en' AS purpose, generated_at
     FROM "${schema}".ai_model_cards WHERE tenant_id = $1 ORDER BY generated_at DESC`, [tenantId]);
    return result.rows;
}
//# sourceMappingURL=ai-model-card.service.js.map