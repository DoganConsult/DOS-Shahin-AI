// ============================================
// Shahin — NCA ECC Self-Assessment Service
// Guided 114-control assessment with domain scoring,
// risk exposure calculation, and multi-format export
// ============================================

import { v4 as uuid } from "uuid";
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import {
  NCA_ECC,
  FrameworkDef as _FrameworkDef,
  DomainDef as _DomainDef,
  SubdomainDef as _SubdomainDef,
  ControlDef as _ControlDef,
} from "../../data/ksa-frameworks";
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
  score: number; // 0-100
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

export interface AssessmentResult {
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

// === Flatten ECC controls into assessment items ===

export function flattenECCControls(): AssessmentItem[] {
  const items: AssessmentItem[] = [];
  for (const domain of NCA_ECC.domains!) {
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

// === Get ECC structure (domains, subdomains, controls) for frontend ===

export function getECCStructure() {
  return {
    instrumentId: NCA_ECC.instrumentId,
    nameEn: NCA_ECC.nameEn,
    nameAr: NCA_ECC.nameAr,
    version: NCA_ECC.version,
    summaryEn: NCA_ECC.summaryEn,
    summaryAr: NCA_ECC.summaryAr,
    domains: NCA_ECC.domains!.map((d) => ({
      id: d.id,
      code: d.code,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      subdomains: d.subdomains.map((s) => ({
        id: s.id,
        code: s.code,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        controls: s.controls.map((c) => ({
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
      totalDomains: NCA_ECC.domains!.length,
      totalSubdomains: NCA_ECC.domains!.reduce(
        (sum, d) => sum + d.subdomains.length,
        0
      ),
      totalControls: NCA_ECC.domains!.reduce(
        (sum, d) =>
          sum + d.subdomains.reduce((s2, sd) => s2 + sd.controls.length, 0),
        0
      ),
    },
  };
}

// === Create new assessment ===

export async function createNCAAssessment(
  tenantId: string,
  data: { title?: string; createdBy: string }
): Promise<{ assessmentId: string }> {
  const schema = tenantSchema(tenantId);
  const assessmentId = uuid().slice(0, 12);
  const title = data.title || `NCA ECC Assessment — ${new Date().toISOString().slice(0, 10)}`;
  const items = flattenECCControls();

  await safeQuery(
    `INSERT INTO "${schema}".nca_assessments
      (assessment_id, title, status, items, created_by, created_at, updated_at)
     VALUES ($1, $2, 'draft', $3, $4, NOW(), NOW())`,
    [assessmentId, title, JSON.stringify(items), data.createdBy]
  );

  return { assessmentId };
}

// === Get assessment ===

export async function getNCAAssessment(
  tenantId: string,
  assessmentId: string
): Promise<AssessmentResult | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".nca_assessments WHERE assessment_id = $1`,
    [assessmentId]
  );

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result)!;
  const items: AssessmentItem[] =
    typeof row.items === "string" ? JSON.parse(row.items) : row.items;

  return buildResult(tenantId, assessmentId, row.title, row.status, row.created_at, row.updated_at, items);
}

// === List assessments ===

export async function listNCAAssessments(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT assessment_id, title, status, created_by, created_at, updated_at
     FROM "${schema}".nca_assessments
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

export async function updateNCAItems(
  tenantId: string,
  assessmentId: string,
  updates: { controlId: string; status: ControlStatus; notes?: string; evidenceIds?: string[] }[]
): Promise<AssessmentResult> {
  const schema = tenantSchema(tenantId);
  const existing = await safeQuery(
    `SELECT * FROM "${schema}".nca_assessments WHERE assessment_id = $1`,
    [assessmentId],
  );
  const row = getFirstRow(existing)!;
  if (!row) throw Object.assign(new Error(`NCA assessment ${assessmentId} not found`), { statusCode: 404 });

  const items: AssessmentItem[] = typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []);
  const updateMap = new Map(updates.map((u) => [u.controlId, u]));

  for (const item of items) {
    const upd = updateMap.get(item.controlId);
    if (upd) {
      if (VALID_STATUSES.includes(upd.status)) item.status = upd.status;
      if (upd.notes !== undefined) item.notes = upd.notes;
      if (upd.evidenceIds !== undefined) item.evidenceIds = upd.evidenceIds;
    }
  }

  await safeQuery(
    `UPDATE "${schema}".nca_assessments SET items = $2::jsonb, updated_at = NOW() WHERE assessment_id = $1`,
    [assessmentId, JSON.stringify(items)],
  );

  return buildResult(tenantId, assessmentId, row.title as string, row.status as string, row.created_at as string, row.updated_at as string, items);
}

// === Delete assessment ===

export async function deleteNCAAssessment(
  tenantId: string,
  assessmentId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".nca_assessments WHERE assessment_id = $1 RETURNING assessment_id`,
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
  for (const domain of NCA_ECC.domains!) {
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
  for (const domain of NCA_ECC.domains!) {
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
  const implemented = items.filter((i) => i.status === "implemented").length;
  const partial = items.filter((i) => i.status === "partially").length;
  const notImpl = items.filter((i) => i.status === "not_implemented").length;
  const na = items.filter((i) => i.status === "not_applicable").length;
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

/**
 * Risk exposure: weighted sum of gaps.
 * critical gap = 4, high gap = 3, medium gap = 2, low gap = 1
 * Normalized to 0–100 where 0 = no gaps, 100 = all critical gaps
 */
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
    // implemented = 0 exposure
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
): AssessmentResult {
  const domainScores = calculateDomainScores(items);
  const subdomainScores = calculateSubdomainScores(items);
  const overallApplicable = items.filter((i) => i.status !== "not_applicable");
  const implemented = overallApplicable.filter((i) => i.status === "implemented").length;
  const partial = overallApplicable.filter((i) => i.status === "partially").length;
  const overallScore =
    overallApplicable.length > 0
      ? Math.round(((implemented * 1.0 + partial * 0.5) / overallApplicable.length) * 100)
      : 0;

  const gaps = items.filter(
    (i) => i.status === "not_implemented" || i.status === "partially"
  );
  const criticalGaps = gaps.filter((i) => i.priority === "critical").length;
  const highGaps = gaps.filter((i) => i.priority === "high").length;

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
      notImplemented: items.filter((i) => i.status === "not_implemented").length,
      notApplicable: items.filter((i) => i.status === "not_applicable").length,
      criticalGaps,
      highGaps,
    },
  };
}

// === Ensure table exists ===

export async function ensureNCATable(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".nca_assessments (
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
