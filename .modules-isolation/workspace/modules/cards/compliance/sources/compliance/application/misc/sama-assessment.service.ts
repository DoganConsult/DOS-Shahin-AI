// ============================================
// Shahin — SAMA CSF Self-Assessment Service
// Guided 95-control assessment with domain scoring,
// risk exposure calculation, and multi-format export
// ============================================

import { v4 as uuid } from "uuid";
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { SAMA_CSF } from "../../data/ksa-frameworks/financial-regulatory/ksa-fw-sama.js";
import { FrameworkDef as _FrameworkDef, DomainDef as _DomainDef, SubdomainDef as _SubdomainDef, ControlDef as _ControlDef } from "../../data/ksa-frameworks";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// === Types ===

export type ControlStatus = "implemented" | "partially" | "not_implemented" | "not_applicable";

export interface AssessmentItem {
  controlId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  priority: string;
  automatable: boolean;
  evidenceTypes: string[];
  domainId: string;
  subdomainId: string;
  status: ControlStatus;
  notes: string;
  evidenceIds: string[];
}

export interface DomainScore {
  domainId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  total: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  score: number;
}

export interface SubdomainScore {
  subdomainId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  domainId: string;
  total: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  score: number;
}

export interface SAMAAssessmentResult {
  assessmentId: string;
  tenantId: string;
  title: string;
  status: "draft" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
  overallScore: number;
  riskExposure: number;
  domainScores: DomainScore[];
  subdomainScores: SubdomainScore[];
  items: AssessmentItem[];
  summary: {
    total: number;
    implemented: number;
    partial: number;
    notImplemented: number;
    notApplicable: number;
    criticalGaps: number;
    highGaps: number;
  };
}

// === Flatten SAMA CSF controls into assessment items ===

export function flattenSAMAControls(): AssessmentItem[] {
  const items: AssessmentItem[] = [];
  for (const domain of SAMA_CSF.domains) {
    for (const subdomain of domain.subdomains) {
      for (const control of subdomain.controls) {
        items.push({
          controlId: control.id,
          code: control.code,
          titleEn: control.titleEn,
          titleAr: control.titleAr,
          descEn: control.descEn,
          descAr: control.descAr,
          priority: control.priority,
          automatable: control.automatable,
          evidenceTypes: control.evidenceTypes,
          domainId: domain.id,
          subdomainId: subdomain.id,
          status: "not_implemented",
          notes: "",
          evidenceIds: [],
        });
      }
    }
  }
  return items;
}

// === Get SAMA CSF structure for frontend ===

export function getSAMAStructure() {
  return {
    instrumentId: SAMA_CSF.instrumentId,
    nameEn: SAMA_CSF.nameEn,
    nameAr: SAMA_CSF.nameAr,
    version: SAMA_CSF.version,
    summaryEn: SAMA_CSF.summaryEn,
    summaryAr: SAMA_CSF.summaryAr,
    domains: SAMA_CSF.domains.map((d: any) => ({
      id: d.id,
      code: d.code,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      subdomains: d.subdomains.map((s: any) => ({
        id: s.id,
        code: s.code,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        controls: s.controls.map((c: any) => ({
          id: c.id,
          code: c.code,
          titleEn: c.titleEn,
          titleAr: c.titleAr,
          descEn: c.descEn,
          descAr: c.descAr,
          priority: c.priority,
          automatable: c.automatable,
          evidenceTypes: c.evidenceTypes,
          mappedTo: c.mappedTo || [],
        })),
      })),
    })),
    stats: {
      totalDomains: SAMA_CSF.domains.length,
      totalSubdomains: SAMA_CSF.domains.reduce(
        (sum: any, d: any) => sum + d.subdomains.length,
        0
      ),
      totalControls: SAMA_CSF.domains.reduce(
        (sum: any, d: any) =>
          sum + d.subdomains.reduce((s2, sd) => s2 + sd.controls.length, 0),
        0
      ),
    },
  };
}

