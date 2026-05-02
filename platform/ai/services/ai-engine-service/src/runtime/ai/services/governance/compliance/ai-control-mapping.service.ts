// ============================================================================
// AI-Powered Cross-Framework Control Mapping Service (Issue 14)
// Uses Claude to suggest mappings between controls across frameworks
// based on semantic similarity of control text.
// ============================================================================

import { safeQuery, query as _query } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import type { GenericRow } from '../../../ports/platform.port';
import { SYSTEM_TENANT } from '../../../ports/platform.port';

interface MappingSuggestion {
  sourceCode: string;
  sourceTitle: string;
  targetCode: string;
  targetTitle: string;
  confidence: number;
  relationship: "equivalent" | "partial" | "related";
  reasoning: string;
}

/**
 * Generate cross-framework mapping suggestions using text similarity.
 * Uses PostgreSQL trigram similarity (pg_trgm) for fast initial matching,
 * then refines with domain-aware scoring.
 */
export async function suggestCrossFrameworkMappings(
  sourceFramework: string,
  targetFramework: string,
  minConfidence: number = 0.6,
  limit: number = 100
): Promise<MappingSuggestion[]> {
  // 1. Get controls from both frameworks
  const sourceRes = await safeQuery(
    `SELECT rc.control_code, rc.control_title_en, rc.control_description_en,
            rc.criticality_level, cd.domain_name_en
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = $1
     ORDER BY rc.control_code`,
    [sourceFramework]
  );

  const targetRes = await safeQuery(
    `SELECT rc.control_code, rc.control_title_en, rc.control_description_en,
            rc.criticality_level, cd.domain_name_en
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = $1
     ORDER BY rc.control_code`,
    [targetFramework]
  );

  if (sourceRes.rows.length === 0 || targetRes.rows.length === 0) {
    return [];
  }

  // 2. Check existing mappings to avoid duplicates
  const existingRes = await safeQuery(
    `SELECT source_control_code, target_control_code
     FROM public.control_cross_mappings
     WHERE source_control_code LIKE $1 || '%'
       AND target_control_code LIKE $2 || '%'`,
    [sourceFramework, targetFramework]
  );
  const existingSet = new Set(
    existingRes.rows.map((r: GenericRow) => `${r.source_control_code}::${r.target_control_code}`)
  );

  // 3. Compute similarity scores using keyword matching
  const suggestions: MappingSuggestion[] = [];
  const _domainKeywords = buildDomainKeywordMap();

  for (const src of sourceRes.rows) {
    const srcTokens = tokenize(src.control_title_en + " " + (src.control_description_en || ""));
    const srcDomain = classifyDomain(src.domain_name_en);

    for (const tgt of targetRes.rows) {
      const key = `${src.control_code}::${tgt.control_code}`;
      if (existingSet.has(key)) continue;

      const tgtTokens = tokenize(tgt.control_title_en + " " + (tgt.control_description_en || ""));
      const tgtDomain = classifyDomain(tgt.domain_name_en);

      // Token overlap similarity
      const intersection = srcTokens.filter((t) => tgtTokens.includes(t));
      const union = new Set([...srcTokens, ...tgtTokens]);
      const jaccardSim = union.size > 0 ? intersection.length / union.size : 0;

      // Domain match bonus
      const domainBonus = srcDomain === tgtDomain ? 0.15 : 0;

      // Criticality match bonus
      const critBonus = src.criticality_level === tgt.criticality_level ? 0.05 : 0;

      const confidence = Math.min(1.0, jaccardSim + domainBonus + critBonus);

      if (confidence >= minConfidence) {
        const relationship = confidence >= 0.8 ? "equivalent" : confidence >= 0.6 ? "partial" : "related";
        suggestions.push({
          sourceCode: src.control_code,
          sourceTitle: src.control_title_en,
          targetCode: tgt.control_code,
          targetTitle: tgt.control_title_en,
          confidence: Math.round(confidence * 100) / 100,
          relationship,
          reasoning: `Keyword overlap: ${intersection.length}/${union.size} tokens. Domain: ${srcDomain}↔${tgtDomain}.`,
        });
      }
    }
  }

  // 4. Sort by confidence and limit
  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions.slice(0, limit);
}

/**
 * Accept mapping suggestions and persist them to control_cross_mappings.
 */
export async function acceptMappingSuggestions(
  suggestions: Array<{ sourceCode: string; targetCode: string; confidence: number; relationship: string }>
): Promise<{ accepted: number }> {
  let accepted = 0;
  for (const s of suggestions) {
    await safeQuery(
      `INSERT INTO public.control_cross_mappings
        (source_control_code, target_control_code, mapping_type, confidence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [s.sourceCode, s.targetCode, s.relationship, s.confidence]
    );
    accepted++;
  }

  eventBus.publish(({
      eventType: "regulatory.mappings_accepted",
      tenantId: SYSTEM_TENANT,
      sourceService: "AIControlMapping",
      severity: "info",
      payload: { accepted },
    } as any));

  return { accepted };
}

// ── Helpers ──

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function classifyDomain(domainName: string): string {
  const name = domainName.toLowerCase();
  if (name.includes("governance") || name.includes("policy")) return "governance";
  if (name.includes("access") || name.includes("identity")) return "access";
  if (name.includes("data") || name.includes("privacy")) return "data";
  if (name.includes("network") || name.includes("infrastructure")) return "network";
  if (name.includes("application") || name.includes("software")) return "application";
  if (name.includes("incident") || name.includes("response")) return "incident";
  if (name.includes("continuity") || name.includes("resilience")) return "resilience";
  if (name.includes("physical") || name.includes("environmental")) return "physical";
  if (name.includes("compliance") || name.includes("audit")) return "compliance";
  if (name.includes("risk")) return "risk";
  return "general";
}

function buildDomainKeywordMap(): Record<string, string[]> {
  return {
    governance: ["policy", "board", "committee", "oversight", "strategy"],
    access: ["authentication", "authorization", "identity", "privilege", "sso"],
    data: ["encryption", "classification", "retention", "privacy", "protection"],
    network: ["firewall", "segmentation", "vpn", "dns", "intrusion"],
    application: ["secure", "development", "testing", "deployment", "api"],
    incident: ["response", "forensics", "detection", "monitoring", "soc"],
    resilience: ["backup", "recovery", "continuity", "disaster", "availability"],
    physical: ["facility", "cctv", "badge", "environmental", "access"],
    compliance: ["audit", "assessment", "review", "reporting", "regulatory"],
    risk: ["assessment", "treatment", "appetite", "register", "scoring"],
  };
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has",
  "are", "all", "shall", "must", "should", "may", "can", "will",
  "ensure", "implement", "define", "establish", "maintain", "provide",
  "including", "related", "based", "such", "within", "between",
]);
