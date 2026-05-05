// ============================================================================
// Prompt Drift Detector — Feature 16
// Compares recent agent outputs (decision_record) to prompt_drift_baselines.
// Flags prompts for review and creates ai.alert when drift exceeds threshold.
// ============================================================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createAlert } from '../governance/compliance/ai-alert.service';
import { getFirstRow } from '@dos/db';
const DRIFT_CONFIDENCE_DELTA = 0.15; // flag if current avg drops this much vs baseline
const DRIFT_REJECTION_DELTA = 0.2; // flag if rejection rate increases this much
const MIN_SAMPLE_SIZE = 10; // require at least N recent decisions to compare
const RECENT_DAYS = 14; // window for recent outputs
// ── Get agent IDs that use a given prompt (via linked_prompt_asset_id) ───────
async function getAgentIdsForPrompt(schema, promptVersionId) {
    const result = await safeQuery(`SELECT inv.asset_key
     FROM "${schema}".ai_prompt_registry apr
     JOIN "${schema}".ai_agent_registry ar ON ar.linked_prompt_asset_id = apr.asset_id
     JOIN "${schema}".ai_asset_inventory inv ON inv.asset_id = ar.asset_id AND inv.deleted_at IS NULL
     WHERE apr.prompt_version_id = $1`, [promptVersionId]);
    return result.rows.map((r) => r.asset_key);
}
// ── Compute drift metrics from recent decision_record rows ──────────────────
export async function computeDriftMetrics(tenantId, promptVersionId, options) {
    const schema = tenantSchema(tenantId);
    const days = options?.recentDays ?? RECENT_DAYS;
    const agentIds = await getAgentIdsForPrompt(schema, promptVersionId);
    if (agentIds.length === 0)
        return null;
    const placeholders = agentIds.map((_, i) => `$${i + 2}`).join(',');
    const daysParamIndex = agentIds.length + 2;
    const result = await safeQuery(`SELECT confidence, outcome, decision_type, created_at
     FROM "${schema}".decision_record
     WHERE tenant_id = $1 AND agent_id IN (${placeholders})
       AND created_at > NOW() - make_interval(days => $${daysParamIndex})
     ORDER BY created_at DESC`, [tenantId, ...agentIds, days]);
    const rows = result.rows;
    if (rows.length < MIN_SAMPLE_SIZE)
        return null;
    let sumConf = 0;
    let rejectCount = 0;
    const actionCounts = {};
    for (const r of rows) {
        sumConf += r.confidence ?? 0;
        if (r.outcome && r.outcome.status === 'rejected')
            rejectCount++;
        const key = r.decision_type || 'other';
        actionCounts[key] = (actionCounts[key] || 0) + 1;
    }
    const avgConfidence = sumConf / rows.length;
    const rejectionRate = rejectCount / rows.length;
    const total = rows.length;
    const actionDistribution = {};
    for (const [k, v] of Object.entries(actionCounts))
        actionDistribution[k] = v / total;
    return {
        promptVersionId,
        avgConfidence,
        rejectionRate,
        actionDistribution,
        sampleSize: total,
        computedAt: new Date().toISOString(),
    };
}
// ── Get baseline for a prompt version ───────────────────────────────────────
export async function getBaseline(tenantId, promptVersionId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT baseline_id, prompt_version_id, avg_confidence, rejection_rate,
            action_distribution, sample_size, computed_at
     FROM "${schema}".prompt_drift_baselines
     WHERE prompt_version_id = $1
     ORDER BY computed_at DESC LIMIT 1`, [promptVersionId]);
    return getFirstRow(result) || null;
}
// ── Flag prompt for review in ai_prompt_registry ────────────────────────────
export async function flagPromptForReview(tenantId, promptVersionId, reason) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_prompt_registry
     SET flagged_for_review = TRUE, flagged_at = NOW(), flag_reason = $1, updated_at = NOW()
     WHERE prompt_version_id = $2`, [reason, promptVersionId]);
}
// ── Clear flag (e.g. after human review) ────────────────────────────────────
export async function clearPromptFlag(tenantId, promptVersionId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".ai_prompt_registry
     SET flagged_for_review = FALSE, flagged_at = NULL, flag_reason = NULL, updated_at = NOW()
     WHERE prompt_version_id = $1`, [promptVersionId]);
}
// ── Detect drift: compare current metrics to baseline, return true if drifted ──
export async function detectDrift(tenantId, promptVersionId, options) {
    const current = await computeDriftMetrics(tenantId, promptVersionId, options);
    if (!current)
        return { drifted: false };
    const baseline = await getBaseline(tenantId, promptVersionId);
    if (!baseline)
        return { drifted: false, current }; // no baseline to compare
    const confDelta = baseline.avg_confidence - current.avgConfidence;
    const rejDelta = current.rejectionRate - Number(baseline.rejection_rate);
    if (confDelta >= DRIFT_CONFIDENCE_DELTA) {
        return {
            drifted: true,
            reason: `Confidence dropped from ${Number(baseline.avg_confidence).toFixed(3)} to ${current.avgConfidence.toFixed(3)} (delta ${confDelta.toFixed(3)})`,
            current,
            baseline,
        };
    }
    if (rejDelta >= DRIFT_REJECTION_DELTA) {
        return {
            drifted: true,
            reason: `Rejection rate increased from ${Number(baseline.rejection_rate).toFixed(3)} to ${current.rejectionRate.toFixed(3)} (delta ${rejDelta.toFixed(3)})`,
            current,
            baseline,
        };
    }
    return { drifted: false, current, baseline };
}
// ── Run drift detection and create alert + flag when drift detected ─────────
export async function runDriftDetectionForPrompt(tenantId, promptVersionId) {
    const result = await detectDrift(tenantId, promptVersionId);
    if (!result.drifted || !result.reason)
        return false;
    await flagPromptForReview(tenantId, promptVersionId, result.reason);
    await createAlert({
        tenantId,
        sourceType: 'agent',
        sourceId: promptVersionId,
        entityType: 'ai_prompt',
        entityId: promptVersionId,
        alertType: 'anomaly',
        title: 'Prompt drift detected',
        description: result.reason,
        severity: 'warning',
    });
    return true;
}
// ── List prompt version IDs that have a baseline (so we can run drift detection) ──
export async function listActivePromptVersions(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT DISTINCT prompt_version_id FROM "${schema}".prompt_drift_baselines`, []);
    return result.rows;
}
//# sourceMappingURL=prompt-drift-detector.service.js.map