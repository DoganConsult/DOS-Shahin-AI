// ============================================
// Shahin — AGRC Route Ownership Manifest
// Declares product ownership of routes per Law 2
// (Product Separation). Platform routes are shared
// infrastructure; AGRC routes are product-specific.
//
// This manifest is declarative only — it does NOT
// mount routes. See agrc-route-manifest.ts for
// the runtime mount list.
// ============================================

/**
 * Declares which product or platform layer owns a given API path.
 * Used for governance audits, dependency analysis, and future
 * multi-product route isolation.
 */
export interface RouteOwnership {
  /** Express mount path (e.g. '/api/risks') */
  path: string;
  /** 'platform' = shared infrastructure, 'agrc' = Shahin AGRC product */
  owner: 'platform' | 'agrc';
  /** Logical module within the owner boundary */
  moduleCode: string;
  /** Human-readable purpose */
  description: string;
}

// ---------------------------------------------------------------------------
// Route Ownership Catalog
// ---------------------------------------------------------------------------
// Sources:
//   - server.ts explicit mounts (platform routes)
//   - agrc-route-manifest.ts AGRC_ROUTE_MANIFEST (product routes)
//   - modules/platform/routes/ (platform route files)
// ---------------------------------------------------------------------------

export const AGRC_ROUTE_OWNERSHIP: RouteOwnership[] = [

  // ========================================================================
  // Platform routes — shared infrastructure (mounted in server.ts directly)
  // ========================================================================

  // Health & monitoring
  { path: '/api/health',              owner: 'platform', moduleCode: 'platform',       description: 'Health check (liveness + readiness)' },
  { path: '/api/health/deep',         owner: 'platform', moduleCode: 'platform',       description: 'Deep health check (DB, Redis, external)' },
  { path: '/api/monitoring',          owner: 'platform', moduleCode: 'platform',       description: 'Monitoring endpoints' },
  { path: '/api/metrics',             owner: 'platform', moduleCode: 'platform',       description: 'Prometheus metrics scrape endpoint' },
  { path: '/api/service-health',      owner: 'platform', moduleCode: 'platform',       description: 'Service-level health status' },
  { path: '/api/module-status',       owner: 'platform', moduleCode: 'platform',       description: 'Module activation status' },

  // Authentication & authorization
  { path: '/api/auth',                owner: 'platform', moduleCode: 'auth',           description: 'Authentication (login, register, refresh, logout)' },
  { path: '/api/auth/verify-email',   owner: 'platform', moduleCode: 'auth',           description: 'Email verification' },
  { path: '/api/auth/userinfo',       owner: 'platform', moduleCode: 'auth',           description: 'Current user info' },

  // Onboarding & provisioning (platform orchestration layer)
  { path: '/api/onboarding',          owner: 'platform', moduleCode: 'onboarding',     description: 'Onboarding flow (question bank, sessions)' },
  { path: '/api/onboarding/config',   owner: 'platform', moduleCode: 'onboarding',     description: 'Onboarding configuration' },
  { path: '/api/provisioning',        owner: 'platform', moduleCode: 'provisioning',   description: 'Workspace provisioning orchestrator' },
  { path: '/api/provisioning/v2',     owner: 'platform', moduleCode: 'provisioning',   description: 'Canonical provisioning controller' },

  // Subscription & billing
  { path: '/api/subscription',        owner: 'platform', moduleCode: 'billing',        description: 'Subscription lifecycle management' },
  { path: '/api/admin/subscriptions', owner: 'platform', moduleCode: 'billing',        description: 'Admin subscription management' },
  { path: '/api/payment',             owner: 'platform', moduleCode: 'billing',        description: 'Payment processing' },

  // Multi-tenant infrastructure
  { path: '/api/invitations',         owner: 'platform', moduleCode: 'platform',       description: 'Tenant user invitations' },
  { path: '/api/ontology',            owner: 'platform', moduleCode: 'platform',       description: 'Regulatory ontology (sector/authority/framework tree)' },
  { path: '/api/features',            owner: 'platform', moduleCode: 'platform',       description: 'Feature tables / feature flags' },

  // External portals (bypass tenant guard)
  { path: '/api/vendor-portal',       owner: 'platform', moduleCode: 'portal',         description: 'External vendor self-service portal' },
  { path: '/api/regulator-portal',    owner: 'platform', moduleCode: 'portal',         description: 'External regulator portal' },
  { path: '/api/consultant-center',   owner: 'platform', moduleCode: 'portal',         description: 'Consultant center portal' },

  // Webhooks & integrations (platform-level)
  { path: '/api/webhooks',            owner: 'platform', moduleCode: 'platform',       description: 'Inbound webhook receiver' },
  { path: '/api/pipeline-webhook',    owner: 'platform', moduleCode: 'platform',       description: 'CI/CD pipeline webhook' },

  // Public & marketing
  { path: '/api/public',              owner: 'platform', moduleCode: 'public',         description: 'Public content (lead capture, landing, stats)' },
  { path: '/api/quotes',              owner: 'platform', moduleCode: 'public',         description: 'Marketing quotes' },

  // AI infrastructure (platform-level agent metrics & observability)
  { path: '/api/agent-metrics',       owner: 'platform', moduleCode: 'ai-platform',    description: 'Agent performance metrics' },
  { path: '/api/dead-letter-queue',   owner: 'platform', moduleCode: 'ai-platform',    description: 'Dead letter queue management' },
  { path: '/api/handoff-queue',       owner: 'platform', moduleCode: 'ai-platform',    description: 'Human-in-the-loop handoff queue' },
  { path: '/api/trace-correlation',   owner: 'platform', moduleCode: 'ai-platform',    description: 'Distributed trace correlation' },
  { path: '/api/personal-agent',      owner: 'platform', moduleCode: 'ai-platform',    description: 'Per-user personal AI agent' },

  // Platform utilities
  { path: '/api/openclaw',            owner: 'platform', moduleCode: 'platform',       description: 'OpenClaw legal integration' },
  { path: '/api/mcp',                 owner: 'platform', moduleCode: 'platform',       description: 'Model Context Protocol endpoint' },
  { path: '/api/api-docs',            owner: 'platform', moduleCode: 'platform',       description: 'OpenAPI / Swagger documentation' },

  // ========================================================================
  // AGRC product routes — GRC domain (mounted via product catalog)
  // ========================================================================

  // -- Risk management --
  { path: '/api/risks',               owner: 'agrc', moduleCode: 'risk',         description: 'Risk register CRUD' },
  { path: '/api/risk-ws',             owner: 'agrc', moduleCode: 'risk',         description: 'Risk workspace' },
  { path: '/api/risk-smart',          owner: 'agrc', moduleCode: 'risk',         description: 'Risk smart analysis' },
  { path: '/api/risk-metrics',        owner: 'agrc', moduleCode: 'risk',         description: 'Risk KRI metrics' },
  { path: '/api/risk-scoring',        owner: 'agrc', moduleCode: 'risk',         description: 'Risk scoring engine' },
  { path: '/api/risk-trends',         owner: 'agrc', moduleCode: 'risk',         description: 'Risk trend analysis' },
  { path: '/api/risk-quantification', owner: 'agrc', moduleCode: 'risk',         description: 'Risk quantification (FAIR)' },
  { path: '/api/risk-peer-review',    owner: 'agrc', moduleCode: 'risk',         description: 'Risk peer review workflows' },
  { path: '/api/monte-carlo',         owner: 'agrc', moduleCode: 'risk',         description: 'Monte Carlo risk simulation' },
  { path: '/api/model-risk',          owner: 'agrc', moduleCode: 'risk',         description: 'Model risk management' },

  // -- Compliance --
  { path: '/api/compliance',          owner: 'agrc', moduleCode: 'compliance',   description: 'Compliance module' },
  { path: '/api/compliance-ws',       owner: 'agrc', moduleCode: 'compliance',   description: 'Compliance workspace' },
  { path: '/api/controls',            owner: 'agrc', moduleCode: 'controls',     description: 'Controls management — library, CRUD, testing, AI' },
  { path: '/api/controls/home',      owner: 'agrc', moduleCode: 'controls',     description: 'Controls home KPI dashboard' },
  { path: '/api/controls/work-queue',owner: 'agrc', moduleCode: 'controls',     description: 'Controls work queue' },
  { path: '/api/controls/mapping',   owner: 'agrc', moduleCode: 'controls',     description: 'Control mapping & coverage' },
  { path: '/api/controls/certifications', owner: 'agrc', moduleCode: 'controls', description: 'Control certifications' },
  { path: '/api/controls/deficiencies',   owner: 'agrc', moduleCode: 'controls', description: 'Control deficiencies & remediation' },
  { path: '/api/controls/monitoring',owner: 'agrc', moduleCode: 'controls',     description: 'Control monitoring rules & alerts' },
  { path: '/api/controls/reports',   owner: 'agrc', moduleCode: 'controls',     description: 'Control reports' },
  { path: '/api/controls/admin',     owner: 'agrc', moduleCode: 'controls',     description: 'Control admin settings' },
  { path: '/api/lifecycle',           owner: 'agrc', moduleCode: 'controls',     description: 'Control lifecycle' },
  { path: '/api/ucf',                 owner: 'agrc', moduleCode: 'compliance',   description: 'Unified Controls Framework' },
  { path: '/api/frameworks',          owner: 'agrc', moduleCode: 'compliance',   description: 'Framework management' },
  { path: '/api/framework-mapping',   owner: 'agrc', moduleCode: 'compliance',   description: 'Cross-framework mapping' },
  { path: '/api/mappings',            owner: 'agrc', moduleCode: 'compliance',   description: 'Control-to-framework mappings' },
  { path: '/api/objects',             owner: 'agrc', moduleCode: 'compliance',   description: 'Common compliance objects' },
  { path: '/api/exceptions',          owner: 'agrc', moduleCode: 'compliance',   description: 'Control exceptions' },
  { path: '/api/scoring-policies',    owner: 'agrc', moduleCode: 'compliance',   description: 'Scoring policies' },
  { path: '/api/scoring-policy-engine', owner: 'agrc', moduleCode: 'compliance', description: 'Scoring policy engine' },
  { path: '/api/pdpl-consent',        owner: 'agrc', moduleCode: 'compliance',   description: 'PDPL consent lifecycle' },
  { path: '/api/consent-lifecycle',   owner: 'agrc', moduleCode: 'compliance',   description: 'Consent lifecycle management' },
  { path: '/api/dpia',                owner: 'agrc', moduleCode: 'compliance',   description: 'Data Protection Impact Assessment' },
  { path: '/api/privacy-ops',         owner: 'agrc', moduleCode: 'compliance',   description: 'Privacy operations' },
  { path: '/api/privacy-budget',      owner: 'agrc', moduleCode: 'compliance',   description: 'Privacy budget tracking' },
  { path: '/api/dora-resilience',     owner: 'agrc', moduleCode: 'compliance',   description: 'DORA digital resilience' },
  { path: '/api/quantum-readiness',   owner: 'agrc', moduleCode: 'compliance',   description: 'Quantum readiness assessment' },
  { path: '/api/attestation',         owner: 'agrc', moduleCode: 'compliance',   description: 'Policy attestation' },

  // -- Governance --
  { path: '/api/governance',          owner: 'agrc', moduleCode: 'governance',   description: 'Governance module' },
  { path: '/api/governance/mandates', owner: 'agrc', moduleCode: 'governance',   description: 'Governance mandates' },
  { path: '/api/governance/delegations', owner: 'agrc', moduleCode: 'governance', description: 'Governance delegations' },
  { path: '/api/governance/obligations', owner: 'agrc', moduleCode: 'governance', description: 'Governance obligations' },
  { path: '/api/governance/charters', owner: 'agrc', moduleCode: 'governance',   description: 'Governance charters' },
  { path: '/api/governance/health',   owner: 'agrc', moduleCode: 'governance',   description: 'Governance health dashboard' },
  { path: '/api/governance/structure', owner: 'agrc', moduleCode: 'governance',  description: 'Governance structure' },
  { path: '/api/governance/board-packs', owner: 'agrc', moduleCode: 'governance', description: 'Board packs' },
  { path: '/api/governance/responsibilities', owner: 'agrc', moduleCode: 'governance', description: 'Governance responsibilities' },
  { path: '/api/governance/raci',     owner: 'agrc', moduleCode: 'governance',   description: 'Governance RACI matrix' },
  { path: '/api/governance/enforcement', owner: 'agrc', moduleCode: 'governance', description: 'Governance enforcement' },
  { path: '/api/governance/reviews',  owner: 'agrc', moduleCode: 'governance',   description: 'Governance reviews' },
  { path: '/api/governance/acknowledgements', owner: 'agrc', moduleCode: 'governance', description: 'Governance acknowledgements' },
  { path: '/api/governance/objectives', owner: 'agrc', moduleCode: 'governance', description: 'Governance objectives' },
  { path: '/api/governance/executive-summaries', owner: 'agrc', moduleCode: 'governance', description: 'Executive summaries' },
  { path: '/api/governance/hooks',    owner: 'agrc', moduleCode: 'governance',   description: 'Governance hooks' },
  { path: '/api/governance/registers', owner: 'agrc', moduleCode: 'governance',  description: 'Governance registers' },
  { path: '/api/governance/raci-templates', owner: 'agrc', moduleCode: 'governance', description: 'RACI templates' },
  { path: '/api/governance/ethics',   owner: 'agrc', moduleCode: 'governance',   description: 'Ethics governance' },
  { path: '/api/governance/workload', owner: 'agrc', moduleCode: 'governance',   description: 'Governance workload' },
  { path: '/api/governance/ai',       owner: 'agrc', moduleCode: 'governance',   description: 'AI governance integration' },
  { path: '/api/governance-os',       owner: 'agrc', moduleCode: 'governance',   description: 'Governance OS' },
  { path: '/api/grc-lifecycle',       owner: 'agrc', moduleCode: 'governance',   description: 'GRC lifecycle gaps' },
  { path: '/api/grc-raci',            owner: 'agrc', moduleCode: 'governance',   description: 'GRC RACI matrix' },

  // -- Audit --
  { path: '/api/audit',               owner: 'agrc', moduleCode: 'audit',        description: 'Audit module' },
  { path: '/api/audit-trail',         owner: 'agrc', moduleCode: 'audit',        description: 'Audit trail' },
  { path: '/api/audit-packages',      owner: 'agrc', moduleCode: 'audit',        description: 'Audit packages' },
  { path: '/api/audit-package',       owner: 'agrc', moduleCode: 'audit',        description: 'Audit package detail' },
  { path: '/api/audit/universe',      owner: 'agrc', moduleCode: 'audit',        description: 'Audit universe' },
  { path: '/api/audit/risk-scoring',  owner: 'agrc', moduleCode: 'audit',        description: 'Audit risk scoring' },
  { path: '/api/audit/schedules',     owner: 'agrc', moduleCode: 'audit',        description: 'Audit schedules' },
  { path: '/api/audit/working-papers', owner: 'agrc', moduleCode: 'audit',       description: 'Audit working papers' },
  { path: '/api/audit/team',          owner: 'agrc', moduleCode: 'audit',        description: 'Audit team management' },
  { path: '/api/audit/repeat-findings', owner: 'agrc', moduleCode: 'audit',      description: 'Audit repeat findings' },
  { path: '/api/audit/evidence-versions', owner: 'agrc', moduleCode: 'audit',    description: 'Audit evidence versions' },
  { path: '/api/audit/qa-reviews',    owner: 'agrc', moduleCode: 'audit',        description: 'Audit QA reviews' },
  { path: '/api/audit/finding-trends', owner: 'agrc', moduleCode: 'audit',       description: 'Audit finding trends' },
  { path: '/api/audit/ratings',       owner: 'agrc', moduleCode: 'audit',        description: 'Audit ratings' },
  { path: '/api/audit/capa-effectiveness', owner: 'agrc', moduleCode: 'audit',   description: 'Audit CAPA effectiveness' },
  { path: '/api/audit/committee',     owner: 'agrc', moduleCode: 'audit',        description: 'Audit committee reporting' },
  { path: '/api/audit/external',      owner: 'agrc', moduleCode: 'audit',        description: 'External audit coordination' },
  { path: '/api/audit/regulatory',    owner: 'agrc', moduleCode: 'audit',        description: 'Regulatory audit tracking' },
  { path: '/api/audit/test-plans',    owner: 'agrc', moduleCode: 'audit',        description: 'Audit test plans' },
  { path: '/api/audit/finding-slas',  owner: 'agrc', moduleCode: 'audit',        description: 'Audit finding SLAs' },
  { path: '/api/audit/time-tracking', owner: 'agrc', moduleCode: 'audit',        description: 'Audit time tracking' },
  { path: '/api/audit/reminders',     owner: 'agrc', moduleCode: 'audit',        description: 'Audit reminders' },
  { path: '/api/audit/templates',     owner: 'agrc', moduleCode: 'audit',        description: 'Audit templates' },
  { path: '/api/audit/cross-module',  owner: 'agrc', moduleCode: 'audit',        description: 'Audit cross-module linkage' },
  { path: '/api/akb',                 owner: 'agrc', moduleCode: 'audit',        description: 'Audit knowledge base' },
  { path: '/api/findings',            owner: 'agrc', moduleCode: 'audit',        description: 'Findings management' },
  { path: '/api/findings-standalone', owner: 'agrc', moduleCode: 'audit',        description: 'Standalone findings CRUD' },

  // -- Evidence --
  { path: '/api/evidence',            owner: 'agrc', moduleCode: 'evidence',     description: 'Evidence lifecycle' },
  { path: '/api/evidence-catalog',    owner: 'agrc', moduleCode: 'evidence',     description: 'Evidence catalog' },
  { path: '/api/evidence-tasks',      owner: 'agrc', moduleCode: 'evidence',     description: 'Evidence collection tasks' },

  // -- Policy & procedures --
  { path: '/api/policy-code',         owner: 'agrc', moduleCode: 'policy',       description: 'Policy-as-code engine' },
  { path: '/api/policies',            owner: 'agrc', moduleCode: 'policy',       description: 'Policy CRUD' },
  { path: '/api/policy-lifecycle',    owner: 'agrc', moduleCode: 'policy',       description: 'Policy lifecycle management' },
  { path: '/api/policy-templates',    owner: 'agrc', moduleCode: 'policy',       description: 'Policy templates' },
  { path: '/api/sop-library',         owner: 'agrc', moduleCode: 'policy',       description: 'SOP library' },

  // -- Incident & BCP --
  { path: '/api/incidents',           owner: 'agrc', moduleCode: 'incident',     description: 'Incident management' },
  { path: '/api/incidents-advanced',  owner: 'agrc', moduleCode: 'incident',     description: 'Incident advanced features' },
  { path: '/api/bcp',                 owner: 'agrc', moduleCode: 'bcp',          description: 'Business continuity planning' },
  { path: '/api/bcm-advanced',        owner: 'agrc', moduleCode: 'bcp',          description: 'BCM advanced features' },

  // -- Vendor / third-party risk --
  { path: '/api/vendors',             owner: 'agrc', moduleCode: 'vendor',       description: 'Vendor management' },
  { path: '/api/vendors-advanced',    owner: 'agrc', moduleCode: 'vendor',       description: 'Vendor advanced features' },
  { path: '/api/vendor-risk',         owner: 'agrc', moduleCode: 'vendor',       description: 'Vendor risk extended' },
  { path: '/api/vendor-cyber-rating', owner: 'agrc', moduleCode: 'vendor',       description: 'Vendor cyber rating' },
  { path: '/api/vendor-compliance-sync', owner: 'agrc', moduleCode: 'vendor',    description: 'Vendor compliance sync' },
  { path: '/api/vendor-scoring',      owner: 'agrc', moduleCode: 'vendor',       description: 'Vendor scoring' },
  { path: '/api/score-calibration',   owner: 'agrc', moduleCode: 'vendor',       description: 'Score calibration' },

  // -- AI / Copilot (AGRC-domain AI, not platform AI infra) --
  { path: '/api/ai',                  owner: 'agrc', moduleCode: 'ai',           description: 'AI module' },
  { path: '/api/copilot',             owner: 'agrc', moduleCode: 'ai',           description: 'GRC Copilot' },
  { path: '/api/ai-enhanced',         owner: 'agrc', moduleCode: 'ai',           description: 'AI-enhanced features' },
  { path: '/api/ai-triggers',         owner: 'agrc', moduleCode: 'ai',           description: 'AI event triggers' },
  { path: '/api/ai-squad',            owner: 'agrc', moduleCode: 'ai',           description: 'AI agent squad' },
  { path: '/api/ai-assets',           owner: 'agrc', moduleCode: 'ai-governance', description: 'AI asset inventory' },
  { path: '/api/model-registry',      owner: 'agrc', moduleCode: 'ai-governance', description: 'AI model registry' },
  { path: '/api/prompt-registry',     owner: 'agrc', moduleCode: 'ai-governance', description: 'AI prompt registry' },
  { path: '/api/agent-registry',      owner: 'agrc', moduleCode: 'ai-governance', description: 'AI agent registry' },
  { path: '/api/ai-bindings',         owner: 'agrc', moduleCode: 'ai-governance', description: 'AI binding governance' },
  { path: '/api/ai-governance',       owner: 'agrc', moduleCode: 'ai-governance', description: 'AI governance module' },
  { path: '/api/contextual-ai',       owner: 'agrc', moduleCode: 'ai',           description: 'Contextual AI assistant' },
  { path: '/api/explainability',      owner: 'agrc', moduleCode: 'ai',           description: 'AI explainability' },
  // AI OS cockpit + dry-run/replay: mounted at /api (see routes/ai-os-cockpit.routes → /api/ai-os/*); agrc-route-manifest includes /api mounts.

  // -- Advanced AI governance (Phase 4) --
  { path: '/api/ai-agent-governance-p4', owner: 'agrc', moduleCode: 'ai-governance', description: 'AI agent governance Phase 4' },
  { path: '/api/ai-post-market',      owner: 'agrc', moduleCode: 'ai-governance', description: 'AI post-market surveillance' },
  { path: '/api/ai-privacy',          owner: 'agrc', moduleCode: 'ai-governance', description: 'AI privacy governance' },
  { path: '/api/ai-supply-chain',     owner: 'agrc', moduleCode: 'ai-governance', description: 'AI supply chain governance' },
  { path: '/api/ai-systems',          owner: 'agrc', moduleCode: 'ai-governance', description: 'AI system registry' },
  { path: '/api/ai-experiments',      owner: 'agrc', moduleCode: 'ai-governance', description: 'AI model experiments' },

  // -- AGRC-OS engine --
  { path: '/api/agrc-os',             owner: 'agrc', moduleCode: 'ai',      description: 'AGRC-OS autonomous engine' },
  { path: '/api/agrc-os/events/dlq',  owner: 'agrc', moduleCode: 'ai',      description: 'AGRC-OS event dead letter queue' },
  { path: '/api/autonomous',          owner: 'agrc', moduleCode: 'ai',      description: 'Autonomous workflow engine' },
  { path: '/api/autonomy',            owner: 'agrc', moduleCode: 'ai',      description: 'Autonomy controls' },
  { path: '/api/ccm-cloud',           owner: 'agrc', moduleCode: 'ai',      description: 'Continuous Control Monitoring' },

  // -- KSA / regulatory --
  { path: '/api/nca-assessment',      owner: 'agrc', moduleCode: 'compliance',          description: 'NCA assessment' },
  { path: '/api/sama-assessment',     owner: 'agrc', moduleCode: 'compliance',          description: 'SAMA assessment' },
  { path: '/api/ksa',                 owner: 'agrc', moduleCode: 'compliance',          description: 'KSA regulatory hub' },
  { path: '/api/regulatory-content',  owner: 'agrc', moduleCode: 'compliance',          description: 'Regulatory content library' },
  { path: '/api/regulatory-delta',    owner: 'agrc', moduleCode: 'compliance',          description: 'Regulatory change delta' },
  { path: '/api/nca/export',          owner: 'agrc', moduleCode: 'compliance',          description: 'NCA export' },
  { path: '/api/regulation-compiler', owner: 'agrc', moduleCode: 'compliance',          description: 'Regulation compiler' },
  { path: '/api/regulator-heatmap',   owner: 'agrc', moduleCode: 'compliance',          description: 'Regulator heatmap' },

  // -- Assessments --
  { path: '/api/assessments',         owner: 'agrc', moduleCode: 'compliance',   description: 'Assessment management' },
  { path: '/api/assessment-templates', owner: 'agrc', moduleCode: 'compliance',  description: 'Assessment templates' },
  { path: '/api/maturity',            owner: 'agrc', moduleCode: 'compliance',   description: 'Maturity assessment' },
  { path: '/api/maturity-ext',        owner: 'agrc', moduleCode: 'compliance',   description: 'Maturity extended features' },
  { path: '/api/rcsa',                owner: 'agrc', moduleCode: 'compliance',   description: 'Risk & Control Self-Assessment' },
  { path: '/api/csa',                 owner: 'agrc', moduleCode: 'compliance',   description: 'Control Self-Assessment' },

  // -- Reporting & analytics --
  { path: '/api/reports',             owner: 'agrc', moduleCode: 'reporting',    description: 'Report generation' },
  { path: '/api/report-ext',          owner: 'agrc', moduleCode: 'reporting',    description: 'Advanced reporting' },
  { path: '/api/report-hub',          owner: 'agrc', moduleCode: 'reporting',    description: 'Report hub' },
  { path: '/api/report-center',       owner: 'agrc', moduleCode: 'reporting',    description: 'Report center' },
  { path: '/api/report-templates',    owner: 'agrc', moduleCode: 'reporting',    description: 'Report templates' },
  { path: '/api/report-scenarios',    owner: 'agrc', moduleCode: 'reporting',    description: 'Report scenarios' },
  { path: '/api/board-reports',       owner: 'agrc', moduleCode: 'reporting',    description: 'Board-level reports' },
  { path: '/api/analytics',           owner: 'agrc', moduleCode: 'analytics',    description: 'Analytics dashboard data' },
  { path: '/api/predictive-analytics', owner: 'agrc', moduleCode: 'analytics',   description: 'Predictive analytics' },
  { path: '/api/engagement-analytics', owner: 'agrc', moduleCode: 'analytics',   description: 'Engagement analytics' },
  { path: '/api/chart-data',          owner: 'agrc', moduleCode: 'analytics',    description: 'Chart data API' },
  { path: '/api/kpi',                 owner: 'agrc', moduleCode: 'analytics',    description: 'KPI detail' },
  { path: '/api/program-health',      owner: 'agrc', moduleCode: 'analytics',    description: 'Program health metrics' },
  { path: '/api/powerbi',             owner: 'agrc', moduleCode: 'analytics',    description: 'Power BI integration' },

  // -- Workspace & admin --
  { path: '/api/admin',               owner: 'agrc', moduleCode: 'admin',        description: 'Admin panel' },
  { path: '/api/admin/platform-config', owner: 'agrc', moduleCode: 'admin',      description: 'Platform configuration' },
  { path: '/api/admin/modules-report', owner: 'agrc', moduleCode: 'admin',       description: 'Modules report' },
  { path: '/api/admin/content-packs', owner: 'agrc', moduleCode: 'admin',        description: 'Content packs management' },
  { path: '/api/workspaces',          owner: 'agrc', moduleCode: 'admin',    description: 'Workspace CRUD' },
  { path: '/api/workspace-home',      owner: 'agrc', moduleCode: 'admin',    description: 'Workspace home dashboard' },
  { path: '/api/workspace-lifecycle', owner: 'agrc', moduleCode: 'admin',    description: 'Workspace lifecycle' },
  { path: '/api/workspace-ignite',    owner: 'agrc', moduleCode: 'admin',    description: 'Workspace ignite (quick-start)' },
  { path: '/api/tenant-home',         owner: 'agrc', moduleCode: 'admin',    description: 'Tenant home page data' },
  { path: '/api/tenant-config',       owner: 'agrc', moduleCode: 'admin',    description: 'Tenant configuration' },
  { path: '/api/tenant-email-config', owner: 'agrc', moduleCode: 'admin',    description: 'Tenant email configuration' },
  { path: '/api/tenant',              owner: 'agrc', moduleCode: 'admin',    description: 'Tenant entitlements' },
  { path: '/api/tier',                owner: 'agrc', moduleCode: 'admin',    description: 'Subscription tier management' },
  { path: '/api/bootstrap',           owner: 'agrc', moduleCode: 'admin',    description: 'Bootstrap checklist' },
  { path: '/api/security-config',     owner: 'agrc', moduleCode: 'admin',    description: 'Security configuration' },
  { path: '/api/users',               owner: 'agrc', moduleCode: 'admin',    description: 'User management' },
  { path: '/api/jobs',                owner: 'agrc', moduleCode: 'admin',    description: 'Job monitoring' },

  // -- Foundation / org structure --
  { path: '/api/foundation-governance', owner: 'agrc', moduleCode: 'foundation', description: 'Foundation governance' },
  { path: '/api/foundation/roles',    owner: 'agrc', moduleCode: 'foundation',   description: 'Foundation roles' },
  { path: '/api/positions',           owner: 'agrc', moduleCode: 'foundation',   description: 'Positions management' },
  { path: '/api/access-review',       owner: 'agrc', moduleCode: 'foundation',   description: 'Access review' },
  { path: '/api/locations',           owner: 'agrc', moduleCode: 'foundation',   description: 'Locations management' },
  { path: '/api/departments',         owner: 'agrc', moduleCode: 'foundation',   description: 'Departments management' },
  { path: '/api/organizations',       owner: 'agrc', moduleCode: 'foundation',   description: 'Organizations management' },
  { path: '/api/business-units',      owner: 'agrc', moduleCode: 'foundation',   description: 'Business units management' },
  { path: '/api/ownership-mapping',   owner: 'agrc', moduleCode: 'foundation',   description: 'Ownership mapping' },
  { path: '/api/modules',             owner: 'agrc', moduleCode: 'foundation',   description: 'Modules management' },
  { path: '/api/processes',           owner: 'agrc', moduleCode: 'foundation',   description: 'Business processes' },
  { path: '/api/products',            owner: 'agrc', moduleCode: 'foundation',   description: 'Products catalog' },
  { path: '/api/reference-data',      owner: 'agrc', moduleCode: 'foundation',   description: 'Reference data' },
  { path: '/api/committees',          owner: 'agrc', moduleCode: 'foundation',   description: 'Committee management' },
  { path: '/api/user-lifecycle',      owner: 'agrc', moduleCode: 'foundation',   description: 'User lifecycle' },
  { path: '/api/regulators',          owner: 'agrc', moduleCode: 'foundation',   description: 'Regulator registry' },
  { path: '/api/documents',           owner: 'agrc', moduleCode: 'foundation',   description: 'Document management' },

  // -- Workflow & automation --
  { path: '/api/workflows',           owner: 'agrc', moduleCode: 'workflow',     description: 'Workflow engine' },
  { path: '/api/workflow-ext',        owner: 'agrc', moduleCode: 'workflow',     description: 'Workflow extended features' },
  { path: '/api/workflow-templates',  owner: 'agrc', moduleCode: 'workflow',     description: 'Workflow templates' },
  { path: '/api/automation',          owner: 'agrc', moduleCode: 'workflow',     description: 'Automation rules' },
  { path: '/api/auto-tasks',          owner: 'agrc', moduleCode: 'workflow',     description: 'Auto-generated tasks' },
  { path: '/api/approvals',           owner: 'agrc', moduleCode: 'workflow',     description: 'Approval routing' },
  { path: '/api/approval-requests',   owner: 'agrc', moduleCode: 'workflow',     description: 'Approval requests' },
  { path: '/api/roadmap',             owner: 'agrc', moduleCode: 'workflow',     description: 'Roadmap planner' },
  { path: '/api/roadmap-builder',     owner: 'agrc', moduleCode: 'workflow',     description: 'Roadmap builder' },
  { path: '/api/review-cycles',       owner: 'agrc', moduleCode: 'workflow',     description: 'Review cycle management' },
  { path: '/api/sod-check',           owner: 'agrc', moduleCode: 'workflow',     description: 'Segregation of duties check' },

  // -- Teams & collaboration --
  { path: '/api/teams',               owner: 'agrc', moduleCode: 'foundation',   description: 'Team management' },
  { path: '/api/member-lifecycle',    owner: 'agrc', moduleCode: 'foundation',   description: 'Team member lifecycle' },
  { path: '/api/unified-squad',       owner: 'agrc', moduleCode: 'foundation',   description: 'Unified squad management' },
  { path: '/api/cooperative-workflows', owner: 'agrc', moduleCode: 'workflow',   description: 'Cooperative workflows' },
  { path: '/api/agent-delegation',    owner: 'agrc', moduleCode: 'foundation',   description: 'Agent delegation' },
  { path: '/api/profiles',            owner: 'agrc', moduleCode: 'foundation',   description: 'User profiles and role matrix' },
  { path: '/api/profiles/roles',      owner: 'agrc', moduleCode: 'foundation',   description: 'Role profiles' },
  { path: '/api/roles',               owner: 'agrc', moduleCode: 'foundation',   description: 'Role detail' },

  // -- Communication & activity --
  { path: '/api/notifications',       owner: 'agrc', moduleCode: 'notification', description: 'Notifications' },
  { path: '/api/notification-center', owner: 'agrc', moduleCode: 'notification', description: 'Notification center' },
  { path: '/api/notification-preferences', owner: 'agrc', moduleCode: 'notification', description: 'Notification preferences' },
  { path: '/api/comments',            owner: 'agrc', moduleCode: 'notification', description: 'Comments' },
  { path: '/api/messaging',           owner: 'agrc', moduleCode: 'notification', description: 'Messaging' },
  { path: '/api/activity-feed',       owner: 'agrc', moduleCode: 'notification', description: 'Activity feed' },
  { path: '/api/timeline',            owner: 'agrc', moduleCode: 'notification', description: 'Activity timeline' },
  { path: '/api/next-actions',        owner: 'agrc', moduleCode: 'notification', description: 'Next actions' },

  // -- Task & process --
  { path: '/api/task-board',          owner: 'agrc', moduleCode: 'workflow',     description: 'Task board' },
  { path: '/api/process-tasks',       owner: 'agrc', moduleCode: 'workflow',     description: 'Process tasks' },
  { path: '/api/action-items',        owner: 'agrc', moduleCode: 'action',       description: 'Action items' },
  { path: '/api/remediation',         owner: 'agrc', moduleCode: 'remediation',  description: 'Remediation tracking' },
  { path: '/api/quick-accelerator',   owner: 'agrc', moduleCode: 'admin',    description: 'Quick GRC accelerator' },

  // -- Content & knowledge --
  { path: '/api/content',             owner: 'agrc', moduleCode: 'compliance',      description: 'Content library' },
  { path: '/api/content-packs',       owner: 'agrc', moduleCode: 'compliance',      description: 'Content packs' },
  { path: '/api/packs',               owner: 'agrc', moduleCode: 'compliance',      description: 'Pack management' },
  { path: '/api/knowledge',           owner: 'agrc', moduleCode: 'compliance',      description: 'Knowledge base' },
  { path: '/api/knowledge-hub',       owner: 'agrc', moduleCode: 'compliance',      description: 'Knowledge hub' },
  { path: '/api/training',            owner: 'agrc', moduleCode: 'training',     description: 'Training data' },
  { path: '/api/training-advanced',   owner: 'agrc', moduleCode: 'training',     description: 'Training advanced features' },
  { path: '/api/training-admin',      owner: 'agrc', moduleCode: 'training',     description: 'Training admin config and health' },

  // -- Integration & connectors --
  { path: '/api/integrations',        owner: 'agrc', moduleCode: 'integrations',  description: 'Integration management' },
  { path: '/api/connectors',          owner: 'agrc', moduleCode: 'integrations',  description: 'Connector management' },
  { path: '/api/connector-health',    owner: 'agrc', moduleCode: 'integrations',  description: 'Connector health' },
  { path: '/api/webhooks-outbound',   owner: 'agrc', moduleCode: 'integrations',  description: 'Outbound webhooks' },
  { path: '/api/email-inbox',         owner: 'agrc', moduleCode: 'integrations',  description: 'Email inbox integration' },

  // -- Tier-guarded features --
  { path: '/api/digital-twin',        owner: 'agrc', moduleCode: 'ai-governance',     description: 'Digital twin simulation' },
  { path: '/api/red-team',            owner: 'agrc', moduleCode: 'ai-governance',     description: 'Red team exercises' },
  { path: '/api/exception-governance', owner: 'agrc', moduleCode: 'compliance',  description: 'Exception governance' },
  { path: '/api/cadence',             owner: 'agrc', moduleCode: 'ai-governance',     description: 'Cadence management' },
  { path: '/api/qiyas',               owner: 'agrc', moduleCode: 'qiyas',       description: 'Qiyas maturity engine' },

  // -- UI & UX --
  { path: '/api/ui',                  owner: 'agrc', moduleCode: 'ui',           description: 'UI configuration' },
  { path: '/api/widgets',             owner: 'agrc', moduleCode: 'ui',           description: 'Widget data' },
  { path: '/api/playbook',            owner: 'agrc', moduleCode: 'ui',           description: 'Playbook builder' },
  { path: '/api/auto-crud',           owner: 'agrc', moduleCode: 'ui',           description: 'Auto-CRUD UI' },
  { path: '/api/command-palette',     owner: 'agrc', moduleCode: 'ui',           description: 'Command palette' },
  { path: '/api/inline-edit',         owner: 'agrc', moduleCode: 'ui',           description: 'Inline edit' },
  { path: '/api/journey',             owner: 'agrc', moduleCode: 'ui',           description: 'Guided journey' },
  { path: '/api/guidance',            owner: 'agrc', moduleCode: 'ui',           description: 'Contextual guidance' },
  { path: '/api/dashboard',           owner: 'agrc', moduleCode: 'ui',           description: 'Dashboard configuration' },
  { path: '/api/hitl',                owner: 'agrc', moduleCode: 'ui',           description: 'Human-in-the-loop UI' },
  { path: '/api/mobile',              owner: 'agrc', moduleCode: 'ui',           description: 'Mobile API' },
  { path: '/api/work-items',          owner: 'agrc', moduleCode: 'workflow',     description: 'Work items' },
  { path: '/api/runtime-overrides',   owner: 'agrc', moduleCode: 'admin',        description: 'Runtime overrides' },

  // -- Misc product routes --
  { path: '/api/module-lifecycle',    owner: 'agrc', moduleCode: 'foundation',   description: 'Module lifecycle' },
  { path: '/api/module-registry',     owner: 'agrc', moduleCode: 'foundation',   description: 'Module workflow registry' },
  { path: '/api/inference',           owner: 'agrc', moduleCode: 'ai',           description: 'AI inference endpoint' },
  { path: '/api/registry',            owner: 'agrc', moduleCode: 'foundation',   description: 'General registry' },
  { path: '/api/contract-tests',      owner: 'agrc', moduleCode: 'platform',     description: 'Contract test runner' },
  { path: '/api/entity-links',        owner: 'agrc', moduleCode: 'foundation',   description: 'Entity cross-links' },
  { path: '/api/search',              owner: 'agrc', moduleCode: 'ui',           description: 'Global search' },
  { path: '/api/field-rbac',          owner: 'agrc', moduleCode: 'foundation',   description: 'Field-level RBAC' },
  { path: '/api/bulk-import',         owner: 'agrc', moduleCode: 'foundation',   description: 'Bulk data import' },
  { path: '/api/assets',              owner: 'agrc', moduleCode: 'asset',        description: 'Asset management' },
  { path: '/api/vulnerabilities',     owner: 'agrc', moduleCode: 'asset',        description: 'Vulnerability management' },

  // -- Public product endpoints --
  { path: '/api/public/sample-reports', owner: 'agrc', moduleCode: 'public',     description: 'Public sample reports' },
  { path: '/api/public/explorer',     owner: 'agrc', moduleCode: 'public',       description: 'Public explorer' },
];

// ---------------------------------------------------------------------------
// Derived helper sets
// ---------------------------------------------------------------------------

/** All paths owned by the platform layer. */
export const PLATFORM_ROUTE_PATHS = AGRC_ROUTE_OWNERSHIP
  .filter(r => r.owner === 'platform')
  .map(r => r.path);

/** All paths owned by the AGRC product. */
export const PRODUCT_ROUTE_PATHS = AGRC_ROUTE_OWNERSHIP
  .filter(r => r.owner === 'agrc')
  .map(r => r.path);

/** Unique module codes used by AGRC product routes. */
export const AGRC_MODULE_CODES = [
  ...new Set(
    AGRC_ROUTE_OWNERSHIP
      .filter(r => r.owner === 'agrc')
      .map(r => r.moduleCode)
  ),
];

/** Look up ownership for a given path. Returns undefined if not cataloged. */
export function getRouteOwnership(path: string): RouteOwnership | undefined {
  return AGRC_ROUTE_OWNERSHIP.find(r => r.path === path);
}
