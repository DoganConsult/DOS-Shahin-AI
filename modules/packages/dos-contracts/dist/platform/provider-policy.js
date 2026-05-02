"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_POLICY_MATRIX = void 0;
exports.isDeterministicTask = isDeterministicTask;
exports.getTaskFallbackBehavior = getTaskFallbackBehavior;
exports.getDeterministicTasks = getDeterministicTasks;
exports.getAiEnhancedTasks = getAiEnhancedTasks;
exports.validateProviderPolicyIntegrity = validateProviderPolicyIntegrity;
exports.PROVIDER_POLICY_MATRIX = [
    // ── Deterministic: MUST work without any LLM ──
    { task: 'regulator_inference', domain: 'onboarding', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Regulator detection from country/sector — rule-based only' },
    { task: 'framework_recommendation', domain: 'onboarding', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Framework matching from regulator/sector — rule-based only' },
    { task: 'module_activation', domain: 'provisioning', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Module enable/disable per product entitlement — DB-driven' },
    { task: 'dashboard_persona', domain: 'provisioning', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Dashboard persona from role/product — rule-based' },
    { task: 'provisioning_steps', domain: 'provisioning', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Schema/table/seed execution — DB migration engine' },
    { task: 'ownership_graph', domain: 'governance', determinism: 'deterministic', fallbackBehavior: 'never', description: 'RACI/team/role graph — DB queries only' },
    { task: 'control_mapping', domain: 'compliance', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Control-to-framework mapping — DB/seed data' },
    { task: 'evidence_requirements', domain: 'compliance', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Required evidence per control — DB/seed data' },
    { task: 'rbac_enforcement', domain: 'platform', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Permission checks — middleware only' },
    { task: 'tenant_isolation', domain: 'platform', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Schema-based tenant isolation — DB layer' },
    { task: 'event_bus_dispatch', domain: 'platform', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Event publish/subscribe — in-process + DB' },
    { task: 'job_scheduling', domain: 'platform', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Temporal/cron job execution — scheduler engine' },
    { task: 'mode_transition', domain: 'ai_os', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Platform mode gate (human→hybrid→shadow→auto) — rule-based' },
    { task: 'workspace_settings', domain: 'tenant', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Tenant/workspace config read/write — DB CRUD' },
    { task: 'sla_enforcement', domain: 'governance', determinism: 'deterministic', fallbackBehavior: 'never', description: 'SLA deadline tracking and escalation — timer/DB' },
    { task: 'audit_trail', domain: 'platform', determinism: 'deterministic', fallbackBehavior: 'never', description: 'Action logging — middleware only' },
    // ── AI-Enhanced: works without LLM but better with it ──
    { task: 'risk_scoring_assist', domain: 'risk', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI-suggested risk scores — falls back to manual entry' },
    { task: 'compliance_gap_analysis', domain: 'compliance', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI-detected gaps — falls back to manual assessment' },
    { task: 'policy_drafting', domain: 'governance', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI-generated policy text — falls back to template' },
    { task: 'incident_triage', domain: 'incident', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI severity classification — falls back to manual triage' },
    { task: 'executive_summary', domain: 'reporting', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI-generated summaries — falls back to metric-only reports' },
    { task: 'bilingual_enrichment', domain: 'platform', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'Auto-translate EN↔AR — falls back to single language' },
    { task: 'onboarding_scene_narration', domain: 'onboarding', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI welcome/explanation text — falls back to static templates' },
    { task: 'copilot_chat', domain: 'ai', determinism: 'ai_enhanced', fallbackBehavior: 'local_only', description: 'Interactive copilot — falls back to Ollama local' },
    { task: 'agent_dispatch', domain: 'ai_os', determinism: 'ai_enhanced', fallbackBehavior: 'local_only', description: 'Autonomous agent inference — falls back to Ollama local' },
    { task: 'memory_embedding', domain: 'ai', determinism: 'ai_enhanced', fallbackBehavior: 'local_only', description: 'Vector embedding for RAG — falls back to Ollama nomic-embed-text' },
    { task: 'vendor_assessment_assist', domain: 'vendor', determinism: 'ai_enhanced', fallbackBehavior: 'graceful_degrade', description: 'AI vendor risk scoring — falls back to manual questionnaire' },
    { task: 'recommendation_wording', domain: 'platform', determinism: 'ai_enhanced', fallbackBehavior: 'skip_silently', description: 'AI-polished recommendation text — skips if unavailable' },
];
function isDeterministicTask(task) {
    const entry = exports.PROVIDER_POLICY_MATRIX.find(e => e.task === task);
    return entry?.determinism === 'deterministic';
}
function getTaskFallbackBehavior(task) {
    const entry = exports.PROVIDER_POLICY_MATRIX.find(e => e.task === task);
    return entry?.fallbackBehavior ?? 'never';
}
function getDeterministicTasks() {
    return exports.PROVIDER_POLICY_MATRIX.filter(e => e.determinism === 'deterministic');
}
function getAiEnhancedTasks() {
    return exports.PROVIDER_POLICY_MATRIX.filter(e => e.determinism === 'ai_enhanced');
}
function validateProviderPolicyIntegrity() {
    const errors = [];
    for (const entry of exports.PROVIDER_POLICY_MATRIX) {
        if (entry.determinism === 'deterministic' && entry.fallbackBehavior !== 'never') {
            errors.push(`${entry.task}: deterministic task must have fallbackBehavior='never', got '${entry.fallbackBehavior}'`);
        }
        if (entry.determinism === 'ai_enhanced' && entry.fallbackBehavior === 'never') {
            errors.push(`${entry.task}: ai_enhanced task should not have fallbackBehavior='never'`);
        }
    }
    return errors;
}
//# sourceMappingURL=provider-policy.js.map