import { logger } from '../../ports/logger.port';
// ============================================
// Reasoning Chain Service
// Records and retrieves step-by-step agent reasoning chains
// for full decision explainability
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
/**
 * Record a reasoning step
 */
export async function recordReasoningStep(input) {
    const schema = tenantSchema(input.tenantId);
    const startedAt = new Date();
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".agent_reasoning_chain
         (tenant_id, run_id, agent_id, decision_id, step_type, step_order, node_name,
          step_input, step_output, reasoning_text, confidence,
          tool_name, tool_input, tool_output, tool_error,
          llm_prompt, llm_response, llm_tokens_input, llm_tokens_output, llm_latency_ms,
          guard_result, guard_reason, guard_metadata,
          state_before, state_after, state_changes,
          parent_step_id, related_step_ids,
          error_message, error_stack, retry_count,
          started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
       RETURNING *`, [
            input.tenantId,
            input.runId || null,
            input.agentId,
            input.decisionId || null,
            input.stepType,
            input.stepOrder,
            input.nodeName || null,
            JSON.stringify(input.stepInput || {}),
            JSON.stringify(input.stepOutput || {}),
            input.reasoningText || null,
            input.confidence ?? null,
            input.toolName || null,
            input.toolInput ? JSON.stringify(input.toolInput) : null,
            input.toolOutput ? JSON.stringify(input.toolOutput) : null,
            input.toolError || null,
            input.llmPrompt || null,
            input.llmResponse || null,
            input.llmTokensInput ?? null,
            input.llmTokensOutput ?? null,
            input.llmLatencyMs ?? null,
            input.guardResult || null,
            input.guardReason || null,
            JSON.stringify(input.guardMetadata || {}),
            JSON.stringify(input.stateBefore || {}),
            JSON.stringify(input.stateAfter || {}),
            JSON.stringify(input.stateChanges || {}),
            input.parentStepId || null,
            input.relatedStepIds || [],
            input.errorMessage || null,
            input.errorStack || null,
            input.retryCount || 0,
            startedAt,
        ]);
        const step = getFirstRow(result);
        // Update summary if run_id exists
        if (input.runId) {
            await updateReasoningChainSummary(input.tenantId, input.runId, step.step_id);
        }
        return step;
    }
    catch (err) {
        logger.error('[ReasoningChain] Failed to record step:', err);
        return null;
    }
}
/**
 * Complete a reasoning step (set completed_at and duration)
 */
export async function completeReasoningStep(tenantId, stepId, stepOutput, errorMessage) {
    const schema = tenantSchema(tenantId);
    try {
        // Get the step to calculate duration
        const stepResult = await safeQuery(`SELECT started_at FROM "${schema}".agent_reasoning_chain WHERE step_id = $1 AND tenant_id = $2`, [stepId, tenantId]);
        if (!getFirstRow(stepResult))
            return false;
        const startedAt = new Date(getFirstRow(stepResult)?.started_at);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        await safeQuery(`UPDATE "${schema}".agent_reasoning_chain
       SET completed_at = $1,
           duration_ms = $2,
           step_output = COALESCE($3::jsonb, step_output),
           error_message = COALESCE($4, error_message)
       WHERE step_id = $5 AND tenant_id = $6`, [
            completedAt,
            durationMs,
            stepOutput ? JSON.stringify(stepOutput) : null,
            errorMessage || null,
            stepId,
            tenantId,
        ]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get full reasoning chain for a run
 */
export async function getReasoningChain(tenantId, runId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_reasoning_chain
       WHERE run_id = $1 AND tenant_id = $2
       ORDER BY step_order ASC, started_at ASC`, [runId, tenantId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
/**
 * Get reasoning chain for a decision
 */
export async function getReasoningChainForDecision(tenantId, decisionId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_reasoning_chain
       WHERE decision_id = $1 AND tenant_id = $2
       ORDER BY step_order ASC, started_at ASC`, [decisionId, tenantId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
/**
 * Get reasoning chain summary
 */
export async function getReasoningChainSummary(tenantId, runId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".reasoning_chain_summary
       WHERE run_id = $1 AND tenant_id = $2`, [runId, tenantId]);
        return getFirstRow(result);
    }
    catch {
        return null;
    }
}
/**
 * Update or create reasoning chain summary
 */
async function updateReasoningChainSummary(tenantId, runId, _stepId) {
    const schema = tenantSchema(tenantId);
    try {
        // Get all steps for this run
        const steps = await getReasoningChain(tenantId, runId);
        if (steps.length === 0)
            return;
        // Calculate summary metrics
        const stepTypes = {};
        let totalDurationMs = 0;
        let totalTokensInput = 0;
        let totalTokensOutput = 0;
        let finalConfidence = null;
        let finalReasoning = null;
        for (const step of steps) {
            stepTypes[step.step_type] = (stepTypes[step.step_type] || 0) + 1;
            if (step.duration_ms)
                totalDurationMs += step.duration_ms;
            if (step.llm_tokens_input)
                totalTokensInput += step.llm_tokens_input;
            if (step.llm_tokens_output)
                totalTokensOutput += step.llm_tokens_output;
            // Use the last step's confidence and reasoning as final
            if (step.confidence !== null)
                finalConfidence = step.confidence;
            if (step.reasoning_text)
                finalReasoning = step.reasoning_text;
        }
        // Get agent_id from first step
        const agentId = steps[0]?.agent_id || 'any';
        const decisionId = steps.find(s => s.decision_id)?.decision_id || null;
        // Calculate quality scores (simplified - can be enhanced)
        const reasoningQualityScore = calculateReasoningQuality(steps);
        const completenessScore = calculateCompleteness(steps);
        // Extract key factors (simplified - can be enhanced with NLP)
        const keyFactors = extractKeyFactors(steps);
        // Upsert summary
        await safeQuery(`INSERT INTO "${schema}".reasoning_chain_summary
         (tenant_id, run_id, agent_id, decision_id, total_steps, step_types,
          total_duration_ms, total_tokens_input, total_tokens_output,
          final_confidence, final_reasoning, key_factors,
          reasoning_quality_score, completeness_score,
          first_step_id, last_step_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (run_id) DO UPDATE SET
         total_steps = EXCLUDED.total_steps,
         step_types = EXCLUDED.step_types,
         total_duration_ms = EXCLUDED.total_duration_ms,
         total_tokens_input = EXCLUDED.total_tokens_input,
         total_tokens_output = EXCLUDED.total_tokens_output,
         final_confidence = EXCLUDED.final_confidence,
         final_reasoning = EXCLUDED.final_reasoning,
         key_factors = EXCLUDED.key_factors,
         reasoning_quality_score = EXCLUDED.reasoning_quality_score,
         completeness_score = EXCLUDED.completeness_score,
         last_step_id = EXCLUDED.last_step_id,
         updated_at = NOW()`, [
            tenantId,
            runId,
            agentId,
            decisionId,
            steps.length,
            JSON.stringify(stepTypes),
            totalDurationMs,
            totalTokensInput,
            totalTokensOutput,
            finalConfidence,
            finalReasoning,
            JSON.stringify(keyFactors),
            reasoningQualityScore,
            completenessScore,
            steps[0]?.step_id || null,
            steps[steps.length - 1]?.step_id || null,
        ]);
    }
    catch (err) {
        logger.error('[ReasoningChain] Failed to update summary:', err);
    }
}
/**
 * Calculate reasoning quality score (0-1)
 */
function calculateReasoningQuality(steps) {
    if (steps.length === 0)
        return 0;
    let score = 0;
    let weight = 0;
    for (const step of steps) {
        // Steps with reasoning text get higher weight
        if (step.reasoning_text) {
            score += 0.3;
            weight += 0.3;
        }
        // Steps with confidence scores
        if (step.confidence !== null) {
            score += step.confidence * 0.2;
            weight += 0.2;
        }
        // Steps with state changes (shows active reasoning)
        if (Object.keys(step.state_changes || {}).length > 0) {
            score += 0.2;
            weight += 0.2;
        }
        // Error steps reduce quality
        if (step.error_message) {
            score -= 0.1;
            weight += 0.1;
        }
    }
    return weight > 0 ? Math.max(0, Math.min(1, score / weight)) : 0.5;
}
/**
 * Calculate completeness score (0-1)
 */
function calculateCompleteness(steps) {
    if (steps.length === 0)
        return 0;
    const requiredTypes = ['llm_call', 'tool_call', 'guard_check'];
    const foundTypes = new Set(steps.map(s => s.step_type));
    const typeCoverage = requiredTypes.filter(t => foundTypes.has(t)).length / requiredTypes.length;
    // Check if chain has start and end
    const hasStart = steps.some(s => s.step_order === 0 || s.parent_step_id === null);
    const hasEnd = steps.some(s => s.completed_at !== null);
    const structureScore = (hasStart ? 0.3 : 0) + (hasEnd ? 0.3 : 0);
    // Check if steps have outputs
    const stepsWithOutputs = steps.filter(s => Object.keys(s.step_output || {}).length > 0 || s.llm_response || s.tool_output).length;
    const outputCoverage = stepsWithOutputs / steps.length;
    return Math.min(1, typeCoverage * 0.4 + structureScore + outputCoverage * 0.3);
}
/**
 * Extract key factors from reasoning steps
 */
function extractKeyFactors(steps) {
    const factors = [];
    for (const step of steps) {
        // Extract from guard decisions
        if (step.guard_reason) {
            factors.push({
                type: 'guard',
                factor: step.guard_reason,
                step_type: step.step_type,
            });
        }
        // Extract from tool calls (important actions)
        if (step.tool_name && step.tool_output) {
            factors.push({
                type: 'tool_action',
                tool: step.tool_name,
                result: Object.keys(step.tool_output || {}).length > 0 ? 'success' : 'no_output',
                step_type: step.step_type,
            });
        }
        // Extract from state changes (significant state transitions)
        const stateChanges = step.state_changes || {};
        if (Object.keys(stateChanges).length > 0) {
            factors.push({
                type: 'state_change',
                changes: Object.keys(stateChanges),
                step_type: step.step_type,
            });
        }
    }
    return factors.slice(0, 10); // Limit to top 10
}
/**
 * Link a reasoning chain to a decision or other explainability artifact
 */
export async function linkExplainability(tenantId, sourceType, sourceId, targetType, targetId, linkStrength = 1.0, linkType = 'direct') {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`INSERT INTO "${schema}".explainability_links
         (tenant_id, source_type, source_id, target_type, target_id, link_strength, link_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, source_type, source_id, target_type, target_id) DO UPDATE SET
         link_strength = EXCLUDED.link_strength,
         link_type = EXCLUDED.link_type`, [tenantId, sourceType, sourceId, targetType, targetId, linkStrength, linkType]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get all explainability links for a source
 */
export async function getExplainabilityLinks(tenantId, sourceType, sourceId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT target_type, target_id, link_strength, link_type
       FROM "${schema}".explainability_links
       WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3
       ORDER BY link_strength DESC`, [tenantId, sourceType, sourceId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=reasoning-chain.service.js.map