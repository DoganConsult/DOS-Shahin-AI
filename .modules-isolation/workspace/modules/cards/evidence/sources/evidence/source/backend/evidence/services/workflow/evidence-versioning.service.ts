// ============================================
// Evidence Versioning — Version chaining,
// expiry alerts, metadata serialization
// ============================================

import * as crypto from "crypto";
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

// === Evidence Metadata Types ===

export interface EvidenceMetadata {
  evidenceId: string;
  controlId: string;
  title: string;
  description: string | null;
  version: number;
  previousVersionId: string | null;
  expiryDate: string | null;
  fileSizeBytes: number | null;
  submittedBy: string;
  submittedAt: string;
}

// === Submit Evidence Version (links to previous) ===

export async function submitEvidenceVersion(
  tenantId: string,
  existingEvidenceId: string,
  newData: {
    title: string;
    description?: string;
    filePath?: string;
    content?: string;
    submittedBy: string;
    expiryDate?: string;
    fileSizeBytes?: number;
  }
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// === Get Expiring Evidence (within 30 days) ===

export async function getExpiringEvidence(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence
     WHERE expiry_date IS NOT NULL
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiry_date >= CURRENT_DATE
     ORDER BY expiry_date ASC`
  );
  return result.rows;
}

// === Evidence Metadata Serialization ===

export function serializeEvidenceMetadata(metadata: EvidenceMetadata): string {
  return JSON.stringify(metadata);
}

export function deserializeEvidenceMetadata(json: string): EvidenceMetadata {
  const parsed = JSON.parse(json);
  return {
    evidenceId: parsed.evidenceId,
    controlId: parsed.controlId,
    title: parsed.title,
    description: parsed.description ?? null,
    version: parsed.version,
    previousVersionId: parsed.previousVersionId ?? null,
    expiryDate: parsed.expiryDate ?? null,
    fileSizeBytes: parsed.fileSizeBytes ?? null,
    submittedBy: parsed.submittedBy,
    submittedAt: parsed.submittedAt,
  };
}
