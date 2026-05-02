// ============================================
// Shahin-Ai — Privacy Consent Manager
// Consent record CRUD, withdrawal processing,
// audit trail, expiry tracking, purpose-based management
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type ConsentStatus = "active" | "withdrawn" | "expired" | "pending";

export interface ConsentRecord {
  id: string;
  tenantId: string;
  dataSubjectId: string;
  dataSubjectEmail: string;
  purpose: string;
  legalBasis: string;
  status: ConsentStatus;
  consentedAt: string | null;
  withdrawnAt: string | null;
  expiryDate: string | null;
  consentText: string;
  collectionMethod: string;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentAuditEntry {
  action: "granted" | "withdrawn" | "expired" | "updated";
  performedBy: string;
  performedAt: string;
  details: string;
}

export interface CreateConsentData {
  dataSubjectId: string;
  dataSubjectEmail: string;
  purpose: string;
  legalBasis: string;
  consentText: string;
  collectionMethod: string;
  ipAddress?: string;
  expiryDays?: number;
}

// === Pure Functions ===

export function computeConsentExpiry(consentedAt: Date, expiryDays: number): Date {
  return new Date(consentedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000);
}

export function isConsentExpired(expiryDate: Date | null, now: Date): boolean {
  if (!expiryDate) return false;
  return now > expiryDate;
}

export function isConsentActive(record: { status: ConsentStatus; expiryDate: string | null }, now: Date): boolean {
  if (record.status !== "active") return false;
  if (record.expiryDate && isConsentExpired(new Date(record.expiryDate), now)) return false;
  return true;
}

export function validateConsentPurpose(purpose: string): boolean {
  const allowedPurposes = ["marketing", "analytics", "service_delivery", "legal_compliance", "research", "third_party_sharing"];
  return allowedPurposes.includes(purpose) || purpose.length > 0;
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): ConsentRecord {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    dataSubjectId: r.data_subject_id || r.metadata?.dataSubjectId || "",

    dataSubjectEmail: r.data_subject_email,

    purpose: r.metadata?.purpose || r.title,

    legalBasis: r.metadata?.legalBasis || "consent",

    status: r.status,

    consentedAt: meta.consentedAt || null,

    withdrawnAt: meta.withdrawnAt || null,

    expiryDate: r.due_date?.toISOString?.() || r.due_date || null,

    consentText: meta.consentText || r.description || "",

    collectionMethod: meta.collectionMethod || "web_form",

    ipAddress: meta.ipAddress || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

// === DB Functions ===

export async function grantConsent(tenantId: string, data: CreateConsentData): Promise<ConsentRecord> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const expiryDate = data.expiryDays ? computeConsentExpiry(now, data.expiryDays) : null;

  const metadata = {
    purpose: data.purpose,
    legalBasis: data.legalBasis,
    consentText: data.consentText,
    collectionMethod: data.collectionMethod,
    ipAddress: data.ipAddress || null,
    consentedAt: now.toISOString(),
    withdrawnAt: null,
    auditTrail: [{ action: "granted", performedBy: data.dataSubjectId, performedAt: now.toISOString(), details: `Consent granted for purpose: ${data.purpose}` }],
  };

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, data_subject_id, due_date, created_by, metadata)
     VALUES ($1,$2,$3,'active','access',$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      tenantId, `Consent: ${data.purpose}`, data.consentText, data.dataSubjectId,
      data.dataSubjectEmail, data.dataSubjectId, expiryDate?.toISOString() || null,
      data.dataSubjectId, JSON.stringify(metadata),
    ]
  );
  return mapRow(getFirstRow(result)!);
}

export async function withdrawConsent(
  tenantId: string,
  consentId: string,
  performedBy: string,
  reason?: string
): Promise<ConsentRecord> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, consentId],
  );
  const row = getFirstRow(current) as any;
  if (!row) throw new Error('Consent not found');

  const meta = (row.metadata as any) || {};
  const now = new Date().toISOString();
  const auditTrail = Array.isArray(meta.auditTrail) ? meta.auditTrail : [];
  auditTrail.push({ action: 'withdrawn', performedBy, performedAt: now, details: reason || 'Consent withdrawn' });
  meta.withdrawnAt = now;
  meta.withdrawalReason = reason || null;
  meta.auditTrail = auditTrail;

  const updated = await safeQuery(
    `UPDATE "${schema}".privacy_privacy
     SET status = 'withdrawn', metadata = $3, updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, consentId, JSON.stringify(meta)],
  );
  return mapRow(getFirstRow(updated) as any);
}

export async function getConsentsBySubject(
  tenantId: string,
  dataSubjectId: string
): Promise<ConsentRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE data_subject_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [dataSubjectId]
  );
  return result.rows.map(mapRow);
}

export async function getActiveConsentsByPurpose(
  tenantId: string,
  purpose: string
): Promise<ConsentRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy
     WHERE deleted_at IS NULL AND status = 'active'
       AND metadata->>'purpose' = $1
       AND (due_date IS NULL OR due_date > NOW())
     ORDER BY created_at DESC`,
    [purpose]
  );
  return result.rows.map(mapRow);
}

export async function expireOverdueConsents(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'active' AND due_date IS NOT NULL AND due_date < NOW() AND deleted_at IS NULL`,
    []
  );
  return result.rowCount ?? 0;
}

export async function getConsentAuditTrail(
  tenantId: string,
  consentId: string
): Promise<ConsentAuditEntry[]> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.privacy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
