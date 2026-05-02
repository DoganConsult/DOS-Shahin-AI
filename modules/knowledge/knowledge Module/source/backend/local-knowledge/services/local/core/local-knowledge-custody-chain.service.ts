// ============================================
// Shahin-Ai — Local Knowledge Chain of Custody Service
// R3.3B Phase G+: Tracks complete audit trail of document state changes
// ============================================

import { safeQuery, safeQueryWithClient, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import * as crypto from 'crypto';
import { PoolClient } from 'pg';

export type CustodyEventType =
  | 'ingested'
  | 'extracted'
  | 'published'
  | 'archived'
  | 'deleted'
  | 'restored'
  | 'accessed'
  | 'legal_hold_placed'
  | 'legal_hold_removed'
  | 'retention_extended';

export interface CustodyEvent {
  custodyId: string;
  tenantId: string;
  documentId: string;
  eventType: CustodyEventType;
  actorUserId?: string;
  actorRole?: string;
  eventTimestamp: string;
  metadata?: any;
  previousCustodyId?: string;
  checksum?: string;
}

/**
 * Record a custody chain event (internal implementation with optional client)
 */
async function recordCustodyEventInternal(
  tenantId: string,
  documentId: string,
  eventType: CustodyEventType,
  actorUserId: string | undefined,
  actorRole: string | undefined,
  metadata: unknown | undefined,
  client?: PoolClient,
): Promise<string> {
  const schema = tenantSchema(tenantId);

  try {
    // Get previous custody event to link chain
    const prevRes = await safeQueryWithClient(
      `SELECT custody_id, checksum
       FROM "${schema}".local_knowledge_custody_chain
       WHERE document_id = $1 AND tenant_id = $2
       ORDER BY event_timestamp DESC
       LIMIT 1`,
      [documentId, tenantId],
      client,
    );

    const previousCustodyId = prevRes.rows.length > 0 ? prevRes.rows[0].custody_id : null;
    const previousChecksum = prevRes.rows.length > 0 ? prevRes.rows[0].checksum : null;

    // Get current document state for checksum
    const docRes = await safeQueryWithClient(
      `SELECT document_id, version, status, canonical_data, searchable_text, updated_at
       FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
      client,
    );

    let checksum: string | undefined;
    if (docRes.rows.length > 0) {
      const doc = docRes.rows[0];
      const stateString = JSON.stringify({
        documentId: doc.document_id,
        version: doc.version,
        status: doc.status,
        canonicalDataHash: crypto.createHash('sha256').update(JSON.stringify(doc.canonical_data)).digest('hex').substring(0, 16),
        updatedAt: doc.updated_at,
        previousChecksum,
      });
      checksum = crypto.createHash('sha256').update(stateString).digest('hex');
    }

    // Insert custody event
    const custodyId = crypto.randomUUID();
    await safeQueryWithClient(
      `INSERT INTO "${schema}".local_knowledge_custody_chain
         (custody_id, tenant_id, document_id, event_type, actor_user_id, actor_role,
          event_timestamp, metadata, previous_custody_id, checksum)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)`,
      [
        custodyId,
        tenantId,
        documentId,
        eventType,
        actorUserId || null,
        actorRole || null,
        metadata ? JSON.stringify(metadata) : null,
        previousCustodyId,
        checksum,
      ],
      client,
    );

    logger.info('[LocalKnowledgeCustodyChain] Custody event recorded', {
      tenantId,
      documentId,
      eventType,
      custodyId,
    });

    return custodyId;
  } catch (err) {
    logger.error('[LocalKnowledgeCustodyChain] Failed to record custody event', {
      tenantId,
      documentId,
      eventType,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Record a custody chain event
 */
export async function recordCustodyEvent(
  tenantId: string,
  documentId: string,
  eventType: CustodyEventType,
  actorUserId?: string,
  actorRole?: string,
  metadata?: any,
): Promise<string> {
  return recordCustodyEventInternal(tenantId, documentId, eventType, actorUserId, actorRole, metadata);
}

/**
 * Record a custody chain event within an existing transaction (uses provided client)
 */
export async function recordCustodyEventWithClient(
  tenantId: string,
  documentId: string,
  eventType: CustodyEventType,
  actorUserId: string | undefined,
  actorRole: string | undefined,
  metadata: unknown | undefined,
  client: PoolClient,
): Promise<string> {
  return recordCustodyEventInternal(tenantId, documentId, eventType, actorUserId, actorRole, metadata, client);
}

/**
 * Get complete custody chain for a document
 */
export async function getCustodyChain(
  tenantId: string,
  documentId: string,
): Promise<CustodyEvent[]> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT custody_id, tenant_id, document_id, event_type, actor_user_id, actor_role,
              event_timestamp, metadata, previous_custody_id, checksum
       FROM "${schema}".local_knowledge_custody_chain
       WHERE tenant_id = $1 AND document_id = $2
       ORDER BY event_timestamp ASC`,
      [tenantId, documentId],
    );

    return res.rows.map(row => ({
      custodyId: row.custody_id,
      tenantId: row.tenant_id,
      documentId: row.document_id,
      eventType: row.event_type,
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      eventTimestamp: row.event_timestamp,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      previousCustodyId: row.previous_custody_id,
      checksum: row.checksum,
    }));
  } catch (err) {
    logger.error('[LocalKnowledgeCustodyChain] Failed to get custody chain', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Verify custody chain integrity (check for tampering)
 */
export async function verifyCustodyChainIntegrity(
  tenantId: string,
  documentId: string,
): Promise<{ valid: boolean; issues: string[] }> {
  const chain = await getCustodyChain(tenantId, documentId);
  const issues: string[] = [];

  if (chain.length === 0) {
    return { valid: false, issues: ['No custody chain found'] };
  }

  // Verify chain links (each event should reference previous)
  for (let i = 1; i < chain.length; i++) {
    const current = chain[i];
    const previous = chain[i - 1];

    if (current.previousCustodyId !== previous.custodyId) {
      issues.push(`Chain break at event ${i}: previous_custody_id mismatch`);
    }
  }

  // Verify checksums (recompute and compare)
  const schema = tenantSchema(tenantId);
  for (const event of chain) {
    if (!event.checksum) {
      continue; // Skip events without checksums
    }

    // Get document state at event time (approximate)
    const docRes = await safeQuery(
      `SELECT document_id, version, status, canonical_data, updated_at
       FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );

    if (docRes.rows.length > 0) {
      const doc = docRes.rows[0];
      const prevEvent = chain.find(e => e.custodyId === event.previousCustodyId);
      const prevChecksum = prevEvent?.checksum || null;

      const stateString = JSON.stringify({
        documentId: doc.document_id,
        version: doc.version,
        status: doc.status,
        canonicalDataHash: crypto.createHash('sha256').update(JSON.stringify(doc.canonical_data)).digest('hex').substring(0, 16),
        updatedAt: doc.updated_at,
        previousChecksum: prevChecksum,
      });
      const computedChecksum = crypto.createHash('sha256').update(stateString).digest('hex');

      if (computedChecksum !== event.checksum) {
        issues.push(`Checksum mismatch for event ${event.custodyId} (possible tampering)`);
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
