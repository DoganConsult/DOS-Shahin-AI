import { eventBus } from '../../ports/events.port';
import type { EvidenceStatus } from '../../types/evidence.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type EvidenceEntityType =
  | 'evidence'
  | 'collection'
  | 'request'
  | 'review'
  | 'artifact'
  | 'control_mapping'
  | 'compliance_chain';

export type EvidenceAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'evidence_collected' | 'evidence_submitted' | 'evidence_reviewed'
  | 'evidence_accepted' | 'evidence_rejected' | 'evidence_expired'
  | 'evidence_restored' | 'evidence_archived' | 'evidence_exported'
  | 'collection_requested' | 'collection_completed' | 'collection_overdue' | 'collection_cancelled'
  | 'artifact_uploaded' | 'artifact_linked' | 'artifact_unlinked' | 'artifact_versioned'
  | 'review_assigned' | 'review_completed' | 'review_escalated' | 'review_reassigned'
  | 'control_mapped' | 'control_unmapped'
  | 'framework_tagged' | 'framework_untagged'
  | 'refresh_required' | 'freshness_degraded'
  | 'compliance_gap_detected' | 'compliance_gap_resolved'
  | 'bulk_updated' | 'bulk_accepted' | 'bulk_rejected'
  | 'assigned' | 'escalated' | 'approved' | 'rejected';

export interface EvidenceEventOptions {
  tenantId: string;
  entityType: EvidenceEntityType;
  entityId: string;
  action: EvidenceAction;
  triggeredBy: string;
  previousState?: EvidenceStatus;
  newState?: EvidenceStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: EvidenceAction): 'info' | 'warning' | 'critical' {
  if (
    act === 'evidence_expired' ||
    act === 'collection_overdue' ||
    act === 'compliance_gap_detected' ||
    act === 'freshness_degraded'
  ) return 'critical';
  if (
    act === 'evidence_rejected' ||
    act === 'review_escalated' ||
    act === 'refresh_required' ||
    act === 'escalated'
  ) return 'warning';
  return 'info';
}

export function emitEvidenceEvent(opts: EvidenceEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `evidence.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(eventType, opts.tenantId, {
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
    }, { severity: severityForAction(opts.action) });
  } catch {
  }
}

export function emitEvidenceStatusChange(
  tenantId: string, entityType: EvidenceEntityType, entityId: string,
  previousState: EvidenceStatus, newState: EvidenceStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitEvidenceEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitEvidenceCollected(
  tenantId: string, evidenceId: string, evidenceType: string,
  collectionMethod: string, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'evidence_collected', triggeredBy, correlationId,
    data: { evidenceType, collectionMethod },
  });
}

export function emitEvidenceSubmitted(
  tenantId: string, evidenceId: string, submittedBy: string,
  controlId?: string, framework?: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'evidence_submitted',
    triggeredBy: submittedBy, correlationId,
    data: { controlId, framework },
  });
}

export function emitEvidenceAccepted(
  tenantId: string, evidenceId: string, reviewerId: string,
  qualityScore?: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'evidence_accepted',
    triggeredBy: reviewerId, correlationId,
    data: { qualityScore },
  });
}

export function emitEvidenceRejected(
  tenantId: string, evidenceId: string, reviewerId: string,
  rejectionReason: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'evidence_rejected',
    triggeredBy: reviewerId, correlationId,
    data: { rejectionReason },
  });
}

export function emitEvidenceExpired(
  tenantId: string, evidenceId: string, controlId: string | null,
  framework: string | null, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'evidence_expired',
    triggeredBy, correlationId,
    data: { controlId, framework },
  });
}

export function emitCollectionRequested(
  tenantId: string, requestId: string, requestedBy: string,
  controlId: string, framework: string, dueDate: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'collection', entityId: requestId, action: 'collection_requested',
    triggeredBy: requestedBy, correlationId,
    data: { controlId, framework, dueDate },
  });
}

export function emitCollectionCompleted(
  tenantId: string, requestId: string, completedBy: string,
  itemCount: number, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'collection', entityId: requestId, action: 'collection_completed',
    triggeredBy: completedBy, correlationId,
    data: { itemCount },
  });
}

export function emitCollectionOverdue(
  tenantId: string, requestId: string, dueDate: string,
  hoursOverdue: number, controlId: string, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'collection', entityId: requestId, action: 'collection_overdue',
    triggeredBy, correlationId,
    data: { dueDate, hoursOverdue, controlId },
  });
}

export function emitArtifactUploaded(
  tenantId: string, evidenceId: string, artifactId: string,
  fileName: string, mimeType: string, uploadedBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'artifact', entityId: evidenceId, action: 'artifact_uploaded',
    triggeredBy: uploadedBy, correlationId,
    data: { artifactId, fileName, mimeType },
  });
}

export function emitArtifactLinked(
  tenantId: string, evidenceId: string, linkedEntityId: string,
  linkedModule: string, linkType: string, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'artifact', entityId: evidenceId, action: 'artifact_linked',
    triggeredBy, correlationId,
    data: { linkedEntityId, linkedModule, linkType },
  });
}

export function emitArtifactUnlinked(
  tenantId: string, evidenceId: string, unlinkedEntityId: string,
  linkedModule: string, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'artifact', entityId: evidenceId, action: 'artifact_unlinked',
    triggeredBy, correlationId,
    data: { unlinkedEntityId, linkedModule },
  });
}

export function emitReviewAssigned(
  tenantId: string, evidenceId: string, reviewerId: string,
  assignedBy: string, reviewDeadline?: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'review', entityId: evidenceId, action: 'review_assigned',
    triggeredBy: assignedBy, correlationId,
    data: { reviewerId, reviewDeadline },
  });
}

export function emitReviewCompleted(
  tenantId: string, evidenceId: string, reviewerId: string,
  outcome: 'accepted' | 'rejected', qualityScore?: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'review', entityId: evidenceId, action: 'review_completed',
    triggeredBy: reviewerId, correlationId,
    data: { outcome, qualityScore },
  });
}

export function emitControlMapped(
  tenantId: string, evidenceId: string, controlId: string,
  framework: string, mappedBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'control_mapping', entityId: evidenceId, action: 'control_mapped',
    triggeredBy: mappedBy, correlationId,
    data: { controlId, framework },
  });
}

export function emitControlUnmapped(
  tenantId: string, evidenceId: string, controlId: string,
  framework: string, unmappedBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'control_mapping', entityId: evidenceId, action: 'control_unmapped',
    triggeredBy: unmappedBy, correlationId,
    data: { controlId, framework },
  });
}

export function emitRefreshRequired(
  tenantId: string, evidenceId: string, reason: string,
  daysUntilExpiry: number, controlId: string | null, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'refresh_required',
    triggeredBy, correlationId,
    data: { reason, daysUntilExpiry, controlId },
  });
}

export function emitComplianceGapDetected(
  tenantId: string, framework: string, controlId: string,
  gapReason: string, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'compliance_chain', entityId: controlId, action: 'compliance_gap_detected',
    triggeredBy, correlationId,
    data: { framework, controlId, gapReason },
  });
}

export function emitFreshnessDegraded(
  tenantId: string, evidenceId: string, currentFreshnessScore: number,
  threshold: number, triggeredBy: string, correlationId?: string,
): void {
  emitEvidenceEvent({
    tenantId, entityType: 'evidence', entityId: evidenceId, action: 'freshness_degraded',
    triggeredBy, correlationId,
    data: { currentFreshnessScore, threshold },
  });
}
