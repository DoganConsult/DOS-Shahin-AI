// ============================================
// Shahin-Ai — Privacy Data Mapping
// Data flow mapping, processing activities register (ROPA),
// data inventory, cross-border transfer tracking
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type DataFlowStage = "collection" | "processing" | "storage" | "sharing" | "deletion";

export interface DataFlowNode {
  nodeId: string;
  stage: DataFlowStage;
  systemName: string;
  description: string;
  dataCategories: string[];
  location: string;
  isCrossBorder: boolean;
  transferSafeguards?: string;
}

export interface ProcessingActivity {
  id: string;
  tenantId: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataController: string;
  dataProcessor: string | null;
  dataCategories: string[];
  dataSubjectCategories: string[];
  retentionPeriod: string;
  securityMeasures: string[];
  crossBorderTransfers: CrossBorderTransferRecord[];
  dataFlow: DataFlowNode[];
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CrossBorderTransferRecord {
  transferId: string;
  destinationCountry: string;
  recipientOrganization: string;
  safeguard: "adequacy_decision" | "scc" | "bcr" | "derogation" | "none";
  safeguardDocumentRef: string | null;
  assessedAt: string;
}

export interface DataInventoryItem {
  id: string;
  name: string;
  category: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  systemsHolding: string[];
  retentionDays: number;
  legalBasis: string;
}

// === Pure Functions ===

export function classifyDataSensitivity(category: string): DataInventoryItem["sensitivity"] {
  const restricted = ["health", "biometric", "genetic", "racial", "political", "religious", "sexual", "criminal"];
  const confidential = ["financial", "national_id", "passport", "contact", "location"];
  const internal = ["behavioral", "preferences", "employment"];
  if (restricted.some(c => category.toLowerCase().includes(c))) return "restricted";
  if (confidential.some(c => category.toLowerCase().includes(c))) return "confidential";
  if (internal.some(c => category.toLowerCase().includes(c))) return "internal";
  return "public";
}

export function validateDataFlow(nodes: DataFlowNode[]): string[] {
  const errors: string[] = [];
  const stages = nodes.map(n => n.stage);
  if (!stages.includes("collection")) errors.push("Data flow must include a collection stage");
  const crossBorder = nodes.filter(n => n.isCrossBorder);
  for (const node of crossBorder) {
    if (!node.transferSafeguards) {
      errors.push(`Node ${node.nodeId} is cross-border but missing transfer safeguards`);
    }
  }
  return errors;
}

export function computeRetentionRisk(retentionPeriod: string): "low" | "medium" | "high" {
  const lower = retentionPeriod.toLowerCase();
  if (lower.includes("indefinite") || lower.includes("permanent")) return "high";
  if (lower.includes("year") && parseInt(retentionPeriod) > 7) return "medium";
  return "low";
}

// === Row Mapper ===

function mapRow( r: Record<string, unknown>): ProcessingActivity {
  const meta = r.metadata || {};
  return {

    id: r.id,

    tenantId: r.tenant_id,

    name: r.title,

    purpose: meta.purpose || r.description || "",

    legalBasis: meta.legalBasis || "legitimate_interest",

    dataController: meta.dataController || "",

    dataProcessor: meta.dataProcessor || null,

    dataCategories: meta.dataCategories || [],

    dataSubjectCategories: meta.dataSubjectCategories || [],

    retentionPeriod: meta.retentionPeriod || "not_specified",

    securityMeasures: meta.securityMeasures || [],

    crossBorderTransfers: meta.crossBorderTransfers || [],

    dataFlow: meta.dataFlow || [],
    status: r.status === "active" ? "active" : r.status === "archived" ? "archived" : "draft",

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,

    createdBy: r.created_by,
  };
}

// === DB Functions ===

export async function createProcessingActivity(
  tenantId: string,
  data: Omit<ProcessingActivity, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<ProcessingActivity> {
  const schema = tenantSchema(tenantId);
  const metadata = {
    purpose: data.purpose, legalBasis: data.legalBasis,
    dataController: data.dataController, dataProcessor: data.dataProcessor,
    dataCategories: data.dataCategories, dataSubjectCategories: data.dataSubjectCategories,
    retentionPeriod: data.retentionPeriod, securityMeasures: data.securityMeasures,
    crossBorderTransfers: data.crossBorderTransfers, dataFlow: data.dataFlow,
  };

  const result = await safeQuery(
    `INSERT INTO "${schema}".privacy_privacy
      (tenant_id, title, description, status, request_type, data_subject_name,
       data_subject_email, created_by, metadata)
     VALUES ($1,$2,$3,$4,'access','ropa','ropa@internal',$5,$6)
     RETURNING *`,
    [tenantId, data.name, data.purpose, data.status, data.createdBy, JSON.stringify(metadata)]
  );
  return mapRow(getFirstRow(result)!);
}

export async function getProcessingActivity(tenantId: string, id: string): Promise<ProcessingActivity> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
    [tenantId, id],
  );
  const row = getFirstRow(result);
  if (!row) throw new Error('Processing activity not found');
  return mapRow(row as any);
}

export async function listProcessingActivities(
  tenantId: string,
  status?: "draft" | "active" | "archived"
): Promise<ProcessingActivity[]> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`, `request_type = 'access'`, `data_subject_email = 'ropa@internal'`];
  const params: unknown[] = [];

  if (status) { conditions.push(`status = $1`); params.push(status); }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".privacy_privacy WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapRow);
}

export async function updateDataFlow(
  tenantId: string,
  activityId: string,
  dataFlow: DataFlowNode[]
): Promise<ProcessingActivity> {
  const schema = tenantSchema(tenantId);
  const current = await getProcessingActivity(tenantId, activityId);
  const meta = { ...(current as any), dataFlow };
  const result = await safeQuery(
    `UPDATE "${schema}".privacy_privacy SET metadata = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(meta), activityId],
  );
  return mapRow(getFirstRow(result) as any);
}

export async function getCrossBorderTransfers(tenantId: string): Promise<Array<ProcessingActivity & { transferCount: number }>> {
  const activities = await listProcessingActivities(tenantId, "active");
  return activities
    .filter(a => a.crossBorderTransfers.length > 0)
    .map(a => ({ ...a, transferCount: a.crossBorderTransfers.length }));
}

export async function generateRopa(tenantId: string): Promise<{
  generatedAt: string;
  tenantId: string;
  totalActivities: number;
  activeActivities: number;
  crossBorderActivities: number;
  activities: ProcessingActivity[];
}> {
  const all = await listProcessingActivities(tenantId);
  const active = all.filter(a => a.status === "active");
  const crossBorder = active.filter(a => a.crossBorderTransfers.length > 0);

  return {
    generatedAt: new Date().toISOString(),
    tenantId,
    totalActivities: all.length,
    activeActivities: active.length,
    crossBorderActivities: crossBorder.length,
    activities: active,
  };
}
