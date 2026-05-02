import { eventBus } from '../ports/events.port';
import type { PortalsStatus } from '../types/portals.types';
import { randomUUID } from 'crypto';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { safeQuery } from "@dos/db";

export type PortalsEntityType = 'portal' | 'page' | 'widget' | 'token' | 'session' | 'access_log';
export type PortalsAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'provisioned' | 'activated' | 'deactivated' | 'suspended'
  | 'theme_updated' | 'domain_mapped' | 'domain_removed'
  | 'token_issued' | 'token_revoked' | 'token_expired'
  | 'session_started' | 'session_ended' | 'session_expired'
  | 'page_created' | 'page_published' | 'page_archived' | 'page_content_updated'
  | 'widget_added' | 'widget_removed' | 'widget_configured'
  | 'access_granted' | 'access_revoked' | 'access_denied'
  | 'ip_blocked' | 'rate_limited'
  | 'escalated' | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface PortalsEventOptions {
  tenantId: string;
  entityType: PortalsEntityType;
  entityId: string;
  action: PortalsAction;
  triggeredBy: string;
  previousState?: PortalsStatus;
  newState?: PortalsStatus;
  correlationId?: string;
  severity?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: PortalsAction): 'info' | 'warning' | 'critical' {
  if (act === 'suspended' || act === 'access_denied' || act === 'ip_blocked') return 'critical';
  if (act === 'token_expired' || act === 'session_expired' || act === 'deactivated' || act === 'rate_limited' || act === 'access_revoked') return 'warning';
  return 'info';
}

export function emitPortalsEvent(opts: PortalsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `portals.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'portals',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitPortalsStatusChange(
  tenantId: string, entityType: PortalsEntityType, entityId: string,
  previousState: PortalsStatus, newState: PortalsStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitPortalsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitPortalProvisioned(tenantId: string, portalId: string, portalType: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'portal', entityId: portalId, action: 'provisioned', triggeredBy, data: { portalType } });
}

export function emitPortalActivated(tenantId: string, portalId: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'portal', entityId: portalId, action: 'activated', triggeredBy, previousState: 'draft', newState: 'active' });
}

export function emitPortalDeactivated(tenantId: string, portalId: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'portal', entityId: portalId, action: 'deactivated', triggeredBy, newState: 'suspended' });
}

export function emitTokenIssued(tenantId: string, portalId: string, tokenId: string, externalUserId: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'token', entityId: tokenId, action: 'token_issued', triggeredBy, data: { portalId, externalUserId } });
}

export function emitTokenRevoked(tenantId: string, tokenId: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'token', entityId: tokenId, action: 'token_revoked', triggeredBy });
}

export function emitPagePublished(tenantId: string, portalId: string, pageId: string, triggeredBy: string): void {
  emitPortalsEvent({ tenantId, entityType: 'page', entityId: pageId, action: 'page_published', triggeredBy, data: { portalId } });
}

export function emitAccessDenied(tenantId: string, portalId: string, ipAddress: string, reason: string): void {
  emitPortalsEvent({ tenantId, entityType: 'access_log', entityId: portalId, action: 'access_denied', triggeredBy: SYSTEM_JOB_ACTOR, data: { ipAddress, reason } });
}

export function emitSessionStarted(tenantId: string, portalId: string, sessionId: string, externalUserId: string): void {
  emitPortalsEvent({ tenantId, entityType: 'session', entityId: sessionId, action: 'session_started', triggeredBy: externalUserId, data: { portalId } });
}
