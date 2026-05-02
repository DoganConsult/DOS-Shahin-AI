// ============================================
// Shahin-Ai — Privacy Breach Handler
// Breach notification workflows, 72-hour timeline,
// regulator reporting, affected individuals, severity assessment
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type BreachSeverity = "low" | "medium" | "high" | "critical";
export type BreachStatus = "reported" | "investigating" | "contained" | "notified" | "closed";

export interface BreachRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: BreachStatus;
  severity: BreachSeverity;
  discoveredAt: string;
  reportedAt: string;
  containedAt: string | null;
  regulatorNotifiedAt: string | null;
  individualsNotifiedAt: string | null;
  affectedIndividualsCount: number;
  affectedDataCategories: string[];
  rootCause: string | null;
  regulatorNotificationRequired: boolean;
  regulatorReportRef: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BreachTimelineEntry {
  eventId: string;
  event: string;
  occurredAt: string;
  performedBy: string;
  details: string;
}

export interface CreateBreachData {
  title: string;
  description: string;
  severity: BreachSeverity;
  discoveredAt: string;
  affectedIndividualsCount: number;
  affectedDataCategories: string[];
  assignedTo?: string;
  createdBy: string;
}

// === Pure Functions ===

export function assessBreachSeverity(
  affectedCount: number,
  dataCategories: string[]
): BreachSeverity {
  const sensitiveCategories = ["health", "financial", "biometric", "criminal", "national_id"];
  const hasSensitive = dataCategories.some(c => sensitiveCategories.some(s => c.toLowerCase().includes(s)));

  if (affectedCount > 10000 || (hasSensitive && affectedCount > 1000)) return "critical";
  if (affectedCount > 1000 || (hasSensitive && affectedCount > 100)) return "high";
  if (affectedCount > 100 || hasSensitive) return "medium";
  return "low";
}

export function isRegulatorNotificationRequired(severity: BreachSeverity, affectedCount: number): boolean {
  return severity === "critical" || severity === "high" || affectedCount >= 100;
}

export function compute72HourDeadline(discoveredAt: Date): Date {
  return new Date(discoveredAt.getTime() + 72 * 60 * 60 * 1000);
}

export function is72HourDeadlineBreached(discoveredAt: Date, now: Date): boolean {
  return now > compute72HourDeadline(discoveredAt);
}

export function getHoursUntilDeadline(discoveredAt: Date, now: Date): number {
  const deadline = compute72HourDeadline(discoveredAt);
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): BreachRecord {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",
    status: r.status as BreachStatus,

    severity: meta.severity || "medium",

    discoveredAt: meta.discoveredAt || r.created_at?.toISOString?.() || r.created_at,

    reportedAt: r.created_at?.toISOString?.() || r.created_at,

    containedAt: meta.containedAt || null,

    regulatorNotifiedAt: meta.regulatorNotifiedAt || null,

    individualsNotifiedAt: meta.individualsNotifiedAt || null,

    affectedIndividualsCount: meta.affectedIndividualsCount || 0,

    affectedDataCategories: meta.affectedDataCategories || [],

    rootCause: meta.rootCause || null,

    regulatorNotificationRequired: meta.regulatorNotificationRequired ?? false,

    regulatorReportRef: meta.regulatorReportRef || null,

    assignedTo: r.assigned_to || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function reportBreach(tenantId: string, data: CreateBreachData): Promise<BreachRecord> {
  const schema = tenantSchema(tenantId);
  const regulatorRequired = isRegulatorNotificationRequired(data.severity, data.affectedIndividualsCount);
  const metadata = {
    severity: data.severity,
    discoveredAt: data.discoveredAt,
    affectedIndividualsCount: data.affectedIndividualsCount,
    affectedDataCategories: data.affectedDataCategories,
    regulatorNotificationRequired: regulatorRequired,
    containedAt: null,
    regulatorNotifiedAt: null,
    individualsNotifiedAt: null,
    rootCause: null,
    regulatorReportRef: null,
    timeline: [{
      eventId: `evt_${Date.now()}`,
      event: "breach_reported",
      occurredAt: new Date().toISOString(),
      performedBy: data.createdBy,
      details: "Breach initially reported",
    }],
  };

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, assigned_to, priority, created_by, metadata)
     VALUES ($1,$2,$3,'reported','access','breach','breach@internal',$4,$5,$6,$7)
     RETURNING *`,
    [tenantId, data.title, data.description, data.assignedTo || null,
     data.severity === "critical" ? "high" : data.severity, data.createdBy, JSON.stringify(metadata)]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getBreach(tenantId: string, id: string): Promise<BreachRecord> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Breach not found');
  return mapRow(row as any);
}

export async function updateBreachStatus(
  tenantId: string,
  id: string,
  status: BreachStatus,
  performedBy: string,
  details?: string
): Promise<BreachRecord> {
  const schema = tenantSchema(tenantId);
  const current = await getBreach(tenantId, id);

  const now = new Date().toISOString();
  const meta = { ...current, id: undefined, tenantId: undefined, title: undefined, description: undefined, status: undefined, createdAt: undefined, updatedAt: undefined, createdBy: undefined, assignedTo: undefined, reportedAt: undefined };

  const timeline: BreachTimelineEntry[] = (meta as Record<string, unknown>).timeline || [];
  timeline.push({ eventId: `evt_${Date.now()}`, event: `status_${status}`, occurredAt: now, performedBy, details: details || `Status changed to ${status}` });

  if (status === "contained") (meta as Record<string, unknown>).containedAt = now;
  if (status === "notified") (meta as Record<string, unknown>).regulatorNotifiedAt = now;
  (meta as Record<string, unknown>).timeline = timeline;

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET status = $1, metadata = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, JSON.stringify(meta), id]
  );
  return mapRow(getFirstRow(result)!);
}

export async function recordRegulatorNotification(
  tenantId: string,
  breachId: string,
  reportRef: string,
  _performedBy: string
): Promise<BreachRecord> {
  const schema = tenantSchema(tenantId);
  const current = await getBreach(tenantId, breachId);
  const now = new Date().toISOString();
  const meta = { severity: current.severity, discoveredAt: current.discoveredAt, affectedIndividualsCount: current.affectedIndividualsCount, affectedDataCategories: current.affectedDataCategories, regulatorNotificationRequired: current.regulatorNotificationRequired, containedAt: current.containedAt, regulatorNotifiedAt: now, individualsNotifiedAt: current.individualsNotifiedAt, rootCause: current.rootCause, regulatorReportRef: reportRef };

  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(meta), breachId]
  );
  return mapRow(getFirstRow(result)!);
}

export async function listBreaches(
  tenantId: string,
  filters?: { status?: BreachStatus; severity?: BreachSeverity }
): Promise<BreachRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`, `data_subject_email = 'breach@internal'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow).filter(b => !filters?.severity || b.severity === filters.severity);
}

export async function getBreachTimeline(tenantId: string, breachId: string): Promise<BreachTimelineEntry[]> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.privacy_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
