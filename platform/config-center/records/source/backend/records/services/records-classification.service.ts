// ============================================
// Shahin-Ai — Records Classification Service
// Auto-classification by content type,
// sensitivity labeling, tagging engine,
// classification audit trail
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type Classification = "public" | "internal" | "confidential" | "restricted" | "top_secret";

export interface ClassificationRule {
  ruleId: string;
  name: string;
  recordType: string;
  keywords: string[];
  targetClassification: Classification;
  confidence: number;
  isActive: boolean;
  createdAt: string;
}

export interface ClassificationSuggestion {
  suggestedClassification: Classification;
  confidence: number;
  matchedRules: string[];
  reason: string;
}

export interface ClassificationAuditEntry {
  auditId: string;
  recordId: string;
  fromClassification: Classification | null;
  toClassification: Classification;
  changedBy: string;
  isAutomatic: boolean;
  reason: string | null;
  changedAt: string;
}

export interface SensitivityLabel {
  labelId: string;
  name: string;
  classification: Classification;
  colorCode: string;
  description: string;
  isActive: boolean;
}

// === Pure Functions ===

export function autoClassifyByKeywords(
  title: string,
  description: string,
  rules: ClassificationRule[]
): ClassificationSuggestion {
  const text = `${title} ${description}`.toLowerCase();
  const matched: { rule: ClassificationRule; matchCount: number }[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const matchCount = rule.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    if (matchCount > 0) matched.push({ rule, matchCount });
  }

  if (matched.length === 0) {
    return { suggestedClassification: "internal", confidence: 0.5, matchedRules: [], reason: "default fallback" };
  }

  matched.sort((a, b) => {
    if (b.rule.confidence !== a.rule.confidence) return b.rule.confidence - a.rule.confidence;
    return b.matchCount - a.matchCount;
  });

  const best = matched[0];
  return {
    suggestedClassification: best.rule.targetClassification,
    confidence: best.rule.confidence * (best.matchCount / best.rule.keywords.length),
    matchedRules: matched.map(m => m.rule.ruleId),
    reason: `Matched rule: ${best.rule.name} (${best.matchCount} keywords)`,
  };
}

export function classifyByRecordType(recordType: string): Classification {
  const defaults: Record<string, Classification> = {
    policy: "internal",
    evidence: "confidential",
    audit_report: "restricted",
    contract: "confidential",
    procedure: "internal",
    training: "internal",
    incident: "restricted",
    other: "internal",
  };
  return defaults[recordType] ?? "internal";
}

export function sanitizeTags(rawTags: string[]): string[] {
  return rawTags
    .map(t => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
    .filter(t => t.length > 0 && t.length <= 50);
}

// === DB-backed Functions ===

function mapRule( r: Record<string, unknown>): ClassificationRule {
  return {

    ruleId: r.rule_id,

    name: r.name,

    recordType: r.record_type,

    keywords: r.keywords || [],

    targetClassification: r.target_classification,
    confidence: parseFloat((r as any).confidence) || 0.5,

    isActive: r.is_active,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getClassificationRules(tenantId: string): Promise<ClassificationRule[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".record_classification_rules WHERE is_active = true ORDER BY confidence DESC`
  );
  return result.rows.map(mapRule);
}

export async function createClassificationRule(
  tenantId: string,
  data: {
    name: string;
    recordType: string;
    keywords: string[];
    targetClassification: Classification;
    confidence?: number;
  }
): Promise<ClassificationRule> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".record_classification_rules
      (name, record_type, keywords, target_classification, confidence, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [data.name, data.recordType, JSON.stringify(data.keywords), data.targetClassification, data.confidence ?? 0.8]
  );
  return mapRule(getFirstRow(result)!);
}

export async function suggestClassification(
  tenantId: string,
  title: string,
  description: string,
  recordType: string
): Promise<ClassificationSuggestion> {
  const rules = await getClassificationRules(tenantId);
  const typeFiltered = rules.filter(r => r.recordType === recordType || r.recordType === "*");
  if (typeFiltered.length > 0) {
    return autoClassifyByKeywords(title, description, typeFiltered);
  }
  return {
    suggestedClassification: classifyByRecordType(recordType),
    confidence: 0.7,
    matchedRules: [],
    reason: "record type default classification",
  };
}

export async function applyClassification(
  tenantId: string,
  recordId: string,
  classification: Classification,
  changedBy: string,
  isAutomatic = false,
  reason?: string
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.records_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function applyTags(
  tenantId: string,
  recordId: string,
  tags: string[]
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const sanitized = sanitizeTags(tags);
  await safeQuery(
    `UPDATE "${schema}".records_records SET tags = $1, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(sanitized), recordId]
  );
}

export async function getClassificationAuditTrail(
  tenantId: string,
  recordId: string
): Promise<ClassificationAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".record_classification_audit WHERE record_id = $1 ORDER BY changed_at DESC`,
    [recordId]
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    auditId: r.audit_id,
    recordId: r.record_id,
    fromClassification: r.from_classification || null,
    toClassification: r.to_classification,
    changedBy: r.changed_by,
    isAutomatic: r.is_automatic || false,
    reason: r.reason || null,

    changedAt: r.changed_at?.toISOString?.() || r.changed_at,
  }));
}

export async function getSensitivityLabels(tenantId: string): Promise<SensitivityLabel[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".record_sensitivity_labels WHERE is_active = true ORDER BY classification`
  );

  return result.rows.map(( r: Record<string, unknown>) => ({
    labelId: r.label_id,
    name: r.name,
    classification: r.classification,
    colorCode: r.color_code || "#000000",
    description: r.description || "",
    isActive: r.is_active,
  }));
}
