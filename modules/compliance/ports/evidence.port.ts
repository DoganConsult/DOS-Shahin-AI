/**
 * Evidence cross-module port.
 *
 * Compliance must NOT directly query the `evidence` table — it lives in the
 * Evidence module's domain. Per Patch 06 §2.5 ("Compliance must not own ...
 * duplicate evidence repository truth") + DB-USAGE-INVENTORY §9.
 *
 * Hosts MUST bind a real implementation that proxies to the Evidence module's
 * service API or event-driven projection.
 *
 * Until bound, the default returns zeros — which forces the ai-disabled
 * style failure mode rather than silently hitting cross-tenant SQL.
 */

export interface EvidenceStats {
  totalEvidence: number;
  expiringEvidence: number; // valid_until BETWEEN NOW() AND NOW()+30d
  approved?: number;
  pendingReview?: number;
  expired?: number;
}

export interface AuditReadinessInput {
  tenantId: string;
}

export interface AuditReadinessResult {
  /** percentage 0..100 — controls with approved evidence ÷ total controls */
  readiness: number;
}

export interface EvidenceCountInput {
  tenantId: string;
}

export interface EvidenceForControlInput {
  tenantId: string;
  controlId: string;
  status?: string; // 'Approved' etc
}

export interface EvidenceForControlResult {
  hasApprovedEvidence: boolean;
  count: number;
}

export interface EvidenceListInput {
  tenantId: string;
  controlId?: string;
  limit?: number;
  offset?: number;
}

export interface EvidenceListItem {
  evidenceId: string;
  controlId?: string;
  status?: string;
  validUntil?: string | null;
  collectedAt?: string | null;
  source?: string | null;
  title?: string | null;
}

export interface EvidenceCitation {
  id: string;
  title?: string;
  status?: string;
  submittedAt?: string | null;
  expiryDate?: string | null;
  compositeScore?: number | null;
}

export interface CitationsForControlInput {
  tenantId: string;
  controlId: string;
}

export interface EvidencePort {
  getStats(input: EvidenceCountInput): Promise<EvidenceStats>;
  getForControl(input: EvidenceForControlInput): Promise<EvidenceForControlResult>;
  list(input: EvidenceListInput): Promise<EvidenceListItem[]>;
  getAuditReadiness(input: AuditReadinessInput): Promise<AuditReadinessResult>;
  /**
   * Joined evidence + quality-score rows for a single control. Used by the
   * compliance explanation service when rendering the "evidence citations"
   * panel. Cross-module data (evidence + evidence_scores live in the
   * Evidence module's domain).
   */
  getCitationsForControl(input: CitationsForControlInput): Promise<EvidenceCitation[]>;
}

const unboundEvidenceStats: EvidenceStats = { totalEvidence: 0, expiringEvidence: 0, approved: 0, pendingReview: 0, expired: 0 };

let _impl: EvidencePort = {
  async getStats() { return unboundEvidenceStats; },
  async getForControl() { return { hasApprovedEvidence: false, count: 0 }; },
  async list() { return []; },
  async getAuditReadiness() { return { readiness: 0 }; },
  async getCitationsForControl() { return []; },
};

export function bindEvidencePort(impl: Partial<EvidencePort>): void {
  _impl = { ..._impl, ...impl };
}
export function getEvidencePort(): EvidencePort { return _impl; }
