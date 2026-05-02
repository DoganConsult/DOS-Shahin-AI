// ============================================
// Shahin-Ai — Privacy DSR Processor
// Data subject request processing, SLA tracking,
// status lifecycle, and response generation
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";
import { exportTenantData } from './tenant-data-export.service';

// === Types ===

export type DsrRequestType = "access" | "erasure" | "portability" | "rectification";
export type DsrStatus = "pending" | "in_progress" | "completed" | "rejected" | "on_hold";

export interface DsrRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: DsrStatus;
  requestType: DsrRequestType;
  dataSubjectName: string;
  dataSubjectEmail: string;
  dataSubjectId: string | null;
  dueDate: string | null;
  assignedTo: string | null;
  priority: string;
  resolution: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateDsrData {
  title: string;
  description?: string;
  requestType: DsrRequestType;
  dataSubjectName: string;
  dataSubjectEmail: string;
  dataSubjectId?: string;
  assignedTo?: string;
  priority?: string;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// === Pure Functions ===

export function computeDsrDueDate(requestType: DsrRequestType, createdAt: Date): Date {
  const slaMap: Record<DsrRequestType, number> = {
    access: 30,
    erasure: 30,
    portability: 30,
    rectification: 30,
  };
  const days = slaMap[requestType] ?? 30;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isDsrOverdue(dueDate: Date, now: Date): boolean {
  return now > dueDate;
}

export function getDsrSlaRemainingDays(dueDate: Date, now: Date): number {
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function canTransitionDsr(current: DsrStatus, next: DsrStatus): boolean {
  const allowed: Record<DsrStatus, DsrStatus[]> = {
    pending: ["in_progress", "rejected", "on_hold"],
    in_progress: ["completed", "rejected", "on_hold"],
    on_hold: ["in_progress", "rejected"],
    completed: [],
    rejected: [],
  };
  return allowed[current]?.includes(next) ?? false;
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): DsrRecord {
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",

    status: r.status,

    requestType: r.request_type,

    dataSubjectName: r.data_subject_name,

    dataSubjectEmail: r.data_subject_email,

    dataSubjectId: r.data_subject_id || null,

    dueDate: r.due_date?.toISOString?.() || r.due_date || null,

    assignedTo: r.assigned_to || null,

    priority: r.priority || "medium",

    resolution: r.resolution || null,

    tags: r.tags || [],

    metadata: r.metadata || {},

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createDsr(tenantId: string, data: CreateDsrData): Promise<DsrRecord> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const dueDate = computeDsrDueDate(data.requestType, now);

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, data_subject_id, due_date, assigned_to, priority,
       created_by, tags, metadata)
     VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      tenantId, data.title, data.description || "", data.requestType,
      data.dataSubjectName, data.dataSubjectEmail, data.dataSubjectId || null,
      dueDate.toISOString(), data.assignedTo || null, data.priority || "medium",
      data.createdBy, JSON.stringify(data.tags || []), JSON.stringify(data.metadata || {}),
    ]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getDsr(tenantId: string, id: string): Promise<DsrRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('DSR not found');
  return mapRow(row as any);
}

export async function listDsrs(
  tenantId: string,
  filters?: { status?: DsrStatus; requestType?: DsrRequestType; assignedTo?: string }
): Promise<DsrRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.requestType) { conditions.push(`request_type = $${idx++}`); params.push(filters.requestType); }
  if (filters?.assignedTo) { conditions.push(`assigned_to = $${idx++}`); params.push(filters.assignedTo); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow);
}

export async function transitionDsrStatus(
  tenantId: string,
  id: string,
  nextStatus: DsrStatus,
  resolution?: string
): Promise<DsrRecord> {
  const schema = tenantSchema(tenantId);
  const current = await getDsr(tenantId, id);
  const meta = { ...(current as any), resolution: resolution ?? (current as any).resolution ?? null };
  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy
     SET status = $1, metadata = $2, updated_at = NOW()
     WHERE tenant_id = $3 AND id = $4
     RETURNING *`,
    [nextStatus, JSON.stringify(meta), tenantId, id],
  );
  return mapRow(getFirstRow(result) as any);
}

export async function getOverdueDsrs(tenantId: string): Promise<DsrRecord[]> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy
     WHERE deleted_at IS NULL
       AND status NOT IN ('completed', 'rejected')
       AND due_date IS NOT NULL
       AND due_date < $1
     ORDER BY due_date ASC`,
    [now]
  );
  return result.rows.map(mapRow);
}

export async function generateDsrResponse(
  tenantId: string,
  id: string
): Promise<{ dsrId: string; requestType: DsrRequestType; dataSubjectName: string; responseText: string; generatedAt: string; exportData?: unknown }> {
  const dsr = await getDsr(tenantId, id);
  const responseTemplates: Record<DsrRequestType, string> = {
    access: `Dear ${dsr.dataSubjectName}, your data access request has been processed. Please find your personal data attached.`,
    erasure: `Dear ${dsr.dataSubjectName}, your erasure request has been completed. Your personal data has been removed from our systems.`,
    portability: `Dear ${dsr.dataSubjectName}, your data portability request has been fulfilled. Your data export is attached.`,
    rectification: `Dear ${dsr.dataSubjectName}, your rectification request has been completed. Your personal data has been updated.`,
  };

  const result: { dsrId: string; requestType: DsrRequestType; dataSubjectName: string; responseText: string; generatedAt: string; exportData?: unknown } = {
    dsrId: dsr.id,
    requestType: dsr.requestType,
    dataSubjectName: dsr.dataSubjectName,
    responseText: responseTemplates[dsr.requestType],
    generatedAt: new Date().toISOString(),
  };

  // For portability and access requests, include the actual tenant data export
  if (dsr.requestType === 'portability' || dsr.requestType === 'access') {
    result.exportData = await exportTenantData(tenantId);
  }

  return result;
}
