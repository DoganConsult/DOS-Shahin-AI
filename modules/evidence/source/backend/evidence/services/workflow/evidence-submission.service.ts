import { logger } from '../../ports/logger.port';
// ============================================
// Evidence Submission — Hash-chain operations
// ============================================

import crypto from "crypto";
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { validateEvidence } from "../analysis/evidence-catalog.service";
import { recordActivity } from '../../ports/platform.port';
import { eventBus } from '../../ports/events.port';
import {
  resolveFoundationOwnership,
} from "../core/evidence-lifecycle.service";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// === Submit Evidence with Hash-Chain ===

export async function submitEvidence(tenantId: string, data: {
  controlId: string;
  title: string;
  description?: string;
  filePath?: string;
  content?: string;
  submittedBy: string;
  date?: string;
  owner?: string;
  systemReference?: string;
  ticketId?: string;
  approvalTrail?: string[];
  attestation?: { attestedBy: string; role: string };
  org_unit_id?: number | null;
  // P5.4: Pipeline evidence fields
  sourceType?: 'manual-upload' | 'system-generated' | 'connector' | 'pipeline';
  sourceReference?: string;
  metadataKv?: Record<string, unknown>;
}): Promise<GenericRow | undefined> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// === Verify Hash-Chain Integrity ===

export async function verifyHashChain(tenantId: string, evidenceId?: string): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  let sql = `SELECT evidence_id, content_hash, previous_hash, chain_position, title
             FROM "${schema}".evidence ORDER BY chain_position ASC`;
  const chain = (await safeQuery(sql)).rows;

  if (chain.length === 0) {
    return { intact: true, chainLength: 0, message: 'No evidence in chain' };
  }

  const errors: Array<{ position?: number; index?: number; evidenceId: string; expected?: string; actual?: string; error?: string }> = [];

  // Verify first entry has null previous_hash
  if (chain[0].previous_hash !== null) {
    errors.push({
      position: chain[0].chain_position,
      evidenceId: chain[0].evidence_id,
      error: 'Genesis entry should have null previous_hash',
    });
  }

  // Verify chain links
  for (let i = 1; i < chain.length; i++) {
    if (chain[i].previous_hash !== chain[i - 1].content_hash) {
      errors.push({
        position: chain[i].chain_position,
        evidenceId: chain[i].evidence_id,
        error: `Chain broken: previous_hash does not match prior entry's content_hash`,
        expected: chain[i - 1].content_hash,
        actual: chain[i].previous_hash,
      });
    }

    // Verify sequential chain positions
    if (chain[i].chain_position !== chain[i - 1].chain_position + 1) {
      errors.push({
        position: chain[i].chain_position,
        evidenceId: chain[i].evidence_id,
        error: 'Non-sequential chain position',
      });
    }
  }

  // If checking specific evidence, verify up to that point
  let verifiedUpTo = chain.length;
  if (evidenceId) {
    const idx = chain.findIndex((e: GenericRow) => e.evidence_id === evidenceId);
    if (idx === -1) {
      return { intact: false, error: 'Evidence not found in chain' };
    }
    verifiedUpTo = idx + 1;
  }

  return {
    intact: errors.length === 0,
    chainLength: chain.length,
    verifiedEntries: verifiedUpTo,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length === 0 ? 'Hash chain integrity verified' : `${errors.length} chain integrity error(s) found`,
  };
}
