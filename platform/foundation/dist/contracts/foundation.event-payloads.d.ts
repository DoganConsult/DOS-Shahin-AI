/**
 * Typed payloads for every Foundation published event.
 *
 * Cross-module subscribers MUST use this map to derive the payload type
 * for a given event name, so a payload-shape change forces a compile-time
 * break in every consumer.
 *
 *   import { FoundationEventPayloadFor } from '@dos/module-foundation/contracts';
 *   function on<E extends FoundationEventName>(name: E, p: FoundationEventPayloadFor<E>) { ... }
 */
import type { FoundationEntityType } from './foundation.types';
export interface FoundationOrgCreatedPayload {
    tenantId: string;
    entityId: string;
    entityType: 'organization';
    parentId: string | null;
    code: string;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationOrgUpdatedPayload {
    tenantId: string;
    entityId: string;
    entityType: 'organization';
    changes: Record<string, {
        before: unknown;
        after: unknown;
    }>;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationDeptCreatedPayload {
    tenantId: string;
    entityId: string;
    entityType: 'department';
    parentId: string | null;
    code: string;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationDeptUpdatedPayload {
    tenantId: string;
    entityId: string;
    entityType: 'department';
    changes: Record<string, {
        before: unknown;
        after: unknown;
    }>;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationRoleAssignedPayload {
    tenantId: string;
    userId: string;
    roleCode: string;
    scopeType: FoundationEntityType | 'tenant';
    scopeId: string | null;
    validFrom: string;
    validTo?: string;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationRoleRevokedPayload {
    tenantId: string;
    userId: string;
    roleCode: string;
    scopeType: FoundationEntityType | 'tenant';
    scopeId: string | null;
    reason?: string;
    triggeredBy: string;
    timestamp: string;
}
export interface FoundationScopeChangedPayload {
    tenantId: string;
    entityId: string;
    entityType: FoundationEntityType;
    oldParentId: string | null;
    newParentId: string | null;
    triggeredBy: string;
    timestamp: string;
}
/** Map from event name → payload type. */
export interface FoundationEventPayloadMap {
    'foundation.org_created': FoundationOrgCreatedPayload;
    'foundation.org_updated': FoundationOrgUpdatedPayload;
    'foundation.dept_created': FoundationDeptCreatedPayload;
    'foundation.dept_updated': FoundationDeptUpdatedPayload;
    'foundation.role_assigned': FoundationRoleAssignedPayload;
    'foundation.role_revoked': FoundationRoleRevokedPayload;
    'foundation.scope_changed': FoundationScopeChangedPayload;
}
export type FoundationEventPayloadFor<E extends keyof FoundationEventPayloadMap> = FoundationEventPayloadMap[E];
/** Envelope wrapping any foundation event for transport. */
export interface FoundationEventEnvelope<E extends keyof FoundationEventPayloadMap = keyof FoundationEventPayloadMap> {
    eventId: string;
    eventName: E;
    eventVersion: number;
    occurredAt: string;
    tenantId: string;
    correlationId?: string;
    causationId?: string;
    payload: FoundationEventPayloadMap[E];
}
