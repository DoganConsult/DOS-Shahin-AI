// @ts-nocheck — module-layer imports not yet extracted
// Shahin-owned product seed — GRC/compliance-specific AI asset definitions.
// Platform-reusable AI governance core must NOT import this file directly.
// Registration happens via registerAiGovernanceSeedProvider().

import type { CreateAssetInput } from '../../modules/ai-governance/services/ai/registry/ai-asset-inventory.service';
import { registerAiGovernanceSeedProvider } from '../../modules/ai-governance/services/ai/registry/ai-governance-seed-registry';
import type { AiGovernanceSeedCatalog, AllowlistModelEntry, ToolSeedEntry } from '../../modules/ai-governance/services/ai/registry/ai-governance-seed-registry';
// Deleted: agent-rbac-registry removed in mass deletion. DAuth registry will replace.
const registerAgentRbac = (_config: any) => {};
import { registerTaskComplexity } from '../../modules/workflow/services/tasks/task-complexity-registry';

const SHAHIN_AGENTS: CreateAssetInput[] = [
  { asset_type: 'agent', asset_key: 'A01', display_name: 'Onboarding Agent', description: 'User onboarding, organizational profiling, and regulatory scoping', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A01.json', metadata: { domain: 'Org Profiling', color: '#0ea5e9', icon: 'pi-user-plus' }, tags: ['agent', 'onboarding', 'scoping'] },
  { asset_type: 'agent', asset_key: 'A02', display_name: 'Identity Provisioning Agent', description: 'RBAC, IAM, SSO provisioning, and access governance', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A02.json', metadata: { domain: 'IAM & RBAC', color: '#8b5cf6', icon: 'pi-key' }, tags: ['agent', 'iam', 'rbac'] },
  { asset_type: 'agent', asset_key: 'A03', display_name: 'Framework Mapping Agent', description: 'Cross-framework mapping, harmonization, and regulatory intelligence', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A03.json', metadata: { domain: 'Cross-Mapping', color: '#f59e0b', icon: 'pi-sitemap' }, tags: ['agent', 'framework', 'mapping'] },
  { asset_type: 'agent', asset_key: 'A04', display_name: 'Control Authoring Agent', description: 'AI-assisted drafting for policies, controls, and implementation procedures', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A04.json', metadata: { domain: 'Drafting', color: '#10b981', icon: 'pi-file-edit' }, tags: ['agent', 'controls', 'authoring'] },
  { asset_type: 'agent', asset_key: 'A05', display_name: 'Evidence Collection Agent', description: 'Automated evidence collection, document intelligence, and compliance artifact management', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A05.json', metadata: { domain: 'Evidence', color: '#ec4899', icon: 'pi-folder-open' }, tags: ['agent', 'evidence', 'collection'] },
  { asset_type: 'agent', asset_key: 'A06', display_name: 'Gap Remediation Agent', description: 'Compliance gap detection, remediation roadmap generation, and prioritized action planning', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A06.json', metadata: { domain: 'Roadmaps', color: '#ef4444', icon: 'pi-map' }, tags: ['agent', 'gaps', 'remediation'] },
  { asset_type: 'agent', asset_key: 'A07', display_name: 'Risk Register Agent', description: 'Enterprise risk identification, quantitative scoring, treatment planning, and KRI monitoring', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A07.json', metadata: { domain: 'Risk Scoring', color: '#06b6d4', icon: 'pi-exclamation-triangle' }, tags: ['agent', 'risk', 'scoring'] },
  { asset_type: 'agent', asset_key: 'A08', display_name: 'Policy Lifecycle Agent', description: 'Policy versioning, approval workflows, expiry alerts, and regulatory change impact analysis', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A08.json', metadata: { domain: 'Governance', color: '#f97316', icon: 'pi-book' }, tags: ['agent', 'policy', 'lifecycle'] },
  { asset_type: 'agent', asset_key: 'A09', display_name: 'Third-Party Risk Agent', description: 'Vendor risk assessment, supply chain security, and third-party compliance monitoring', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A09.json', metadata: { domain: 'Vendor Risk', color: '#6366f1', icon: 'pi-link' }, tags: ['agent', 'vendor', 'tprm'] },
  { asset_type: 'agent', asset_key: 'A10', display_name: 'Audit Reporting Agent', description: 'Audit reporting, regulatory submissions, executive dashboards, and compliance certification tracking', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A10.json', metadata: { domain: 'Reporting', color: '#14b8a6', icon: 'pi-chart-bar' }, tags: ['agent', 'audit', 'reporting'] },
  { asset_type: 'agent', asset_key: 'A11', display_name: 'BCP Continuity Agent', description: 'Proactive business continuity monitoring, exercise scheduling, RTO/RPO drift detection, crisis readiness, and maturity regression alerting', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A11.json', metadata: { domain: 'Business Continuity', color: '#059669', icon: 'pi-shield' }, tags: ['agent', 'bcp', 'continuity'] },
  { asset_type: 'agent', asset_key: 'A12', display_name: 'Security Awareness & Training Agent', description: 'Training program management, awareness campaigns, completion tracking, skill gap analysis, and regulatory training compliance', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A12.json', metadata: { domain: 'Training & Awareness', color: '#d946ef', icon: 'pi-graduation-cap' }, tags: ['agent', 'training', 'awareness'] },
  { asset_type: 'agent', asset_key: 'A13', display_name: 'Landing Copilot Agent', description: 'Anonymous public-facing copilot on the marketing landing page — answers product questions, surfaces docs, and books demos. No tenant context, no write actions, no PII access. Dual-tagged in Langfuse as surface:landing-copilot and surface:agent-A13.', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'agents/A13.json', metadata: { domain: 'Public Copilot', color: '#0ea5e9', icon: 'pi-comments' }, tags: ['agent', 'landing', 'copilot', 'public'] },
];

const SHAHIN_PROVIDERS: CreateAssetInput[] = [
  { asset_type: 'provider', asset_key: 'claude', display_name: 'Anthropic Claude', description: 'Premium LLM provider — Claude models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'config/claude-client.ts', metadata: { tier: 'premium', env_key: 'CLAUDE_API_KEY' }, tags: ['provider', 'premium'] },
  { asset_type: 'provider', asset_key: 'azure-openai', display_name: 'Azure OpenAI', description: 'Premium LLM provider — GPT models via Azure', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts', metadata: { tier: 'premium', env_key: 'AZURE_OPENAI_API_KEY' }, tags: ['provider', 'premium'] },
  { asset_type: 'provider', asset_key: 'groq', display_name: 'Groq', description: 'Free LLM provider — fast inference', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'gemini', display_name: 'Google Gemini', description: 'Free LLM provider — Gemini models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'openrouter', display_name: 'OpenRouter', description: 'Free LLM provider — multi-model router', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'together', display_name: 'Together AI', description: 'Free LLM provider — open-source models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'cerebras', display_name: 'Cerebras', description: 'Free LLM provider — high-throughput inference', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'mistral', display_name: 'Mistral AI', description: 'Free LLM provider — Mistral models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'deepseek', display_name: 'DeepSeek', description: 'Free LLM provider — DeepSeek models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'sambanova', display_name: 'SambaNova', description: 'Free LLM provider — SambaNova models', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm.service.ts:freeProviders', metadata: { tier: 'free' }, tags: ['provider', 'free'] },
  { asset_type: 'provider', asset_key: 'ollama', display_name: 'Ollama (Local)', description: 'Local LLM provider — Ollama fallback', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/models/model-factory.ts', metadata: { tier: 'local', env_key: 'OLLAMA_BASE_URL' }, tags: ['provider', 'local'] },
];

const SHAHIN_MODELS: CreateAssetInput[] = [
  { asset_type: 'model', asset_key: 'claude.claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4', description: 'Anthropic Claude Sonnet 4 — premium reasoning model', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'claude', cost_input_1k: 0.003, cost_output_1k: 0.015 }, tags: ['model', 'premium', 'claude'] },
  { asset_type: 'model', asset_key: 'claude.claude-3-5-sonnet', display_name: 'Claude 3.5 Sonnet', description: 'Anthropic Claude 3.5 Sonnet — previous generation', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'claude', cost_input_1k: 0.003, cost_output_1k: 0.015 }, tags: ['model', 'premium', 'claude'] },
  { asset_type: 'model', asset_key: 'azure-openai.gpt-4o-mini', display_name: 'GPT-4o Mini', description: 'Azure OpenAI GPT-4o Mini — cost-efficient', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'azure-openai', cost_input_1k: 0.00015, cost_output_1k: 0.0006 }, tags: ['model', 'premium', 'azure'] },
  { asset_type: 'model', asset_key: 'azure-openai.gpt-4o', display_name: 'GPT-4o', description: 'Azure OpenAI GPT-4o — high capability', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'azure-openai', cost_input_1k: 0.005, cost_output_1k: 0.015 }, tags: ['model', 'premium', 'azure'] },
  { asset_type: 'model', asset_key: 'groq.llama-3.3-70b-versatile', display_name: 'Llama 3.3 70B (Groq)', description: 'Meta Llama 3.3 70B via Groq — free tier default', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'groq', cost_input_1k: 0, cost_output_1k: 0 }, tags: ['model', 'free', 'groq'] },
  { asset_type: 'model', asset_key: 'gemini.gemini-2.0-flash', display_name: 'Gemini 2.0 Flash', description: 'Google Gemini 2.0 Flash — free tier', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'gemini', cost_input_1k: 0, cost_output_1k: 0 }, tags: ['model', 'free', 'gemini'] },
  { asset_type: 'model', asset_key: 'deepseek.deepseek-chat', display_name: 'DeepSeek Chat', description: 'DeepSeek Chat — low-cost', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'deepseek', cost_input_1k: 0.00014, cost_output_1k: 0.00028 }, tags: ['model', 'free', 'deepseek'] },
  { asset_type: 'model', asset_key: 'mistral.mistral-small-latest', display_name: 'Mistral Small', description: 'Mistral Small — free tier', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'llm-usage-tracker.service.ts:COST_PER_1K', metadata: { provider: 'mistral', cost_input_1k: 0.0002, cost_output_1k: 0.0006 }, tags: ['model', 'free', 'mistral'] },
  { asset_type: 'model', asset_key: 'ollama.llama3.2-3b', display_name: 'Llama 3.2 3B (Ollama)', description: 'Local Ollama fallback model', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/models/model-factory.ts', metadata: { provider: 'ollama', cost_input_1k: 0, cost_output_1k: 0 }, tags: ['model', 'local', 'ollama'] },
];

const SHAHIN_TOOLS: ToolSeedEntry[] = [
  { agent: 'A01', name: 'scan_org_profile', privileged: false },
  { agent: 'A01', name: 'check_framework_adoption', privileged: false },
  { agent: 'A01', name: 'check_workspace_health', privileged: false },
  { agent: 'A01', name: 'create_onboarding_task', privileged: true },
  { agent: 'A02', name: 'list_users_with_access_info', privileged: false },
  { agent: 'A02', name: 'check_role_distribution', privileged: false },
  { agent: 'A02', name: 'flag_access_risk', privileged: true },
  { agent: 'A03', name: 'list_frameworks_with_coverage', privileged: false },
  { agent: 'A03', name: 'detect_gaps', privileged: false },
  { agent: 'A03', name: 'compare_frameworks', privileged: false },
  { agent: 'A03', name: 'create_mapping_task', privileged: true },
  { agent: 'A04', name: 'list_controls_needing_attention', privileged: false },
  { agent: 'A04', name: 'get_control_details', privileged: false },
  { agent: 'A04', name: 'update_control_notes', privileged: true },
  { agent: 'A05', name: 'detect_evidence_gaps', privileged: false },
  { agent: 'A05', name: 'check_evidence_freshness', privileged: false },
  { agent: 'A05', name: 'request_evidence_collection', privileged: true },
  { agent: 'A06', name: 'analyze_gaps', privileged: false },
  { agent: 'A06', name: 'generate_roadmap', privileged: false },
  { agent: 'A06', name: 'create_remediation_task', privileged: true },
  { agent: 'A07', name: 'identify_risks', privileged: false },
  { agent: 'A07', name: 'score_risk', privileged: true },
  { agent: 'A07', name: 'check_risk_appetite', privileged: false },
  { agent: 'A07', name: 'escalate_risk', privileged: true },
  { agent: 'A08', name: 'list_policies_with_health', privileged: false },
  { agent: 'A08', name: 'flag_policy_issue', privileged: true },
  { agent: 'A08', name: 'analyze_regulatory_impact', privileged: false },
  { agent: 'A09', name: 'list_vendors_with_risk', privileged: false },
  { agent: 'A09', name: 'assess_vendor', privileged: false },
  { agent: 'A09', name: 'score_vendor', privileged: true },
  { agent: 'A10', name: 'list_audit_findings', privileged: false },
  { agent: 'A10', name: 'check_audit_readiness', privileged: false },
  { agent: 'A10', name: 'generate_compliance_summary', privileged: false },
  { agent: 'A10', name: 'create_finding', privileged: true },
  { agent: 'A11', name: 'scan_bcp_readiness', privileged: false },
  { agent: 'A11', name: 'check_exercise_schedule', privileged: false },
  { agent: 'A11', name: 'check_rto_rpo_drift', privileged: false },
  { agent: 'A11', name: 'flag_bcp_risk', privileged: true },
  { agent: 'A11', name: 'create_bcp_task', privileged: true },
  { agent: 'A12', name: 'list_training_programs', privileged: false },
  { agent: 'A12', name: 'assign_training', privileged: true },
  { agent: 'A12', name: 'get_completion_status', privileged: false },
  { agent: 'A12', name: 'create_awareness_campaign', privileged: true },
  { agent: 'A12', name: 'get_training_gaps', privileged: false },
  { agent: 'A12', name: 'recommend_training', privileged: false },
];

const SHAHIN_WORKFLOWS: CreateAssetInput[] = [
  { asset_type: 'workflow', asset_key: 'workflow.agent-graph', display_name: 'Agent Execution Graph', description: '6-node LangGraph: guard → build_context → llm_call → tool_executor → action_router → finalize', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/graphs/agent-graph-factory.ts', metadata: { framework: 'langgraph', nodes: 6 }, tags: ['workflow', 'langgraph', 'agent-execution'] },
  { asset_type: 'workflow', asset_key: 'workflow.governance-pipeline', display_name: 'Governance AI Pipeline', description: '6-stage pipeline: signal → interpret → recommend → escalate → health → narrative', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/governance/governance-pipeline.ts', metadata: { framework: 'langgraph', stages: 6 }, tags: ['workflow', 'langgraph', 'governance'] },
  { asset_type: 'workflow', asset_key: 'workflow.copilot-graph', display_name: 'Copilot Routing Graph', description: 'Intent classification → agent delegation → general chat routing', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/copilot/copilot-graph.ts', metadata: { framework: 'langgraph' }, tags: ['workflow', 'langgraph', 'copilot'] },
  { asset_type: 'workflow', asset_key: 'workflow.intent-classifier', display_name: 'Intent Classifier', description: 'Classifies user messages into agent_query, general_query, status_check, report_request', scope_type: 'global', lifecycle_status: 'active', source_type: 'seeded', source_ref: 'ai/copilot/intent-classifier.ts', metadata: { framework: 'langgraph', intents: ['agent_query', 'general_query', 'status_check', 'report_request'] }, tags: ['workflow', 'langgraph', 'classifier'] },
];

const SHAHIN_ALLOWLIST_MODELS: AllowlistModelEntry[] = [
  { provider: 'groq', model_id: 'llama-3.3-70b-versatile', asset_key: 'groq.llama-3.3-70b-versatile' },
  { provider: 'gemini', model_id: 'gemini-2.0-flash', asset_key: 'gemini.gemini-2.0-flash' },
  { provider: 'deepseek', model_id: 'deepseek-chat', asset_key: 'deepseek.deepseek-chat' },
  { provider: 'mistral', model_id: 'mistral-small-latest', asset_key: 'mistral.mistral-small-latest' },
  { provider: 'claude', model_id: 'claude-sonnet-4-20250514', asset_key: 'claude.claude-sonnet-4-20250514' },
  { provider: 'azure-openai', model_id: 'gpt-4o-mini', asset_key: 'azure-openai.gpt-4o-mini' },
];

const SHAHIN_AGENT_IDS = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];

function buildShahinPromptAssets(): CreateAssetInput[] {
  return SHAHIN_AGENT_IDS.map(id => ({
    asset_type: 'prompt' as const,
    asset_key: `prompt.${id.toLowerCase()}.system.default`,
    display_name: `${id} Default System Prompt`,
    description: `Default system prompt for agent ${id}, seeded from AGENT_PROFILES`,
    scope_type: 'tenant' as const,
    lifecycle_status: 'active' as const,
    source_type: 'discovered' as const,
    source_ref: `agent_prompt_versions:${id}:v1`,
    metadata: { linked_agent: id, prompt_purpose: 'system', legacy_import: true, import_reason: 'pre-registry runtime prompt', approval_status: 'legacy-active' },
    tags: ['prompt', id.toLowerCase(), 'system'],
  }));
}

function buildShahinToolAssets(): CreateAssetInput[] {
  return SHAHIN_TOOLS.map(t => ({
    asset_type: 'tool' as const,
    asset_key: `tool.${t.agent.toLowerCase()}.${t.name}`,
    display_name: t.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: `Runtime executable tool for agent ${t.agent}`,
    scope_type: 'global' as const,
    lifecycle_status: 'active' as const,
    source_type: 'seeded' as const,
    source_ref: `ai/tools/tools-${t.agent.toLowerCase()}.ts`,
    metadata: { linked_agent: t.agent, privileged: t.privileged, executable: true, db_backed: true },
    tags: ['tool', t.agent.toLowerCase(), ...(t.privileged ? ['privileged'] : ['read-only'])],
  }));
}

function getShahinSeedCatalog(): AiGovernanceSeedCatalog {
  return {
    productCode: 'shahin-ai',
    agents: SHAHIN_AGENTS,
    providers: SHAHIN_PROVIDERS,
    models: SHAHIN_MODELS,
    tools: SHAHIN_TOOLS,
    toolAssets: buildShahinToolAssets(),
    workflows: SHAHIN_WORKFLOWS,
    prompts: buildShahinPromptAssets(),
    allowlistModels: SHAHIN_ALLOWLIST_MODELS,
    defaultModelKey: 'groq.llama-3.3-70b-versatile',
  };
}

export function registerShahinAiGovernanceSeed(): void {
  registerAiGovernanceSeedProvider('shahin', getShahinSeedCatalog);
}

const SHAHIN_AGENT_RBAC_DATA: Array<{
  agentId: string; name: string; nameAr: string; grcRole: string; grcRoleAr: string;
  permissions: string[]; domain: string; domainAr: string; icon: string; color: string;
  description: string; descriptionAr: string;
}> = [
  { agentId: 'A01', name: 'Onboarding Agent', nameAr: 'وكيل التهيئة', grcRole: 'Onboarding Specialist', grcRoleAr: 'أخصائي التهيئة', permissions: ['workspace.config.write', 'journey.record.write'], domain: 'Org Profiling', domainAr: 'ملف المؤسسة', icon: 'pi-user-plus', color: '#0ea5e9', description: 'Profiles organizations and recommends regulatory frameworks', descriptionAr: 'يُعدّ ملفات المنظمات ويوصي بالأطر التنظيمية' },
  { agentId: 'A02', name: 'Identity Provisioning Agent', nameAr: 'وكيل إدارة الهوية', grcRole: 'IAM Security Admin', grcRoleAr: 'مدير أمن الهوية', permissions: ['users.account.manage', 'profile.record.write'], domain: 'IAM & RBAC', domainAr: 'الهوية والصلاحيات', icon: 'pi-key', color: '#8b5cf6', description: 'Provisions users, enforces least-privilege, audits access', descriptionAr: 'يوفر المستخدمين ويفرض أقل الصلاحيات ويراقب الوصول' },
  { agentId: 'A03', name: 'Framework Mapping Agent', nameAr: 'وكيل ربط الأطر التنظيمية', grcRole: 'Compliance Analyst', grcRoleAr: 'محلل الامتثال', permissions: ['framework.record.manage', 'control.record.write'], domain: 'Cross-Mapping', domainAr: 'الربط المتقاطع', icon: 'pi-sitemap', color: '#f59e0b', description: 'Maps and harmonizes controls across regulatory frameworks', descriptionAr: 'يربط ويوحّد الضوابط عبر الأطر التنظيمية' },
  { agentId: 'A04', name: 'Control Authoring Agent', nameAr: 'وكيل تأليف الضوابط', grcRole: 'Policy Writer', grcRoleAr: 'كاتب السياسات', permissions: ['control.record.write', 'policy.procedure.write'], domain: 'Drafting', domainAr: 'الصياغة', icon: 'pi-file-edit', color: '#10b981', description: 'Drafts controls, policies, and implementation procedures', descriptionAr: 'يصيغ الضوابط والسياسات وإجراءات التنفيذ' },
  { agentId: 'A05', name: 'Evidence Collection Agent', nameAr: 'وكيل جمع الأدلة', grcRole: 'Evidence Collector', grcRoleAr: 'جامع الأدلة', permissions: ['evidence.item.write'], domain: 'Evidence', domainAr: 'الأدلة', icon: 'pi-folder-open', color: '#ec4899', description: 'Collects, validates, and tracks compliance evidence', descriptionAr: 'يجمع ويتحقق ويتتبع أدلة الامتثال' },
  { agentId: 'A06', name: 'Gap Remediation Agent', nameAr: 'وكيل معالجة الثغرات', grcRole: 'Remediation Planner', grcRoleAr: 'مخطط المعالجة', permissions: ['compliance.program.write', 'task.item.write'], domain: 'Roadmaps', domainAr: 'خرائط الطريق', icon: 'pi-map', color: '#ef4444', description: 'Detects compliance gaps and generates remediation roadmaps', descriptionAr: 'يكتشف فجوات الامتثال وينشئ خرائط طريق المعالجة' },
  { agentId: 'A07', name: 'Risk Register Agent', nameAr: 'وكيل سجل المخاطر', grcRole: 'Risk Manager', grcRoleAr: 'مدير المخاطر', permissions: ['risk.record.write'], domain: 'Risk Scoring', domainAr: 'تقييم المخاطر', icon: 'pi-exclamation-triangle', color: '#06b6d4', description: 'Identifies risks, scores them, and plans treatment strategies', descriptionAr: 'يحدد المخاطر ويقيّمها ويخطط لاستراتيجيات المعالجة' },
  { agentId: 'A08', name: 'Policy Lifecycle Agent', nameAr: 'وكيل دورة حياة السياسات', grcRole: 'Policy Governance Officer', grcRoleAr: 'مسؤول حوكمة السياسات', permissions: ['policy.document.write'], domain: 'Governance', domainAr: 'الحوكمة', icon: 'pi-book', color: '#f97316', description: 'Manages policy versioning, approvals, and expiry alerts', descriptionAr: 'يدير إصدارات السياسات والاعتمادات وتنبيهات الانتهاء' },
  { agentId: 'A09', name: 'Third-Party Risk Agent', nameAr: 'وكيل مخاطر الأطراف الثالثة', grcRole: 'Vendor Risk Analyst', grcRoleAr: 'محلل مخاطر الموردين', permissions: ['vendor.record.write'], domain: 'Vendor Risk', domainAr: 'مخاطر الموردين', icon: 'pi-link', color: '#6366f1', description: 'Assesses vendor security posture and monitors third-party risk', descriptionAr: 'يقيّم الوضع الأمني للموردين ويراقب مخاطر الأطراف الثالثة' },
  { agentId: 'A10', name: 'Audit Reporting Agent', nameAr: 'وكيل تقارير التدقيق', grcRole: 'Audit Reporter', grcRoleAr: 'مُعدّ تقارير التدقيق', permissions: ['report.document.write', 'audit.record.manage'], domain: 'Reporting', domainAr: 'التقارير', icon: 'pi-chart-bar', color: '#14b8a6', description: 'Generates compliance reports and regulatory submissions', descriptionAr: 'ينشئ تقارير الامتثال والتقديمات التنظيمية' },
  { agentId: 'A11', name: 'BCP Continuity Agent', nameAr: 'وكيل استمرارية الأعمال', grcRole: 'BCP Coordinator', grcRoleAr: 'منسق استمرارية الأعمال', permissions: ['bcp.plan.read', 'bcp.plan.write', 'task.item.write', 'evidence.item.write'], domain: 'Business Continuity', domainAr: 'استمرارية الأعمال', icon: 'pi-shield', color: '#059669', description: 'Proactive BCP monitoring, exercise scheduling, and crisis readiness', descriptionAr: 'مراقبة استباقية لاستمرارية الأعمال وجدولة التمارين وجاهزية الأزمات' },
  { agentId: 'A12', name: 'Security Awareness & Training Agent', nameAr: 'وكيل التوعية والتدريب الأمني', grcRole: 'Training Coordinator', grcRoleAr: 'منسق التدريب', permissions: ['training.record.read', 'training.record.write', 'task.item.write'], domain: 'Training & Awareness', domainAr: 'التدريب والتوعية', icon: 'pi-graduation-cap', color: '#d946ef', description: 'Manages training programs, tracks completion, identifies skill gaps', descriptionAr: 'يدير برامج التدريب ويتتبع الإنجاز ويحدد فجوات المهارات' },
];

const SHAHIN_TASK_COMPLEXITY_DATA: Array<[string, 'low' | 'medium' | 'high' | 'critical']> = [
  ['classify', 'low'],
  ['summarize', 'low'],
  ['notify', 'low'],
  ['update_status', 'low'],
  ['score_risk', 'medium'],
  ['collect_evidence', 'medium'],
  ['assess_vendor', 'medium'],
  ['generate_report', 'medium'],
  ['map_framework', 'high'],
  ['analyze_gap', 'high'],
  ['draft_policy', 'critical'],
  ['remediation_plan', 'high'],
  ['incident_triage', 'high'],
  ['audit_preparation', 'high'],
];

for (const entry of SHAHIN_AGENT_RBAC_DATA) registerAgentRbac(entry);
for (const [taskType, tier] of SHAHIN_TASK_COMPLEXITY_DATA) registerTaskComplexity(taskType, tier);

registerShahinAiGovernanceSeed();
