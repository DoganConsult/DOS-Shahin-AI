/**
 * DORA Event Service — Typed event emitters for all DORA domain events.
 *
 * MP-25 §11.1: Required logs for obligation changes, review decisions, AI usage.
 * All mutations in the DORA module emit events through this service.
 *
 * Events are published through the DOS event backbone (eventBus).
 * Uses resilient-catch patterns to prevent event emission failures
 * from breaking primary business operations.
 *
 * @owner dora
 * @module dora
 */

import { eventBus } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { safeQuery } from "@dos/db";

// ── Event Type Constants ───────────────────────────────────────────────

/** All DORA published event types for type-safe event emission */
export const DORA_EVENTS = {
  // ICT Assets
  ICT_ASSET_CREATED: 'dora.ict_asset_created',
  ICT_ASSET_UPDATED: 'dora.ict_asset_updated',
  ICT_ASSET_DELETED: 'dora.ict_asset_deleted',
  ICT_ASSET_DECOMMISSIONED: 'dora.ict_asset_decommissioned',

  // Resilience Tests
  RESILIENCE_TEST_CREATED: 'dora.resilience_test_created',
  RESILIENCE_TEST_COMPLETED: 'dora.resilience_test_completed',
  RESILIENCE_TEST_FAILED: 'dora.resilience_test_failed',
  RESILIENCE_TEST_OVERDUE: 'dora.resilience_test_overdue',
  RESILIENCE_FINDING_CREATED: 'dora.resilience_finding_created',

  // Major Incidents
  MAJOR_INCIDENT_CREATED: 'dora.major_incident_created',
  MAJOR_INCIDENT_REPORTED: 'dora.major_incident_reported',
  MAJOR_INCIDENT_RESOLVED: 'dora.major_incident_resolved',

  // Threat Intelligence
  THREAT_INTEL_CREATED: 'dora.threat_intel_created',
  THREAT_INTEL_RECEIVED: 'dora.threat_intel_received',
  THREAT_INTEL_ACKNOWLEDGED: 'dora.threat_intel_acknowledged',

  // Third-Party Providers
  THIRD_PARTY_PROVIDER_CREATED: 'dora.third_party_provider_created',
  THIRD_PARTY_PROVIDER_DELETED: 'dora.third_party_provider_deleted',
  THIRD_PARTY_FLAGGED: 'dora.third_party_flagged',
  THIRD_PARTY_REVIEWED: 'dora.third_party_reviewed',

  // Backup
  BACKUP_CONFIG_CREATED: 'dora.backup_config_created',
  BACKUP_VERIFIED: 'dora.backup_verified',
  BACKUP_FAILED: 'dora.backup_failed',

  // Obligations
  OBLIGATION_CREATED: 'dora.obligation_created',
  OBLIGATION_UPDATED: 'dora.obligation_updated',
  OBLIGATION_DELETED: 'dora.obligation_deleted',
  OBLIGATION_OVERDUE: 'dora.obligation_overdue',
  OBLIGATION_MAPPING_CREATED: 'dora.obligation_mapping_created',

  // Mappings
  FRAMEWORK_MAPPING_CREATED: 'dora.framework_mapping_created',
  CONTROL_MAPPING_CREATED: 'dora.control_mapping_created',

  // Recovery
  RECOVERY_PLAN_ACTIVATED: 'dora.recovery_plan_activated',
  RECOVERY_PLAN_TESTED: 'dora.recovery_plan_tested',

  // Risk
  ICT_RISK_ASSESSED: 'dora.ict_risk_assessed',
  CONCENTRATION_RISK_DETECTED: 'dora.concentration_risk_detected',

  // Status changes (generic)
  STATUS_CHANGED: 'dora.status_changed',

  // AI analysis
  AI_ANALYSIS_COMPLETED: 'dora.ai_analysis_completed',
} as const;

export type DoraEventType = typeof DORA_EVENTS[keyof typeof DORA_EVENTS];

// ── Core Event Emission ────────────────────────────────────────────────

/**
 * Emit a typed DORA domain event through the DOS event backbone.
 * Uses resilient-catch to prevent event failures from breaking callers.
 *
 * @param tenantId - Tenant context
 * @param eventType - Event type from DORA_EVENTS
 * @param entityType - The entity type (e.g., 'ict_asset', 'obligation')
 * @param entityId - The entity identifier
 * @param payload - Additional event-specific data
 * @param severity - Event severity level
 */
export async function emitDoraEvent(
  tenantId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown> = {},
  severity: 'info' | 'warning' | 'critical' = 'info',
): Promise<void> {
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: eventType as string,
      tenantId,
      sourceService: 'dora',
      entityType,
      entityId,
      severity,
      payload,
    } as any)), { tenantId, operation: `eventBus:${eventType}` });
}

/**
 * Emit a DORA status change event with old/new state metadata.
 * Used by all status transitions across DORA entity types.
 *
 * @param tenantId - Tenant context
 * @param entityType - The entity type experiencing the state change
 * @param entityId - The entity identifier
 * @param oldStatus - Previous state
 * @param newStatus - New state after transition
 */
export async function emitDoraStatusChange(
  tenantId: string,
  entityType: string,
  entityId: string,
  oldStatus: string,
  newStatus: string,
): Promise<void> {
  await emitDoraEvent(tenantId, DORA_EVENTS.STATUS_CHANGED, entityType, entityId, {
    oldState: oldStatus,
    newState: newStatus,
    transitionedAt: new Date().toISOString(),
  });
}

// ── Typed Convenience Emitters ─────────────────────────────────────────

/**
 * Emit an obligation overdue event with obligation context.
 */
export async function emitObligationOverdue(
  tenantId: string,
  obligationId: string,
  pillar: string,
  deadline: string,
): Promise<void> {
  await emitDoraEvent(tenantId, DORA_EVENTS.OBLIGATION_OVERDUE, 'obligation', obligationId, {
    pillar,
    deadline,
    flaggedAt: new Date().toISOString(),
  }, 'warning');
}

/**
 * Emit a concentration risk detected event.
 */
export async function emitConcentrationRisk(
  tenantId: string,
  providerName: string,
  serviceCount: number,
  threshold: number,
): Promise<void> {
  await emitDoraEvent(tenantId, DORA_EVENTS.CONCENTRATION_RISK_DETECTED, 'third_party_provider', providerName, {
    serviceCount,
    threshold,
    detectedAt: new Date().toISOString(),
  }, 'warning');
}

/**
 * Emit an AI analysis completed event for audit trail.
 * MP-25 §8 + Law 12: Every AI usage must be auditable.
 */
export async function emitAiAnalysisCompleted(
  tenantId: string,
  analysisType: string,
  entityRef: string,
  tokensUsed: { input: number; output: number },
  modelUsed: string,
): Promise<void> {
  await emitDoraEvent(tenantId, DORA_EVENTS.AI_ANALYSIS_COMPLETED, 'ai_analysis', entityRef, {
    analysisType,
    tokensUsed,
    modelUsed,
    completedAt: new Date().toISOString(),
  });
}
