// ============================================
// Shahin — AGRC Service Ownership Manifest
// Declares product ownership of services per
// Law 2 (Product Separation). Platform services
// are shared infrastructure; AGRC services are
// product-specific GRC domain logic.
// ============================================

/**
 * Declares which product or platform layer owns a given service.
 * Used for governance audits, dependency analysis, and future
 * multi-product service isolation.
 */
export interface ServiceOwnership {
  /** Service file name (without path prefix) */
  serviceName: string;
  /** 'platform' = shared infrastructure, 'agrc' = Shahin AGRC product */
  owner: 'platform' | 'agrc';
  /** Logical module within the owner boundary */
  moduleCode: string;
}

// ---------------------------------------------------------------------------
// Service Ownership Catalog
// ---------------------------------------------------------------------------
// Sources:
//   - backend/src/modules/platform/services/  (platform layer)
//   - backend/src/services/                    (shim re-exports + legacy)
//   - backend/src/modules/*/services/          (module-specific)
// ---------------------------------------------------------------------------

export const AGRC_SERVICE_MANIFEST: ServiceOwnership[] = [

  // ========================================================================
  // Platform services — shared infrastructure
  // ========================================================================

  // -- Core infrastructure --
  { serviceName: 'cache.service',                     owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'cache-invalidation.service',        owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'email.service',                     owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'email-oauth.service',               owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'email-inbox.service',               owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'email-verification.service',        owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'websocket.service',                 owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'event-bus.service',                 owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'event-bus',             owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'logger.service',                    owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'structured-logger.service',         owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'prometheus.service',                owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'metrics-collector.service',         owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'memory-monitor.service',            owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'file-storage.service',              owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'secrets.service',                   owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'credential-encryption.service',     owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'token-blacklist.service',           owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'pii-redaction.service',             owner: 'platform', moduleCode: 'platform' },

  // -- Subscription & billing --
  { serviceName: 'subscription.service',              owner: 'platform', moduleCode: 'billing' },
  { serviceName: 'subscription-lifecycle.service',    owner: 'platform', moduleCode: 'billing' },
  { serviceName: 'payment.service',                   owner: 'platform', moduleCode: 'billing' },

  // -- AI / LLM infrastructure --
  { serviceName: 'llm.service',                       owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'llm-router.service',                owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'llm-retry-strategy.service',        owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'prompt-registry.service',           owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'memory-store.service',              owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'tool-registry.service',             owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'model-registry.service',            owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'per-agent-circuit-breaker.service', owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'ai-circuit-breaker.service',        owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'ai-cost-tracker.service',           owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'cost-attribution.service',          owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'enhanced-budget-enforcement.service', owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'ai-gateway.service',                owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'copilot.service',                   owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'contextual-ai.service',             owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'bilingual-prompt.service',          owner: 'platform', moduleCode: 'ai-platform' },
  { serviceName: 'bilingual.service',                 owner: 'platform', moduleCode: 'ai-platform' },

  // -- Workflow engine (shared infrastructure) --
  { serviceName: 'workflow-engine.service',           owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'workflow-queue.service',            owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'workflow-chain-executor.service',   owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'workflow-event-emitter.service',    owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'workflow-serialization.service',    owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'workflow-stall-recovery.service',   owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'approval-routing.service',          owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'approval-engine.service',           owner: 'platform', moduleCode: 'workflow' },
  { serviceName: 'approval-prescreen.service',        owner: 'platform', moduleCode: 'workflow' },

  // -- Module system --
  { serviceName: 'module-composition.service',        owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-kickstart.service',          owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-lifecycle.service',          owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-lifecycle-state-machine.service', owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-service-proxy.service',      owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-service-registry.service',   owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-workflow-registry.service',  owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-dependency-tracker.service', owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-security-resolver.service',  owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-security-seed.service',      owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-security-seeder.service',    owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'module-role-registry.service',      owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'smart-module-activation.service',   owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'platform-mode-gate.service',        owner: 'platform', moduleCode: 'module-system' },
  { serviceName: 'capability-gating.service',         owner: 'platform', moduleCode: 'module-system' },

  // -- Entity & data infrastructure --
  { serviceName: 'entity-link.service',               owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'entity-link-integrity.service',     owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'entity-cache.service',              owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'entity-resolver.service',           owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'entity-routing-registry.ts',        owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'global-search.service',             owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'base-crud.service',                 owner: 'platform', moduleCode: 'entity' },
  { serviceName: 'auto-crud.service',                 owner: 'platform', moduleCode: 'entity' },

  // -- Activity & communication infrastructure --
  { serviceName: 'activity-feed.service',             owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'activity-stream.service',           owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'comment.service',                   owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'messaging.service',                 owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'notification.service',              owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'smart-reminder.service',            owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'nudge-engine.service',              owner: 'platform', moduleCode: 'notification' },
  { serviceName: 'nudge-negotiation.service',         owner: 'platform', moduleCode: 'notification' },

  // -- Tenant infrastructure --
  { serviceName: 'tenant-config.service',             owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'tenant-branding.service',           owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'tenant-email-config.service',       owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'tenant-baseline.service',           owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'tenant-schema-sync.service',        owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'platform-db-config.service',        owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'migration-runner.service',          owner: 'platform', moduleCode: 'tenant' },
  { serviceName: 'migration-reconciliation.service',  owner: 'platform', moduleCode: 'tenant' },

  // -- Provisioning & onboarding --
  { serviceName: 'provisioning.service',              owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'onboarding-config.service',         owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'onboarding-complete.runner.ts',     owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'workspace-bootstrap.service',       owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'workspace-seed.service',            owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'workspace-profile.service',         owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'seed-tracker.service',              owner: 'platform', moduleCode: 'provisioning' },
  { serviceName: 'pack-resolver.service',             owner: 'platform', moduleCode: 'provisioning' },

  // -- Jobs & scheduling --
  { serviceName: 'job-scheduler.service',             owner: 'platform', moduleCode: 'jobs' },

  // -- Auth & RBAC --
  { serviceName: 'auth-enhanced.service',             owner: 'platform', moduleCode: 'auth' },
  { serviceName: 'authorization-matrix.service',      owner: 'platform', moduleCode: 'auth' },
  { serviceName: 'authorization-matrix-v2.service',   owner: 'platform', moduleCode: 'auth' },
  { serviceName: 'invitation.service',                owner: 'platform', moduleCode: 'auth' },

  // -- Webhook & telemetry --
  { serviceName: 'webhook.service',                   owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'webhook-outbound.service',          owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'telemetry-webhook.service',         owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'telemetry-aggregator.service',      owner: 'platform', moduleCode: 'platform' },

  // -- UX infrastructure --
  { serviceName: 'template-engine.service',           owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'inline-edit.service',               owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'inline-editor.service',             owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'command-palette.service',           owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'landing-content.service',           owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'quote.service',                     owner: 'platform', moduleCode: 'platform' },

  // -- Observability & error handling --
  { serviceName: 'error-recovery.service',            owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'error-tracker.service',             owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'monitoring.service',                owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'shadow-validation.service',         owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'contract-tests.service',            owner: 'platform', moduleCode: 'platform' },

  // -- Platform content --
  { serviceName: 'content-pack.service',              owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'content-provider.service',          owner: 'platform', moduleCode: 'platform' },

  // -- Lifecycle & registry --
  { serviceName: 'lifecycle.service',                 owner: 'platform', moduleCode: 'platform' },
  { serviceName: 'registry.service',                  owner: 'platform', moduleCode: 'platform' },

  // ========================================================================
  // AGRC product services — GRC domain logic
  // ========================================================================

  // -- Risk --
  { serviceName: 'risk.service',                      owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-scoring.service',              owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-metrics.service',              owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-workspace.service',            owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-heatmap.service',              owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-trend-analyzer.service',       owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-pair-review.service',          owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'risk-quantification.service',       owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'auto-risk-scoring.service',         owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'kri-tracking.service',              owner: 'agrc', moduleCode: 'risk' },
  { serviceName: 'metric-anomaly-detector.service',   owner: 'agrc', moduleCode: 'risk' },

  // -- Compliance --
  { serviceName: 'compliance.service',                owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-workspace.service',      owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-cache.service',          owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-settings.service',       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-drift-engine.service',   owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-observability.service',  owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-benchmark.service',      owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-as-code.service',        owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-attestation.service',    owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'compliance-heatmap.service',        owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'control-process-cycle.service',     owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'control-dependency-graph.service',  owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'control-lifecycle.service',         owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'ucf.service',                       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'framework-version-lifecycle.service', owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'framework-harmonization.service',   owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'exception.service',                 owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'scoring-policy.service',            owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'consent-lifecycle.service',         owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'pdpl-consent.service',              owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'privacy.service',                   owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'privacy-budget.service',            owner: 'agrc', moduleCode: 'compliance' },

  // -- Governance --
  { serviceName: 'governance.service',                owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'governance-health.service',         owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'governance-hooks.service',          owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'governance-executive-summaries.service', owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'obligation.service',                owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'committee-management.service',      owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'sod-conflict-detector.service',     owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'sod-check.service',                 owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'grc-lifecycle-gaps.service',        owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'grc-integrity-guard.service',       owner: 'agrc', moduleCode: 'governance' },
  { serviceName: 'grc-knowledge-graph.service',       owner: 'agrc', moduleCode: 'governance' },

  // -- Audit --
  { serviceName: 'audit.service',                     owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-trail.service',               owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-package.service',             owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-package-exporter.service',    owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-anomaly-detector.service',    owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-capa-effectiveness.service',  owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-committee-reporting.service', owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-cross-module.service',        owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-evidence-versions.service',   owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-external-coordination.service', owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-finding-slas.service',        owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-finding-trends.service',      owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-prep.service',                owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-qa-reviews.service',          owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-ratings.service',             owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-regulatory-tracking.service', owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-reminders.service',           owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-repeat-findings.service',     owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-risk-scoring.service',        owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-schedules.service',           owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-team.service',                owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-templates.service',           owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-test-plans.service',          owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-time-tracking.service',       owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-trail-retention.service',     owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-universe.service',            owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'audit-working-papers.service',      owner: 'agrc', moduleCode: 'audit' },

  // -- Evidence --
  { serviceName: 'evidence.service',                  owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-catalog.service',          owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-lifecycle.service',        owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-relay.service',            owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-request-generator.service', owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-scoring.service',          owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-quality-scoring.service',  owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-reuse.service',            owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-auto-collection.service',  owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-bundle-generator.service', owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'evidence-multimodal-analysis.service', owner: 'agrc', moduleCode: 'evidence' },
  { serviceName: 'connector-evidence-mapper.service', owner: 'agrc', moduleCode: 'evidence' },

  // -- Policy --
  { serviceName: 'policy-lifecycle.service',          owner: 'agrc', moduleCode: 'policy' },
  { serviceName: 'policy-attestation.service',        owner: 'agrc', moduleCode: 'policy' },
  { serviceName: 'policy-code.service',               owner: 'agrc', moduleCode: 'policy' },
  { serviceName: 'policy-impact-simulator.service',   owner: 'agrc', moduleCode: 'policy' },
  { serviceName: 'policy-template.service',           owner: 'agrc', moduleCode: 'policy' },
  { serviceName: 'sop-library.service',               owner: 'agrc', moduleCode: 'policy' },

  // -- Incident & BCP --
  { serviceName: 'incident.service',                  owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'incident-advanced.service',         owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'incident-followup.service',         owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'incident-playbook-templates.service', owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'incident-sla-config.service',       owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'incident-war-room.service',         owner: 'agrc', moduleCode: 'incident' },
  { serviceName: 'bcp.service',                       owner: 'agrc', moduleCode: 'bcp' },
  { serviceName: 'bcm-advanced.service',              owner: 'agrc', moduleCode: 'bcp' },

  // -- Vendor --
  { serviceName: 'vendor.service',                    owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-advanced.service',           owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-enhancements.service',       owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-compliance-sync.service',    owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-cross-agent.service',        owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-cyber-rating.service',       owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-portal.service',             owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-risk-ext.service',           owner: 'agrc', moduleCode: 'vendor' },
  { serviceName: 'vendor-scoring.service',            owner: 'agrc', moduleCode: 'vendor' },

  // -- Training --
  { serviceName: 'training-advanced.service',         owner: 'agrc', moduleCode: 'training' },
  { serviceName: 'training-data.service',             owner: 'agrc', moduleCode: 'training' },
  { serviceName: 'training-hooks.service',            owner: 'agrc', moduleCode: 'training' },

  // -- Reporting & analytics --
  { serviceName: 'report.service',                    owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-generator.service',          owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-ext.service',                owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-hub.service',                owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-renderer.service',           owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-drilldown.service',          owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-sharing.service',            owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'report-stream.service',             owner: 'agrc', moduleCode: 'reporting' },
  { serviceName: 'analytics.service',                 owner: 'agrc', moduleCode: 'analytics' },
  { serviceName: 'predictive-analytics.service',      owner: 'agrc', moduleCode: 'analytics' },
  { serviceName: 'workpaper-generator.service',       owner: 'agrc', moduleCode: 'reporting' },

  // -- Regulatory --
  { serviceName: 'regulatory-resolution.service',     owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-delta.service',          owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-content.service',        owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-alert.service',          owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-calendar.service',       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-change-propagation.service', owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulatory-submission-generator.service', owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'regulation-compiler.service',       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'nca-assessment.service',            owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'nca-export.service',                owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'sama-assessment.service',           owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'csa.service',                       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'ccm-cloud-monitor.service',         owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'ccm-worker.service',                owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'ksa-hub.service',                   owner: 'agrc', moduleCode: 'compliance' },

  // -- Assessment --
  { serviceName: 'assessment.service',                owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'assessment-ai-guide.service',       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'assessment-template.service',       owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'maturity.service',                  owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'maturity-tracker.service',          owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'maturity-dashboard.service',        owner: 'agrc', moduleCode: 'compliance' },
  { serviceName: 'score-calibration.service',         owner: 'agrc', moduleCode: 'compliance' },

  // -- Connector --
  { serviceName: 'connector.service',                 owner: 'agrc', moduleCode: 'integrations' },
  { serviceName: 'connector-sync.service',            owner: 'agrc', moduleCode: 'integrations' },
  { serviceName: 'slack-connector.service',           owner: 'agrc', moduleCode: 'integrations' },

  // -- Workspace (AGRC-specific) --
  { serviceName: 'workspace.service',                 owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'workspace-ignite.service',          owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'workspace-lifecycle.service',       owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'tenant-home.service',               owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'ninety-day-plan.service',           owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'quick-grc-accelerator.service',     owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'guided-experience.service',         owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'guided-journey-engine.service',     owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'operating-cockpit.service',         owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'dashboard-zones.service',           owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'widget-data.service',               owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'widget-insights.service',           owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'widget-permission.service',         owner: 'agrc', moduleCode: 'admin' },

  // -- AI (GRC-domain AI services) --
  { serviceName: 'ai-agent-performance.service',      owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-agent-runtime.service',          owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-agent.service',                  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-alert.service',                  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-analytics.service',              owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-asset-discovery.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-asset-inventory.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-binding-governance.service',     owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-cockpit.service',                owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-cockpit-signal.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-compliance-framework.service',   owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-control-mapping.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-decision-engine.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-dpia.service',                   owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-event-trigger.service',          owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-explainability.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-governance-bootstrap.service',   owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-governance-config.service',      owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-governance-lifecycle.service',   owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-governance-ops.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-model-risk.service',             owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-observation.service',            owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-onboarding.engine',              owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-org-validation.engine',          owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-os-orchestrator.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-policy-rule.service',            owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-recommendation-engine.service',  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-remediation.service',            owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-squad.service',                  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-task-routing.service',           owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'ai-workflow-trigger.service',       owner: 'agrc', moduleCode: 'ai' },

  // -- Agent system (AGRC-domain) --
  { serviceName: 'agent-cooperation.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-coordination.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-cycle-memory.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-delegation.service',          owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-eval.service',                owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-governance-bridge.service',   owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-health-monitor.service',      owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-metrics-aggregator.service',  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-onboarding-executor.service', owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-orchestration.service',       owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-output-validator.service',    owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-registry.service',            owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-runner.service',              owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-self-improve.service',        owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-squad-manager.service',       owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-standup.service',             owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-to-agent-delegation.service', owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-tool-executor.service',       owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-tools-registry.service',      owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agent-ab-testing.service',          owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'shared-agent-memory.service',       owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'unified-squad-registry.service',    owner: 'agrc', moduleCode: 'ai' },

  // -- AGRC-OS engine (product services in platform directory) --
  { serviceName: 'agrc-metrics.service',              owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-notification-bridge.service',  owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-os-dashboard.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-os-integration.service',       owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-os-orchestrator.service',      owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-os-reporting.service',         owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-os-ui.service',                owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'agrc-runbook.service',              owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'autonomous-grc-engine.service',     owner: 'agrc', moduleCode: 'ai' },

  // -- Orchestration & process --
  { serviceName: 'process-orchestration.service',     owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'action-executor.service',           owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'action-item.service',               owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'proposed-action.service',           owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'resource-allocator.service',        owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workload-balancer.service',         owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'concurrency-optimizer.service',     owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'conflict-resolver.service',         owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'escalation.service',                owner: 'agrc', moduleCode: 'workflow' },

  // -- Workflow (AGRC-domain) --
  { serviceName: 'workflow.service',                  owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-automation.service',        owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-ext.service',              owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-templates.service',        owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-categories.service',       owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-comparison.service',       owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-mermaid.service',          owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-retention.service',        owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-versioning.service',       owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'workflow-acl.service',              owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'autonomous-workflow.service',       owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'auto-task.service',                 owner: 'agrc', moduleCode: 'workflow' },

  // -- Team & foundation --
  { serviceName: 'team.service',                      owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'team-builder.service',              owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'team-member-lifecycle.service',     owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'team-raci.service',                 owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'organizational-hierarchy.service',  owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'organizational-hierarchy-extended.service', owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'org-structure-activation.service',  owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'document-management.service',       owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'role-detail.service',               owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'role-profile.service',              owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'role-lifecycle.service',            owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'role-experience.service',           owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'role-profile-allocation.service',   owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'user-lifecycle.service',            owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'user-preference.service',           owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'access-review-automation.service',  owner: 'agrc', moduleCode: 'foundation' },

  // -- Remediation --
  { serviceName: 'remediation.service',               owner: 'agrc', moduleCode: 'remediation' },

  // -- Misc AGRC --
  { serviceName: 'digital-twin.service',              owner: 'agrc', moduleCode: 'advanced' },
  { serviceName: 'playbook.service',                  owner: 'agrc', moduleCode: 'advanced' },
  { serviceName: 'signal-inference.engine',           owner: 'agrc', moduleCode: 'advanced' },
  { serviceName: 'foundation-health.service',         owner: 'agrc', moduleCode: 'foundation' },
  { serviceName: 'insider-threat-detection.service',  owner: 'agrc', moduleCode: 'security' },
  { serviceName: 'security-config.service',           owner: 'agrc', moduleCode: 'security' },
  { serviceName: 'roadmap.service',                   owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'roadmap-builder.service',           owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'akb.service',                       owner: 'agrc', moduleCode: 'audit' },
  { serviceName: 'context-reader.service',            owner: 'agrc', moduleCode: 'ai' },
  { serviceName: 'admin.service',                     owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'tier.service',                      owner: 'agrc', moduleCode: 'admin' },
  { serviceName: 'task-board.service',                owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'task-auto-resolution.service',      owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'task-triage.service',               owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'task-complexity-registry.ts',       owner: 'agrc', moduleCode: 'workflow' },
  { serviceName: 'benchmark-aggregator.service',      owner: 'agrc', moduleCode: 'analytics' },
];

// ---------------------------------------------------------------------------
// Derived helper sets
// ---------------------------------------------------------------------------

/** All service names owned by the platform layer. */
export const PLATFORM_SERVICE_NAMES = AGRC_SERVICE_MANIFEST
  .filter(s => s.owner === 'platform')
  .map(s => s.serviceName);

/** All service names owned by the AGRC product. */
export const PRODUCT_SERVICE_NAMES = AGRC_SERVICE_MANIFEST
  .filter(s => s.owner === 'agrc')
  .map(s => s.serviceName);

/** Unique module codes used by AGRC product services. */
export const AGRC_SERVICE_MODULE_CODES = [
  ...new Set(
    AGRC_SERVICE_MANIFEST
      .filter(s => s.owner === 'agrc')
      .map(s => s.moduleCode)
  ),
];

/** Look up ownership for a given service name. Returns undefined if not cataloged. */
export function getServiceOwnership(serviceName: string): ServiceOwnership | undefined {
  return AGRC_SERVICE_MANIFEST.find(s => s.serviceName === serviceName);
}