// === Create new SAMA assessment ===

export async function createSAMAAssessment(
  tenantId: string,
  data: { title?: string; createdBy: string }
): Promise<{ assessmentId: string }> {
  const schema = tenantSchema(tenantId);
  const assessmentId = uuid().slice(0, 12);
  const title = data.title || `SAMA CSF Assessment — ${new Date().toISOString().slice(0, 10)}`;
  const items = flattenSAMAControls();

  await safeQuery(
    `INSERT INTO "${schema}".sama_assessments
      (assessment_id, title, status, items, created_by, created_at, updated_at)
     VALUES ($1, $2, 'draft', $3, $4, NOW(), NOW())`,
    [assessmentId, title, JSON.stringify(items), data.createdBy]
  );

  return { assessmentId };
}

// === Get SAMA assessment ===

export async function getSAMAAssessment(
  tenantId: string,
  assessmentId: string
): Promise<SAMAAssessmentResult | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".sama_assessments WHERE assessment_id = $1`,
    [assessmentId]
  );

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result)!;
  const items: AssessmentItem[] =
    typeof row.items === "string" ? JSON.parse(row.items) : row.items;

  return buildResult(tenantId, assessmentId, row.title, row.status, row.created_at, row.updated_at, items);
}

// === List SAMA assessments ===

export async function listSAMAAssessments(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT assessment_id, title, status, created_by, created_at, updated_at
     FROM "${schema}".sama_assessments
     ORDER BY created_at DESC`
  );
  return result.rows.map((r: GenericRow) => ({
    assessmentId: r.assessment_id,
    title: r.title,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// === Update items (batch) ===

const VALID_STATUSES: ControlStatus[] = ["implemented", "partially", "not_implemented", "not_applicable"];

export async function updateSAMAItems(
  tenantId: string,
  assessmentId: string,
  updates: { controlId: string; status: ControlStatus; notes?: string; evidenceIds?: string[] }[]
): Promise<SAMAAssessmentResult> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT * FROM "${schema}".sama_assessments WHERE assessment_id = $1`,
    [assessmentId],
  );
  const row = getFirstRow(existing)!;
  if (!row) throw Object.assign(new Error(`SAMA assessment ${assessmentId} not found`), { statusCode: 404 });

  const items: AssessmentItem[] = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
  const updateMap = new Map(updates.map((u: any) => [u.controlId, u]));

  for (const item of items) {
    const upd = updateMap.get(item.controlId);
    if (upd) {
      if (VALID_STATUSES.includes(upd.status)) item.status = upd.status;
      if (upd.notes !== undefined) item.notes = upd.notes;
      if (upd.evidenceIds !== undefined) item.evidenceIds = upd.evidenceIds;
    }
  }

  await safeQuery(
    `UPDATE "${schema}".sama_assessments SET items = $2::jsonb, updated_at = NOW() WHERE assessment_id = $1`,
    [assessmentId, JSON.stringify(items)],
  );

  return buildResult(tenantId, assessmentId, row.title as string, row.status as string, row.created_at as string, row.updated_at as string, items);
}

// === Delete SAMA assessment ===

export async function deleteSAMAAssessment(
  tenantId: string,
  assessmentId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".sama_assessments WHERE assessment_id = $1 RETURNING assessment_id`,
    [assessmentId]
  );
  return result.rows.length > 0;
}

// === Score Calculation ===

function calculateDomainScores(items: AssessmentItem[]): DomainScore[] {
  const domainMap = new Map<string, AssessmentItem[]>();
  for (const item of items) {
    const arr = domainMap.get(item.domainId) || [];
    arr.push(item);
    domainMap.set(item.domainId, arr);
  }

  const scores: DomainScore[] = [];
  for (const domain of SAMA_CSF.domains) {
    const domainItems = domainMap.get(domain.id) || [];
    scores.push(computeGroupScore(domain.id, domain.code, domain.nameEn, domain.nameAr, domainItems));
  }
  return scores;
}

