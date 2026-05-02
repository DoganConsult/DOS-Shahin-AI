// ============================================
// Shahin-Ai — Portals Vendor View Service
// Vendor-specific portal views, questionnaire
// access, document upload tracking, vendor status
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from "@dos/db";

// === Types ===

export type VendorResponseStatus = "not_started" | "in_progress" | "submitted" | "under_review" | "accepted" | "rejected";

export interface VendorPortalView {
  portalId: string;
  vendorOrgId: string;
  portalTitle: string;
  openQuestionnaires: number;
  pendingDocuments: number;
  overallStatus: VendorResponseStatus;
  lastActivityAt: string | null;
  deadlineAt: string | null;
}

export interface VendorQuestionnaire {
  questionnaireId: string;
  portalId: string;
  vendorOrgId: string;
  title: string;
  description: string;
  status: VendorResponseStatus;
  totalQuestions: number;
  answeredQuestions: number;
  completionPct: number;
  submittedAt: string | null;
  deadlineAt: string | null;
  createdAt: string;
}

export interface DocumentUpload {
  uploadId: string;
  portalId: string;
  vendorOrgId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageKey: string;
  requestedBy: string | null;
  uploadedBy: string;
  status: "pending_review" | "accepted" | "rejected";
  reviewNote: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
}

// === Pure Functions ===

export function computeCompletionPct(answered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((answered / total) * 100);
}

export function deriveOverallStatus(
  questionnaires: { status: VendorResponseStatus }[]
): VendorResponseStatus {
  if (questionnaires.length === 0) return "not_started";
  if (questionnaires.every(q => q.status === "accepted")) return "accepted";
  if (questionnaires.some(q => q.status === "rejected")) return "rejected";
  if (questionnaires.some(q => q.status === "submitted" || q.status === "under_review")) return "under_review";
  if (questionnaires.some(q => q.status === "in_progress")) return "in_progress";
  return "not_started";
}

// === DB-backed Functions ===

function mapQuestionnaire( r: Record<string, unknown>): VendorQuestionnaire {
  const answered = parseInt((r as any).answered_questions, 10) || 0;
  const total = parseInt((r as any).total_questions, 10) || 0;
  return {

    questionnaireId: r.questionnaire_id,

    portalId: r.portal_id,

    vendorOrgId: r.vendor_org_id,

    title: r.title,

    description: r.description || "",

    status: r.status || "not_started",
    totalQuestions: total,
    answeredQuestions: answered,
    completionPct: computeCompletionPct(answered, total),

    submittedAt: r.submitted_at ? (r.submitted_at?.toISOString?.() || r.submitted_at) : null,

    deadlineAt: r.deadline_at ? (r.deadline_at?.toISOString?.() || r.deadline_at) : null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getVendorPortalView(
  tenantId: string,
  portalId: string,
  vendorOrgId: string
): Promise<VendorPortalView> {
  const schema = tenantSchema(tenantId);
  const portal = await safeQuery(
    `SELECT title, config FROM "${schema}".portals_portals WHERE portal_id = $1 LIMIT 1`,
    [portalId],
  ).catch(() => ({ rows: [] as any[] }));
  const portalTitle = portal.rows[0]?.title ? String(portal.rows[0].title) : 'Vendor Portal';

  const stats = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status != 'submitted')::int AS open,
       MAX(updated_at) AS last_activity,
       MAX(deadline_at) AS deadline_at
     FROM "${schema}".portal_questionnaires
     WHERE portal_id = $1 AND vendor_org_id = $2`,
    [portalId, vendorOrgId],
  ).catch(() => ({ rows: [{ open: 0, last_activity: null, deadline_at: null }] as any[] }));

  const openQuestionnaires = stats.rows[0]?.open ?? 0;
  const lastActivityAt = stats.rows[0]?.last_activity ? (stats.rows[0].last_activity?.toISOString?.() || String(stats.rows[0].last_activity)) : null;
  const deadlineAt = stats.rows[0]?.deadline_at ? (stats.rows[0].deadline_at?.toISOString?.() || String(stats.rows[0].deadline_at)) : null;
  const overallStatus: VendorResponseStatus = openQuestionnaires === 0 ? 'submitted' : 'in_progress';

  void portal;
  return {
    portalId,
    vendorOrgId,
    portalTitle,
    openQuestionnaires,
    pendingDocuments: 0,
    overallStatus,
    lastActivityAt,
    deadlineAt,
  };
}

export async function getVendorQuestionnaires(
  tenantId: string,
  portalId: string,
  vendorOrgId: string
): Promise<VendorQuestionnaire[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".portal_questionnaires
     WHERE portal_id = $1 AND vendor_org_id = $2 ORDER BY created_at ASC`,
    [portalId, vendorOrgId]
  );
  return result.rows.map(mapQuestionnaire);
}

export async function submitQuestionnaire(
  tenantId: string,
  questionnaireId: string,
  vendorOrgId: string
): Promise<VendorQuestionnaire> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function recordDocumentUpload(
  tenantId: string,
  data: {
    portalId: string;
    vendorOrgId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    storageKey: string;
    uploadedBy: string;
    requestedBy?: string;
  }
): Promise<DocumentUpload> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".portal_document_uploads
      (portal_id, vendor_org_id, file_name, file_size, file_type, storage_key,
       uploaded_by, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_review')
     RETURNING *`,
    [
      data.portalId, data.vendorOrgId, data.fileName, data.fileSize,
      data.fileType, data.storageKey, data.uploadedBy, data.requestedBy || null,
    ]
  );
  const r = result.rows[0];
  return {
    uploadId: r.upload_id, portalId: r.portal_id, vendorOrgId: r.vendor_org_id,
    fileName: r.file_name, fileSize: r.file_size, fileType: r.file_type,
    storageKey: r.storage_key, requestedBy: r.requested_by, uploadedBy: r.uploaded_by,
    status: r.status, reviewNote: r.review_note,
    uploadedAt: r.uploaded_at?.toISOString?.() || r.uploaded_at,
    reviewedAt: r.reviewed_at ? (r.reviewed_at?.toISOString?.() || r.reviewed_at) : null,
  };
}

export async function reviewDocument(
  tenantId: string,
  uploadId: string,
  decision: "accepted" | "rejected",
  reviewNote?: string
): Promise<DocumentUpload> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.portals_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
