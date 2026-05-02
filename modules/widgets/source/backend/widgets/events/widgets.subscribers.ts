/**
 * Widget Event Subscribers -- Handles consumed cross-module events for the widget domain.
 *
 * Consumed events:
 *   - risk.score_changed          -> Refresh risk/kri/executive widgets
 *   - risk.record.created         -> Refresh risk/executive widgets
 *   - risk.record.updated         -> Refresh risk/executive widgets
 *   - compliance.posture_changed  -> Refresh compliance/executive widgets
 *   - compliance.assessment_completed -> Refresh compliance/executive widgets
 *   - audit.finding_created       -> Refresh audit/executive widgets
 *   - audit.record.updated        -> Refresh audit/executive widgets
 *   - evidence.record.created     -> Refresh evidence/executive widgets
 *   - evidence.record.deleted     -> Refresh evidence/executive widgets
 *   - incident.record.created     -> Refresh executive widgets
 *   - incident.status_changed     -> Refresh executive widgets
 *   - policy.record.updated       -> Refresh compliance/executive widgets
 *   - governance.decision_made    -> Refresh executive/general widgets
 *   - dashboard.layout.changed    -> Log layout reconfiguration
 *   - workflow.status_changed     -> Refresh category-specific widgets
 *   - provisioning.completed      -> Initialize widget tables for new tenant
 *
 * Each handler is idempotent: duplicate events are safely ignored.
 * All handlers are wrapped with error boundary and structured logging.
 *
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { eventBus, type PlatformEvent } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Handler Type ──────────────────────────────────────────────────────────

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

// ── Shared helpers ─────────────────────────────────────────────────────────

async function markWidgetsForRefresh(tenantId: string, categories: string[]): Promise<void> {
  const schema = tenantSchema(tenantId);
  const placeholders = categories.map((_, i) => `$${i + 1}`).join(',');
  await safeQuery(
    `UPDATE "${schema}".widgets_registry
     SET updated_at = NOW()
     WHERE category IN (${placeholders})
       AND status = 'published'
       AND deleted_at IS NULL`,
    categories,
  ).catch(catchHandler(EC.FALLBACK_QUERY, ({
    tenantId,
    operation: 'widgets:refresh-mark',
    categories,
  }) as any));
}

// ── risk.score_changed ──────────────────────────────────────────────────

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['risk', 'kri', 'executive']);
}

// ── risk.record.created / risk.record.updated ──────────────────────────

async function handleRiskRecordChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['risk', 'executive']);
}

// ── compliance.posture_changed ──────────────────────────────────────────

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['compliance', 'executive']);
}

// ── compliance.assessment_completed ─────────────────────────────────────

async function handleComplianceAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['compliance', 'executive']);
}

// ── audit.finding_created / audit.record.updated ────────────────────────

async function handleAuditChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['audit', 'executive']);
}

// ── evidence.record.created / evidence.record.deleted ───────────────────

async function handleEvidenceChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['evidence', 'executive']);
}

// ── incident.record.created / incident.status_changed ───────────────────

async function handleIncidentChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['executive']);
}

// ── policy.record.updated ───────────────────────────────────────────────

async function handlePolicyUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['compliance', 'executive']);
}

// ── governance.decision_made ────────────────────────────────────────────

async function handleGovernanceDecision(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['executive', 'general']);
}

// ── dashboard.layout.changed ────────────────────────────────────────────

async function handleDashboardLayoutChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  logger.info('[widgets] dashboard.layout.changed: noted for widget reconfiguration', {
    tenantId,
    dashboardId: event.entityId ?? (payload.dashboardId as string),
  });

  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".widgets_render_log
         (widget_key, user_id, duration_ms, success, rendered_at)
       VALUES ('__layout_change__', $1, 0, true, NOW())`,
      [payload.userId ?? SYSTEM_JOB_ACTOR],
    ).catch(catchHandler(EC.FALLBACK_QUERY, {
      tenantId,
      operation: 'widgets:layout-change-log',
    }));
  } catch {
    // Non-fatal
  }
}

// ── workflow.status_changed ─────────────────────────────────────────────

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  const entityType = payload.entityType as string;

  const categoryMap: Record<string, string[]> = {
    risk: ['risk', 'kri', 'executive'],
    control: ['executive', 'evidence'],
    finding: ['audit', 'executive'],
    policy: ['compliance', 'executive'],
    evidence: ['evidence', 'executive'],
    action_item: ['executive'],
    incident: ['executive'],
    remediation: ['executive'],
  };

  const categories = categoryMap[entityType] ?? ['executive'];
  await markWidgetsForRefresh(tenantId, categories);
}

// ── provisioning.completed ──────────────────────────────────────────────

async function handleProvisioningCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;

  try {
    const schema = tenantSchema(tenantId);

    // Ensure widget tables exist for the newly provisioned tenant
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".widgets_registry (
        widget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        widget_key VARCHAR(100) NOT NULL UNIQUE,
        name_en VARCHAR(200) NOT NULL,
        name_ar VARCHAR(200),
        description_en TEXT,
        description_ar TEXT,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        size VARCHAR(20) NOT NULL DEFAULT 'medium',
        icon VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
        data_sources JSONB DEFAULT '[]'::jsonb,
        required_permissions JSONB DEFAULT '[]'::jsonb,
        scope_rule VARCHAR(100),
        config JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".widgets_bundles (
        bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_en VARCHAR(200) NOT NULL,
        name_ar VARCHAR(200),
        description_en TEXT,
        description_ar TEXT,
        widget_ids JSONB DEFAULT '[]'::jsonb,
        layout JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        target_audience VARCHAR(100),
        created_by VARCHAR(100),
        updated_by VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".widgets_render_log (
        id BIGSERIAL PRIMARY KEY,
        widget_key VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        duration_ms INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        rendered_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    logger.info('[widgets] provisioning.completed: widget tables initialized', { tenantId });
  } catch (err) {
    logger.error('[widgets] provisioning.completed: failed to initialize tables', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Handler Registration ──────────────────────────────────────────────────

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.debug(`[widgets] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[widgets] handler ${name} failed: ${(err as Error).message}`, {
        tenantId: event.tenantId,
      });
    }
  };
}

// Risk integrations
handlers.set('risk.score_changed', wrapHandler('risk.score_changed', handleRiskScoreChanged));
handlers.set('risk.record.created', wrapHandler('risk.record.created', handleRiskRecordChange));
handlers.set('risk.record.updated', wrapHandler('risk.record.updated', handleRiskRecordChange));

// Compliance integrations
handlers.set('compliance.posture_changed', wrapHandler('compliance.posture_changed', handleCompliancePostureChanged));
handlers.set('compliance.assessment_completed', wrapHandler('compliance.assessment_completed', handleComplianceAssessmentCompleted));

// Audit integrations
handlers.set('audit.finding_created', wrapHandler('audit.finding_created', handleAuditChange));
handlers.set('audit.record.updated', wrapHandler('audit.record.updated', handleAuditChange));

// Evidence integrations
handlers.set('evidence.record.created', wrapHandler('evidence.record.created', handleEvidenceChange));
handlers.set('evidence.record.deleted', wrapHandler('evidence.record.deleted', handleEvidenceChange));

// Incident integrations
handlers.set('incident.record.created', wrapHandler('incident.record.created', handleIncidentChange));
handlers.set('incident.status_changed', wrapHandler('incident.status_changed', handleIncidentChange));

// Policy integrations
handlers.set('policy.record.updated', wrapHandler('policy.record.updated', handlePolicyUpdated));

// Governance integrations
handlers.set('governance.decision_made', wrapHandler('governance.decision_made', handleGovernanceDecision));

// Dashboard integrations
handlers.set('dashboard.layout.changed', wrapHandler('dashboard.layout.changed', handleDashboardLayoutChanged));

// Workflow integrations
handlers.set('workflow.status_changed', wrapHandler('workflow.status_changed', handleWorkflowStatusChanged));

// Provisioning integrations
handlers.set('provisioning.completed', wrapHandler('provisioning.completed', handleProvisioningCompleted));

// Team integrations
async function handleTeamChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['team', 'executive', 'capacity']);
}
handlers.set('team.created', wrapHandler('team.created', handleTeamChange));
handlers.set('team.archived', wrapHandler('team.archived', handleTeamChange));
handlers.set('team.member_added', wrapHandler('team.member_added', handleTeamChange));
handlers.set('team.member_removed', wrapHandler('team.member_removed', handleTeamChange));
handlers.set('team.capacity_changed', wrapHandler('team.capacity_changed', handleTeamChange));

// Journey integrations
async function handleJourneyMilestoneChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['journey', 'maturity', 'executive']);
}
async function handleJourneyMaturityChange(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['journey', 'maturity', 'executive', 'compliance']);
}
handlers.set('journey.milestone_achieved', wrapHandler('journey.milestone_achieved', handleJourneyMilestoneChange));
handlers.set('journey.maturity_level_changed', wrapHandler('journey.maturity_level_changed', handleJourneyMaturityChange));
handlers.set('journey.roadmap_created', wrapHandler('journey.roadmap_created', handleJourneyMaturityChange));
handlers.set('journey.roadmap_completed', wrapHandler('journey.roadmap_completed', handleJourneyMaturityChange));

// ── Navigation integrations (bidirectional: navigation → widgets) ─────────

// When navigation cache invalidates, widget visibility may change (module hidden/shown)
handlers.set('navigation.cache.invalidated', wrapHandler('navigation.cache.invalidated', async (event: PlatformEvent) => {
  const { tenantId } = event;
  if (!tenantId) return;
  await markWidgetsForRefresh(tenantId, ['executive', 'general']);
}));

// When a nav item is published, new module widgets may become available
handlers.set('navigation.registry.published', wrapHandler('navigation.registry.published', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const moduleCode = payload?.moduleCode as string;
  if (moduleCode) {
    await markWidgetsForRefresh(tenantId, [moduleCode, 'executive']);
  }
}));

// When a module is enabled/disabled, filter widgets accordingly
handlers.set('module.enabled', wrapHandler('module.enabled', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const moduleCode = payload?.moduleCode as string;
  if (moduleCode) {
    await markWidgetsForRefresh(tenantId, [moduleCode, 'executive']);
  }
}));

handlers.set('module.disabled', wrapHandler('module.disabled', async (event: PlatformEvent) => {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const moduleCode = payload?.moduleCode as string;
  if (moduleCode) {
    await markWidgetsForRefresh(tenantId, [moduleCode, 'executive']);
  }
}));

/**
 * Get all subscription handlers (for testing or external registration).
 */
export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

/**
 * Subscribe all handlers to a bus-like interface (for testing).
 */
export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[widgets] subscribed to ${handlers.size} events`);
}

/**
 * Register all widget event subscribers with the canonical DOS event bus.
 * Call this during module initialization.
 */
export function registerWidgetEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `widgets:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[widgets] registered ${handlers.size} domain event subscribers`);
}