function calculateSubdomainScores(items: AssessmentItem[]): SubdomainScore[] {
  const sdMap = new Map<string, AssessmentItem[]>();
  for (const item of items) {
    const arr = sdMap.get(item.subdomainId) || [];
    arr.push(item);
    sdMap.set(item.subdomainId, arr);
  }

  const scores: SubdomainScore[] = [];
  for (const domain of SAMA_CSF.domains) {
    for (const sd of domain.subdomains) {
      const sdItems = sdMap.get(sd.id) || [];
      const base = computeGroupScore(sd.id, sd.code, sd.nameEn, sd.nameAr, sdItems);
      scores.push({ ...base, subdomainId: sd.id, domainId: domain.id });
    }
  }
  return scores;
}

function computeGroupScore(
  id: string,
  code: string,
  nameEn: string,
  nameAr: string,
  items: AssessmentItem[]
): DomainScore {
  const implemented = items.filter((i: any) => i.status === "implemented").length;
  const partial = items.filter((i: any) => i.status === "partially").length;
  const notImpl = items.filter((i: any) => i.status === "not_implemented").length;
  const na = items.filter((i: any) => i.status === "not_applicable").length;
  const applicable = items.length - na;
  const score =
    applicable > 0
      ? Math.round(((implemented * 1.0 + partial * 0.5) / applicable) * 100)
      : 100;

  return {
    domainId: id,
    code,
    nameEn,
    nameAr,
    total: items.length,
    implemented,
    partial,
    notImplemented: notImpl,
    notApplicable: na,
    score,
  };
}

function calculateRiskExposure(items: AssessmentItem[]): number {
  const weights: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  let maxExposure = 0;
  let actualExposure = 0;

  for (const item of items) {
    if (item.status === "not_applicable") continue;
    const w = weights[item.priority] || 1;
    maxExposure += w;
    if (item.status === "not_implemented") {
      actualExposure += w;
    } else if (item.status === "partially") {
      actualExposure += w * 0.5;
    }
  }

  return maxExposure > 0 ? Math.round((actualExposure / maxExposure) * 100) : 0;
}

function buildResult(
  tenantId: string,
  assessmentId: string,
  title: string,
  status: string,
  createdAt: string,
  updatedAt: string,
  items: AssessmentItem[]
): SAMAAssessmentResult {
  const domainScores = calculateDomainScores(items);
  const subdomainScores = calculateSubdomainScores(items);
  const overallApplicable = items.filter((i: any) => i.status !== "not_applicable");
  const implemented = overallApplicable.filter((i: any) => i.status === "implemented").length;
  const partial = overallApplicable.filter((i: any) => i.status === "partially").length;
  const overallScore =
    overallApplicable.length > 0
      ? Math.round(((implemented * 1.0 + partial * 0.5) / overallApplicable.length) * 100)
      : 0;

  const gaps = items.filter(
    (i: any) => i.status === "not_implemented" || i.status === "partially"
  );
  const criticalGaps = gaps.filter((i: any) => i.priority === "critical").length;
  const highGaps = gaps.filter((i: any) => i.priority === "high").length;

  return {
    assessmentId,
    tenantId,
    title,

    status: status as string,
    createdAt: typeof createdAt === "string" ? createdAt : new Date(createdAt).toISOString(),
    updatedAt: typeof updatedAt === "string" ? updatedAt : new Date(updatedAt).toISOString(),
    overallScore,
    riskExposure: calculateRiskExposure(items),
    domainScores,
    subdomainScores,
    items,
    summary: {
      total: items.length,
      implemented,
      partial,
      notImplemented: items.filter((i: any) => i.status === "not_implemented").length,
      notApplicable: items.filter((i: any) => i.status === "not_applicable").length,
      criticalGaps,
      highGaps,
    },
  };
}

// === Ensure table exists ===

export async function ensureSAMATable(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".sama_assessments (
      assessment_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      items JSONB NOT NULL DEFAULT '[]',
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
