// @ts-nocheck
// ============================================
// Copilot Intent Enhancer — Enterprise Grade
// AI-powered intent classification, disambiguation,
// and context-aware query enhancement for the GRC copilot
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
// GRC domain intent taxonomy
const INTENT_TAXONOMY = {
    control_query: { module: 'compliance', keywords: ['control', 'controls', 'implement', 'effective', 'test status'], actions: ['list_controls', 'control_analysis', 'control_test'] },
    risk_query: { module: 'risk', keywords: ['risk', 'risks', 'threat', 'vulnerability', 'risk score', 'risk register'], actions: ['list_risks', 'risk_analysis', 'risk_matrix'] },
    compliance_query: { module: 'compliance', keywords: ['compliance', 'framework', 'nca', 'sama', 'pdpl', 'regulation', 'gap'], actions: ['compliance_status', 'gap_analysis', 'framework_mapping'] },
    audit_query: { module: 'audit', keywords: ['audit', 'finding', 'observation', 'recommendation', 'audit report'], actions: ['list_audits', 'audit_findings', 'audit_schedule'] },
    evidence_query: { module: 'evidence', keywords: ['evidence', 'document', 'upload', 'collect', 'stale', 'missing'], actions: ['list_evidence', 'evidence_gaps', 'collect_evidence'] },
    incident_query: { module: 'incident', keywords: ['incident', 'breach', 'alert', 'sla', 'escalat'], actions: ['list_incidents', 'incident_status', 'escalation_chain'] },
    policy_query: { module: 'policy', keywords: ['policy', 'policies', 'procedure', 'review', 'publish', 'approve'], actions: ['list_policies', 'policy_review', 'policy_gaps'] },
    vendor_query: { module: 'vendor', keywords: ['vendor', 'supplier', 'third party', 'procurement', 'onboard'], actions: ['list_vendors', 'vendor_risk', 'vendor_assessment'] },
    dashboard_query: { module: 'analytics', keywords: ['dashboard', 'report', 'status', 'overview', 'summary', 'kpi', 'metric'], actions: ['executive_dashboard', 'kpi_summary', 'trend_analysis'] },
    team_query: { module: 'foundation', keywords: ['team', 'assign', 'workload', 'member', 'role', 'responsibility'], actions: ['team_workload', 'task_assignment', 'role_matrix'] },
    action_request: { module: 'workflow', keywords: ['create', 'add', 'update', 'delete', 'approve', 'reject', 'assign', 'escalate'], actions: ['create_entity', 'update_entity', 'approve_item'] },
};
/**
 * Classify user intent using keyword matching + AI fallback.
 */
export async function classifyIntent(userInput, tenantId) {
    const inputLower = userInput.toLowerCase();
    // Fast keyword-based classification
    let bestMatch = '';
    let bestScore = 0;
    for (const [intentType, config] of Object.entries(INTENT_TAXONOMY)) {
        const matches = config.keywords.filter(kw => inputLower.includes(kw)).length;
        if (matches > bestScore) {
            bestScore = matches;
            bestMatch = intentType;
        }
    }
    if (bestScore >= 2)
        return bestMatch;
    // AI fallback for ambiguous intents
    if (tenantId) {
        try {
            const { claudeJSON } = await import('../../../../config/claude-client');
            const result = await claudeJSON({
                systemPrompt: `You are a GRC copilot intent classifier. Classify the user's intent into exactly one of these categories: ${Object.keys(INTENT_TAXONOMY).join(', ')}. Respond with JSON: {intent: string, confidence: number}`,
                userMessage: userInput,
                maxTokens: 128,
                temperature: 0.1,
                tenantId,
                agentId: 'copilot-intent',
                decisionType: 'intent_classification',
                skipPiiRedaction: true,
            });
            return result.intent || bestMatch || 'dashboard_query';
        }
        catch { /* fallback */ }
    }
    return bestMatch || 'dashboard_query';
}
/**
 * Enhance user intent with context, entity extraction, and actionable suggestions.
 */
export async function enhanceIntent(tenantId, userInput) {
    const intentType = await classifyIntent(userInput, tenantId);
    const taxonomy = INTENT_TAXONOMY[intentType] || INTENT_TAXONOMY.dashboard_query;
    // Load user context
    const schema = tenantSchema(tenantId);
    const [recentActivity, _userRole] = await Promise.all([
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT entity_type, action, created_at FROM "${schema}".audit_trail WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 5`), { tenantId: tenantId, operation: 'query audit_trail' }),
        swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT role, permissions FROM "${schema}".users WHERE user_id = (SELECT actor_id FROM "${schema}".audit_trail ORDER BY created_at DESC LIMIT 1)`), { tenantId: tenantId, operation: 'query audit_trail' }),
    ]);
    const { claudeJSON } = await import('../../../../config/claude-client');
    const enhanced = await claudeJSON({
        systemPrompt: `You are a GRC copilot intent enhancer. Take the user's raw query and enhance it with:
1. Better phrasing for the GRC domain
2. Entity extraction (control IDs, framework names, dates, etc.)
3. Contextual action suggestions based on their intent
Respond with JSON: {
  enhancedIntent: string,
  confidence: number (0-1),
  entities: [{type: string, value: string, confidence: number}],
  suggestions: string[],
  contextualActions: [{action: string, description: string, endpoint: string}]
}`,
        userMessage: `User query: "${userInput}"\nClassified intent: ${intentType}\nModule: ${taxonomy.module}\nRecent activity: ${JSON.stringify(recentActivity.rows)}\nAvailable actions: ${taxonomy.actions.join(', ')}`,
        maxTokens: 1024,
        temperature: 0.2,
        tenantId,
        agentId: 'copilot-intent-enhancer',
        decisionType: 'intent_enhancement',
    });
    const e = enhanced;
    return {
        originalIntent: userInput,
        enhancedIntent: e.enhancedIntent || userInput,
        confidence: e.confidence || 0.5,
        intentType,
        module: taxonomy.module,
        suggestions: e.suggestions || [],
        entities: e.entities || [],
        contextualActions: e.contextualActions || taxonomy.actions.map(a => ({ action: a, description: a.replace(/_/g, ' '), endpoint: `/api/${taxonomy.module}` })),
    };
}
//# sourceMappingURL=copilot-intent-enhancer.service.js.map