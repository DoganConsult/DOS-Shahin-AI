import { logger, toErrorMessage } from '@dos/module-sdk';

/**
 * Attestation event subscribers — handle cross-module events.
 */
export function registerAttestationEventSubscribers(): void {
  logger.info('[Attestation] Event subscribers registered');
}

// -- Phase 7 (F-061): foundation.position.holder.assigned ------------------
//
// When a user is assigned to a position, issue mandatory attestations
// associated with that position. Idempotency on (positionId, userId).
export async function handleFoundationPositionAssigned(event: {
  tenantId?: string;
  entityId?: string;
  payload?: { entityId?: string; userId?: string; positionId?: string };
}): Promise<void> {
  const tenantId = event.tenantId;
  const positionId = event.payload?.positionId ?? event.payload?.entityId ?? event.entityId;
  const userId = event.payload?.userId;
  if (!tenantId || !positionId || !userId) return;
  try {
    const { safeQuery, tenantSchema } = await import('../../../config/database.js');
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".attestation_records (campaign_id, user_id, position_id, status, created_at, updated_at)
       SELECT c.id, $1, $2, 'pending', NOW(), NOW()
         FROM "${schema}".attestation_campaigns c
        WHERE c.status = 'active'
          AND c.deleted_at IS NULL
          AND c.position_id = $2
       ON CONFLICT (campaign_id, user_id) DO NOTHING`,
      [userId, positionId],
    );
    logger.info(`[Attestation] Issued mandatory attestations for user ${userId} on position ${positionId}`);
  } catch (err) {
    logger.error(`[Attestation] handleFoundationPositionAssigned failed: ${toErrorMessage(err)}`);
  }
}

export async function handleControlUpdated(payload: {
  tenantId: string;
  controlId: string;
  status: string;
}): Promise<void> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  try {
    const schema = tenantSchema(payload.tenantId);
    // Find active campaigns linked to updated control and flag for re-attestation
    await safeQuery(
      `UPDATE "${schema}".attestation_records
       SET needs_reattestation = TRUE, updated_at = NOW()
       WHERE campaign_id IN (
         SELECT id FROM "${schema}".attestation_campaigns WHERE status = 'active' AND deleted_at IS NULL
       )
       AND control_id = $1 AND status = 'approved' AND deleted_at IS NULL`,
      [payload.controlId],
    );
    logger.info(`[Attestation] Control ${payload.controlId} updated — flagged linked records for re-attestation`);
  } catch (err) {
    logger.error(`[Attestation] handleControlUpdated failed: ${toErrorMessage(err)}`);
  }
}

export async function handleEvidenceCollected(payload: {
  tenantId: string;
  evidenceId: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  try {
    if (payload.entityType !== 'attestation_record') return;
    const schema = tenantSchema(payload.tenantId);
    // Link evidence to attestation record
    await safeQuery(
      `INSERT INTO "${schema}".attestation_evidence_links (record_id, evidence_id, linked_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (record_id, evidence_id) DO NOTHING`,
      [payload.entityId, payload.evidenceId],
    );
    logger.info(`[Attestation] Evidence ${payload.evidenceId} linked to record ${payload.entityId}`);
  } catch (err) {
    logger.error(`[Attestation] handleEvidenceCollected failed: ${toErrorMessage(err)}`);
  }
}
