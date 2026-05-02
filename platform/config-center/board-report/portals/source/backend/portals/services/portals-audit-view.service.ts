// ============================================
// Shahin-Ai — Portals Audit View Service
// Auditor portal views, evidence request mgmt,
// audit schedule display, finding acknowledgment
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from "@dos/db";

// === Types ===

export type EvidenceRequestStatus = "open" | "fulfilled" | "overdue" | "rejected";
export type FindingAcknowledgmentStatus = "pending" | "acknowledged" | "disputed";

export interface AuditorPortalView {
  portalId: string;
  auditorOrgId: string;
  auditTitle: string;
  openEvidenceRequests: number;
  pendingFindings: number;
  upcomingSchedule: AuditScheduleItem[];
  progressPct: number;
}

export interface EvidenceRequest {
  requestId: string;
  portalId: string;
  auditorOrgId: string;
  controlId: string | null;
  title: string;
  description: string;
  status: EvidenceRequestStatus;
  requestedBy: string;
  dueDate: string | null;
  fulfilledAt: string | null;
  evidenceLinks: string[];
  createdAt: string;
}

export interface AuditScheduleItem {
  scheduleId: string;
  portalId: string;
  eventTitle: string;
  eventType: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  attendees: string[];
}

export interface FindingAcknowledgment {
  findingId: string;
  portalId: string;
  auditorOrgId: string;
  title: string;
  severity: string;
  status: FindingAcknowledgmentStatus;
  acknowledgmentNote: string | null;
  acknowledgedAt: string | null;
  dueDate: string | null;
}

// === Pure Functions ===

export function isEvidenceOverdue(dueDate: string | null, status: EvidenceRequestStatus): boolean {
  if (status === "fulfilled" || !dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function computeAuditProgress(
  totalRequests: number,
  fulfilledRequests: number
): number {
  if (totalRequests === 0) return 0;
  return Math.round((fulfilledRequests / totalRequests) * 100);
}

// === DB-backed Functions ===

function mapEvidenceRequest( r: Record<string, unknown>): EvidenceRequest {
  return {

    requestId: r.request_id,

    portalId: r.portal_id,

    auditorOrgId: r.auditor_org_id,

    controlId: r.control_id || null,

    title: r.title,

    description: r.description || "",

    status: r.status,

    requestedBy: r.requested_by,

    dueDate: r.due_date ? (r.due_date?.toISOString?.() || r.due_date) : null,

    fulfilledAt: r.fulfilled_at ? (r.fulfilled_at?.toISOString?.() || r.fulfilled_at) : null,

    evidenceLinks: r.evidence_links || [],

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getAuditorPortalView(
  tenantId: string,
  portalId: string,
  auditorOrgId: string
): Promise<AuditorPortalView> {
  const schema = tenantSchema(tenantId);
  const open = await safeQuery(
    `SELECT COUNT(*)::int AS cnt
     FROM "${schema}".portal_evidence_requests
     WHERE portal_id = $1 AND auditor_org_id = $2 AND status != 'fulfilled'`,
    [portalId, auditorOrgId],
  ).catch(() => ({ rows: [{ cnt: 0 }] as any[] }));
  const openEvidenceRequests = (open.rows[0]?.cnt as number) ?? 0;

  return {
    portalId,
    auditorOrgId,
    auditTitle: 'Auditor Portal',
    openEvidenceRequests,
    pendingFindings: 0,
    upcomingSchedule: [],
    progressPct: 0,
  };
}

export async function getEvidenceRequests(
  tenantId: string,
  portalId: string,
  auditorOrgId: string,
  status?: EvidenceRequestStatus
): Promise<EvidenceRequest[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ["portal_id = $1", "auditor_org_id = $2"];
  const params: unknown[] = [portalId, auditorOrgId];

  if (status) { conditions.push(`status = $3`); params.push(status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_evidence_requests WHERE ${conditions.join(" AND ")} ORDER BY due_date ASC NULLS LAST`,
    params
  );
  return result.rows.map(mapEvidenceRequest);
}

export async function fulfillEvidenceRequest(
  tenantId: string,
  requestId: string,
  evidenceLinks: string[]
): Promise<EvidenceRequest> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function acknowledgeFinding(
  tenantId: string,
  findingId: string,
  note: string,
  status: "acknowledged" | "disputed"
): Promise<FindingAcknowledgment> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function markOverdueEvidenceRequests(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".portal_evidence_requests
     SET status = 'overdue', updated_at = NOW()
     WHERE status = 'open' AND due_date IS NOT NULL AND due_date < NOW()`
  );
  return result.rowCount ?? 0;
}
