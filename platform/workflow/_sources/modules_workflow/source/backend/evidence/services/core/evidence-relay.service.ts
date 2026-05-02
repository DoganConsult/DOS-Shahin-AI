// ============================================================
// Cooperative Workflow #3 — Evidence Collection Relay
// A03 pre-fetches evidence, stages with confidence scores,
// human approves/rejects/annotates, agent auto-files approved.
// ============================================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { validateEvidence } from '../analysis/evidence-catalog.service';
import type { EvidenceRelayItem } from '@dos/types';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Stage Evidence ─────────────────────────────────────────────────────────

export async function stageEvidence(tenantId: string, items: Array<{
  controlId: string; sourceSystem: string; stagedContent: string; confidenceScore: number;
}>): Promise<EvidenceRelayItem[]> {
  const schema = tenantSchema(tenantId);
  const results: EvidenceRelayItem[] = [];

  for (const item of items) {
    const res = await safeQuery(
      `INSERT INTO "${schema}".evidence_relay_queue
         (control_id, agent_id, source_system, staged_content, confidence_score)
       VALUES ($1, 'AGENT-A03', $2, $3, $4) RETURNING relay_id, created_at`,
      [item.controlId, item.sourceSystem, item.stagedContent, item.confidenceScore],
    );
    results.push({
      relayId: getFirstRow(res)?.relay_id, evidenceId: '', controlId: item.controlId,
      agentId: 'AGENT-A03', sourceSystem: item.sourceSystem,
      stagedContent: item.stagedContent, confidenceScore: item.confidenceScore,
      status: 'staged', createdAt: getFirstRow(res)?.created_at,
    });
  }

  await eventBus.publish({
    tenantId, eventType: 'evidence_relay.staged', severity: 'info',
    payload: { count: results.length },
  });

  return results;
}

// ── Review Evidence ────────────────────────────────────────────────────────

export async function reviewRelayItem(tenantId: string, relayId: string, review: {
  action: 'approved' | 'rejected';
  reviewedBy: string;
  reviewNote?: string;
}): Promise<EvidenceRelayItem> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".evidence_relay_queue
     SET status = $1, reviewed_by = $2, review_note = $3, resolved_at = NOW()
     WHERE relay_id = $4`,
    [review.action, review.reviewedBy, review.reviewNote || null, relayId],
  );

  // If approved, auto-file the evidence against the control (G4: run quality gate first)
  if (review.action === 'approved') {
    const item = await safeQuery(`SELECT * FROM "${schema}".evidence_relay_queue WHERE relay_id = $1`, [relayId]);
    if (item.rows.length) {
      const r = getFirstRow(item)!;

      // G4: Run quality gate before auto-filing
      const catalogCheck = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: '0' }]), safeQuery(
        `SELECT COUNT(*) AS cnt FROM "${schema}".evidence_catalog WHERE control_id = $1`,
        [r.control_id]
      ), { tenantId: tenantId, operation: 'query evidence_relay_queue' });
      const hasCatalog = parseInt(getFirstRow(catalogCheck)?.cnt || '0', 10) > 0;

      if (hasCatalog) {
        const gateResult = validateEvidence({
          date: new Date().toISOString(),
          owner: review.reviewedBy,
          systemReference: r.source_system,
          ticketId: relayId,
          approvalTrail: [review.reviewedBy],
        });
        if (!gateResult.passed) {
          await safeQuery(
            `UPDATE "${schema}".evidence_relay_queue SET status = 'gate_failed', review_note = $1 WHERE relay_id = $2`,
            [`Quality gate failed: ${gateResult.failures.map(f => f.message).join('; ')}`, relayId]
          );
          await recordAudit({
            tenantId, userId: review.reviewedBy, module: 'cooperative-workflows',
            action: 'update', entityType: 'evidence_relay', entityId: relayId,
            afterState: { action: 'gate_failed', failures: gateResult.failures },
          });
          return getRelayItem(tenantId, relayId);
        }
      }

      // G5: Auto-calculate expiry from catalog retention_days
      let expiryClause = '';
      const retCheck = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT retention_days FROM "${schema}".evidence_catalog
         WHERE control_id = $1 ORDER BY retention_days ASC LIMIT 1`,
        [r.control_id]
      ), { tenantId: tenantId, operation: 'query evidence_catalog' });
      if (retCheck.rows.length > 0 && getFirstRow(retCheck)?.retention_days) {
        expiryClause = `, expiry_date = NOW() + INTERVAL '${getFirstRow(retCheck)?.retention_days} days'`;
      }

      const evidRes = await safeQuery(
        `INSERT INTO "${schema}".evidence (title, control_id, status, source, content, created_by)
         VALUES ($1, $2, 'approved', $3, $4, $5) RETURNING evidence_id`,
        [`Auto-collected: ${r.control_id}`, r.control_id, r.source_system, r.staged_content, review.reviewedBy],
      );

      if (expiryClause && getFirstRow(evidRes)) {
        await safeQuery(
          `UPDATE "${schema}".evidence SET expiry_date = NOW() + INTERVAL '${getFirstRow(retCheck)?.retention_days} days'
           WHERE evidence_id = $1`,
          [getFirstRow(evidRes)?.evidence_id]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      await safeQuery(
        `UPDATE "${schema}".evidence_relay_queue SET evidence_id = $1, status = 'filed' WHERE relay_id = $2`,
        [getFirstRow(evidRes)?.evidence_id, relayId],
      );
    }
  }

  await recordAudit({
    tenantId, userId: review.reviewedBy, module: 'cooperative-workflows',
    action: 'update', entityType: 'evidence_relay', entityId: relayId,
    afterState: { action: review.action },
  });

  return getRelayItem(tenantId, relayId);
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function getRelayItem(tenantId: string, relayId: string): Promise<EvidenceRelayItem> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence_relay_queue WHERE relay_id = $1`,
    [relayId],
  );
  if (!result.rows.length) throw new Error('Relay item not found');
  return mapRelay(getFirstRow(result) as Record<string, unknown>);
}

export async function listRelayQueue(tenantId: string, status?: string): Promise<EvidenceRelayItem[]> {
  const schema = tenantSchema(tenantId);
  const where = status ? `WHERE status = $1` : '';
  const params = status ? [status] : [];
  const res = await safeQuery(
    `SELECT * FROM "${schema}".evidence_relay_queue ${where} ORDER BY created_at DESC LIMIT 100`, params,
  );
  return res.rows.map(mapRelay);
}

function mapRelay( r: Record<string, unknown>): EvidenceRelayItem {
  return {

    relayId: r.relay_id, evidenceId: r.evidence_id || '', controlId: r.control_id,

    agentId: r.agent_id, sourceSystem: r.source_system, stagedContent: r.staged_content,

    confidenceScore: r.confidence_score, status: r.status,

    reviewedBy: r.reviewed_by, reviewNote: r.review_note,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    resolvedAt: r.resolved_at?.toISOString?.() || r.resolved_at,
  };
}
