import { logger } from '../ports/logger.port';
// ============================================
// KSA Cross-Framework Mapping Service
// DB-driven, AI-first control mapping across Saudi Arabia
// regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, NDMO, CITC)
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { claudeJSON } from '../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

// ------------------------------------------------------------------
// Interfaces
// ------------------------------------------------------------------

export interface MappingDetail {
  mappingId: string;
  sourceFramework: string;
  sourceControlId: string;
  sourceControlCode: string;
  sourceControlTitle: string;
  targetFramework: string;
  targetControlId: string;
  targetControlCode: string;
  targetControlTitle: string;
  mappingStrength: 'exact' | 'strong' | 'partial' | 'weak';
  mappingRationale: string;
  commonDomain: string | null;
  commonThemes: string[];
}

export interface OverlapCell {
  frameworkA: string;
  frameworkB: string;
  overlapPercentage: number;
  mappedCount: number;
}

export interface CrossFrameworkMappingsResult {
  mappings: MappingDetail[];
  overlapMatrix: OverlapCell[];
  totalMappedControls: number;
  unmappedControls: number;
}

export interface FrameworkOverlapResult {
  overlapPercentage: number;
  exactMatches: number;
  partialMatches: number;
  uniqueToA: number;
  uniqueToB: number;
  mappingDetails: MappingDetail[];
}

export interface ControlEquivalence {
  equivalentControlId: string;
  equivalentControlCode: string;
  equivalentControlTitle: string;
  frameworkCode: string;
  mappingStrength: 'exact' | 'strong' | 'partial' | 'weak';
  confidence: number; // 0-100
}

export interface ControlEquivalencesResult {
  equivalences: ControlEquivalence[];
  complianceImpact: string;
}

// ------------------------------------------------------------------
// getCrossFrameworkMappings
// ------------------------------------------------------------------

/**
 * Return all cross-framework control mappings for a tenant.
 * Reads from the tenant-scoped `cross_framework_mappings` table first;
 * if no rows exist, queries the public `regulatory_controls` catalog and
 * uses Claude AI to generate semantic mappings, then persists them.
 */
export async function getCrossFrameworkMappings(
  tenantId: string,
): Promise<CrossFrameworkMappingsResult> {
  const schema = tenantSchema(tenantId);

  try {
    // ---- 1. Try existing tenant-scoped mappings ----
    const existingResult = await safeQuery(
      `SELECT
         mapping_id, source_framework, source_control_id, source_control_code,
         source_control_title, target_framework, target_control_id,
         target_control_code, target_control_title, mapping_strength,
         mapping_rationale, common_domain, common_themes
       FROM "${schema}".cross_framework_mappings
       ORDER BY source_framework, source_control_code`,
    );

    let mappings: MappingDetail[];

    if (existingResult.rows.length > 0) {
      mappings = existingResult.rows.map(rowToMappingDetail);
    } else {
      // ---- 2. Attempt AI-generated mappings from public catalog ----
      mappings = await generateMappingsFromCatalog(tenantId, schema);
    }

    // ---- 3. Build overlap matrix ----
    const overlapMatrix = buildOverlapMatrix(mappings);

    // ---- 4. Compute unmapped controls ----
    const allControlsResult = await safeQuery(
      `SELECT COUNT(DISTINCT control_id)::int AS total
       FROM "${schema}".controls
       WHERE deleted_at IS NULL`,
    );
    const totalTenantControls = allControlsResult.rows[0]?.total || 0;

    const mappedControlIds = new Set<string>();
    for (const m of mappings) {
      mappedControlIds.add(m.sourceControlId);
      mappedControlIds.add(m.targetControlId);
    }

    return {
      mappings,
      overlapMatrix,
      totalMappedControls: mappedControlIds.size,
      unmappedControls: Math.max(0, totalTenantControls - mappedControlIds.size),
    };
  } catch (err: unknown) {
    logger.error(`[KsaCrossFramework] getCrossFrameworkMappings failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

// ------------------------------------------------------------------
// computeFrameworkOverlap
// ------------------------------------------------------------------

/**
 * Compute pairwise overlap between two KSA frameworks for a tenant.
 * Queries existing mappings; if insufficient, generates them with AI.
 */
export async function computeFrameworkOverlap(
  tenantId: string,
  frameworkA: string,
  frameworkB: string,
): Promise<FrameworkOverlapResult> {
  const schema = tenantSchema(tenantId);

  try {
    // ---- 1. Get existing mappings for the pair ----
    const pairResult = await safeQuery(
      `SELECT
         mapping_id, source_framework, source_control_id, source_control_code,
         source_control_title, target_framework, target_control_id,
         target_control_code, target_control_title, mapping_strength,
         mapping_rationale, common_domain, common_themes
       FROM "${schema}".cross_framework_mappings
       WHERE (source_framework = $1 AND target_framework = $2)
          OR (source_framework = $2 AND target_framework = $1)
       ORDER BY mapping_strength`,
      [frameworkA, frameworkB],
    );

    let mappingDetails: MappingDetail[];

    if (pairResult.rows.length > 0) {
      mappingDetails = pairResult.rows.map(rowToMappingDetail);
    } else {
      // Generate on-demand for this pair using AI
      mappingDetails = await generatePairMappings(tenantId, schema, frameworkA, frameworkB);
    }

    // ---- 2. Count controls per framework ----
    const countA = await getFrameworkControlCount(schema, frameworkA);
    const countB = await getFrameworkControlCount(schema, frameworkB);

    // ---- 3. Calculate overlap statistics ----
    const exactMatches = mappingDetails.filter(
      m => m.mappingStrength === 'exact',
    ).length;
    const partialMatches = mappingDetails.filter(
      m => m.mappingStrength === 'partial' || m.mappingStrength === 'strong',
    ).length;

    // Unique controls in A not mapped to B
    const mappedFromA = new Set(
      mappingDetails
        .filter(m => m.sourceFramework === frameworkA)
        .map(m => m.sourceControlId),
    );
    const mappedFromB = new Set(
      mappingDetails
        .filter(m => m.sourceFramework === frameworkB || m.targetFramework === frameworkB)
        .map(m => m.sourceFramework === frameworkB ? m.sourceControlId : m.targetControlId),
    );

    const uniqueToA = Math.max(0, countA - mappedFromA.size);
    const uniqueToB = Math.max(0, countB - mappedFromB.size);

    const maxControls = Math.max(countA, countB, 1);
    const overlapPercentage = Math.round(
      (mappingDetails.length / maxControls) * 10000,
    ) / 100;

    // ---- 4. Use AI to validate and explain mapping if data is small enough ----
    if (mappingDetails.length > 0 && mappingDetails.length <= 20) {
      try {
        const aiValidation = await claudeJSON<{ validatedMappings: Array<{ sourceControlCode: string; isValid: boolean; explanation: string }> }>({
          tenantId,
          agentId: 'ksa-cross-framework',
          decisionType: 'mapping_validation',
          systemPrompt: `You are a Saudi Arabia regulatory compliance expert. Validate the following cross-framework control mappings between ${frameworkA} and ${frameworkB}. For each mapping, confirm if it is valid and provide a brief explanation. Respond as JSON: { "validatedMappings": [{ "sourceControlCode": "...", "isValid": true/false, "explanation": "..." }] }`,
          userMessage: JSON.stringify(mappingDetails.slice(0, 20)),
          maxTokens: 2048,
          temperature: 0.3,
        });

        // Enrich mapping rationales with AI explanations
        if (aiValidation.validatedMappings) {
          const explanationMap = new Map<string, string>();
          for (const v of aiValidation.validatedMappings) {
            if (v.explanation) {
              explanationMap.set(v.sourceControlCode, v.explanation);
            }
          }
          for (const m of mappingDetails) {
            const explanation = explanationMap.get(m.sourceControlCode);
            if (explanation) {
              m.mappingRationale = explanation;
            }
          }
        }
      } catch {
        // AI validation is best-effort
      }
    }

    return {
      overlapPercentage: Math.min(overlapPercentage, 100),
      exactMatches,
      partialMatches,
      uniqueToA,
      uniqueToB,
      mappingDetails,
    };
  } catch (err: unknown) {
    logger.error(`[KsaCrossFramework] computeFrameworkOverlap failed: ${toErrorMessage(err)}`);
    throw err;
  }
}

// ------------------------------------------------------------------
// getControlEquivalences
// ------------------------------------------------------------------

/**
 * Find all equivalent controls across KSA frameworks for a given control.
 * Searches both directions (source and target) in the mapping table.
 */
export async function getControlEquivalences(
  tenantId: string,
  controlId: string,
): Promise<ControlEquivalencesResult> {
  const schema = tenantSchema(tenantId);

  try {
    // ---- 1. Search mappings where this control is source or target ----
    const result = await safeQuery(
      `SELECT
         source_framework, source_control_id, source_control_code, source_control_title,
         target_framework, target_control_id, target_control_code, target_control_title,
         mapping_strength
       FROM "${schema}".cross_framework_mappings
       WHERE source_control_id = $1 OR target_control_id = $1`,
      [controlId],
    );

    if (result.rows.length === 0) {
      // No pre-computed mappings; try AI-based equivalence lookup
      return await findEquivalencesWithAi(tenantId, schema, controlId);
    }

    // ---- 2. Build equivalences from both directions ----
    const equivalences: ControlEquivalence[] = [];
    for (const row of result.rows) {
      const isSource = row.source_control_id === controlId;
      equivalences.push({
        equivalentControlId: isSource ? row.target_control_id : row.source_control_id,
        equivalentControlCode: isSource ? row.target_control_code : row.source_control_code,
        equivalentControlTitle: isSource ? row.target_control_title : row.source_control_title,
        frameworkCode: isSource ? row.target_framework : row.source_framework,
        mappingStrength: row.mapping_strength,
        confidence: strengthToConfidence(row.mapping_strength),
      });
    }

    // ---- 3. Compute compliance impact description ----
    const impactFrameworks = [...new Set(equivalences.map(e => e.frameworkCode))];
    const complianceImpact = impactFrameworks.length > 0
      ? `Implementing this control contributes to compliance across ${impactFrameworks.length} framework(s): ${impactFrameworks.join(', ')}.`
      : 'No cross-framework impact detected.';

    return { equivalences, complianceImpact };
  } catch (err: unknown) {
    logger.error(`[KsaCrossFramework] getControlEquivalences failed: ${toErrorMessage(err)}`);
    return { equivalences: [], complianceImpact: 'Unable to determine cross-framework impact.' };
  }
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

/** Convert a DB row to the MappingDetail interface */
function rowToMappingDetail(row: GenericRow): MappingDetail {
  return {
    mappingId: row.mapping_id,
    sourceFramework: row.source_framework,
    sourceControlId: row.source_control_id,
    sourceControlCode: row.source_control_code || '',
    sourceControlTitle: row.source_control_title || '',
    targetFramework: row.target_framework,
    targetControlId: row.target_control_id,
    targetControlCode: row.target_control_code || '',
    targetControlTitle: row.target_control_title || '',
    mappingStrength: row.mapping_strength,
    mappingRationale: row.mapping_rationale || '',
    commonDomain: row.common_domain || null,
    commonThemes: row.common_themes || [],
  };
}

/** Map strength label to a 0-100 confidence value */
function strengthToConfidence(strength: string): number {
  switch (strength) {
    case 'exact':   return 95;
    case 'strong':  return 80;
    case 'partial': return 55;
    case 'weak':    return 30;
    default:        return 0;
  }
}

/** Count controls in a framework from the tenant schema */
async function getFrameworkControlCount(schema: string, frameworkCode: string): Promise<number> {
  const result = await safeQuery(
    `SELECT COUNT(*)::int AS cnt
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL`,
    [frameworkCode],
  );
  return result.rows[0]?.cnt || 0;
}

/** Build an overlap matrix across all frameworks present in the mappings */
function buildOverlapMatrix(mappings: MappingDetail[]): OverlapCell[] {
  // Collect all unique framework codes
  const frameworkSet = new Set<string>();
  for (const m of mappings) {
    frameworkSet.add(m.sourceFramework);
    frameworkSet.add(m.targetFramework);
  }
  const frameworks = Array.from(frameworkSet).sort();

  // Count mappings per pair
  const pairCounts = new Map<string, number>();
  for (const m of mappings) {
    const key = [m.sourceFramework, m.targetFramework].sort().join('|');
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  // Count total controls per framework referenced in mappings
  const controlsPerFw = new Map<string, Set<string>>();
  for (const m of mappings) {
    if (!controlsPerFw.has(m.sourceFramework)) controlsPerFw.set(m.sourceFramework, new Set());
    if (!controlsPerFw.has(m.targetFramework)) controlsPerFw.set(m.targetFramework, new Set());
    controlsPerFw.get(m.sourceFramework)!.add(m.sourceControlId);
    controlsPerFw.get(m.targetFramework)!.add(m.targetControlId);
  }

  const matrix: OverlapCell[] = [];
  for (let i = 0; i < frameworks.length; i++) {
    for (let j = i + 1; j < frameworks.length; j++) {
      const key = [frameworks[i], frameworks[j]].sort().join('|');
      const mappedCount = pairCounts.get(key) || 0;
      const maxControls = Math.max(
        controlsPerFw.get(frameworks[i])?.size || 0,
        controlsPerFw.get(frameworks[j])?.size || 0,
        1,
      );
      matrix.push({
        frameworkA: frameworks[i],
        frameworkB: frameworks[j],
        overlapPercentage: Math.round((mappedCount / maxControls) * 10000) / 100,
        mappedCount,
      });
    }
  }

  return matrix;
}

/**
 * Generate cross-framework mappings from the public regulatory_controls
 * catalog using AI semantic matching, then persist to tenant schema.
 */
async function generateMappingsFromCatalog(
  tenantId: string,
  schema: string,
): Promise<MappingDetail[]> {
  // Fetch controls from the public catalog grouped by framework
  const catalogResult = await safeQuery(
    `SELECT rc.id, rc.control_code, rc.control_title_en, rc.control_description_en,
            rf.framework_code
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     JOIN public.regulatory_frameworks rf ON rf.framework_code = cd.framework_code
     WHERE rf.is_active = true
     ORDER BY rf.framework_code, rc.control_code
     LIMIT 500`,
  );

  if (catalogResult.rows.length === 0) {
    return [];
  }

  // Group controls by framework
  const byFramework = new Map<string, Array<{ id: string; code: string; title: string; description: string }>>();
  for (const row of catalogResult.rows) {
    const fw = row.framework_code;
    if (!byFramework.has(fw)) byFramework.set(fw, []);
    byFramework.get(fw)!.push({
      id: row.id,
      code: row.control_code,
      title: row.control_title_en,
      description: (row.control_description_en || '').slice(0, 200),
    });
  }

  const frameworks = Array.from(byFramework.keys());
  if (frameworks.length < 2) return [];

  // Generate mappings for each framework pair using AI
  const allMappings: MappingDetail[] = [];

  for (let i = 0; i < frameworks.length; i++) {
    for (let j = i + 1; j < frameworks.length; j++) {
      const fwA = frameworks[i];
      const fwB = frameworks[j];
      const controlsA = byFramework.get(fwA)!.slice(0, 50);
      const controlsB = byFramework.get(fwB)!.slice(0, 50);

      try {
        const aiMappings = await claudeJSON<{
          mappings: Array<{
            sourceCode: string;
            targetCode: string;
            strength: 'exact' | 'strong' | 'partial' | 'weak';
            rationale: string;
            domain: string;
            themes: string[];
          }>;
        }>({
          tenantId,
          agentId: 'ksa-cross-framework-generator',
          decisionType: 'cross_framework_mapping',
          systemPrompt: `You are a Saudi Arabia regulatory compliance expert. Map semantically equivalent controls between ${fwA} and ${fwB}. For each mapping provide strength (exact/strong/partial/weak), a brief rationale, the common domain, and themes. Only include mappings with at least partial overlap. Respond as JSON: { "mappings": [{ "sourceCode": "...", "targetCode": "...", "strength": "...", "rationale": "...", "domain": "...", "themes": ["..."] }] }`,
          userMessage: JSON.stringify({
            frameworkA: { code: fwA, controls: controlsA },
            frameworkB: { code: fwB, controls: controlsB },
          }),
          maxTokens: 4096,
          temperature: 0.2,
        });

        if (aiMappings.mappings) {
          // Build lookup maps for quick ID resolution
          const aMap = new Map(controlsA.map(c => [c.code, c]));
          const bMap = new Map(controlsB.map(c => [c.code, c]));

          for (const m of aiMappings.mappings) {
            const srcCtrl = aMap.get(m.sourceCode);
            const tgtCtrl = bMap.get(m.targetCode);
            if (!srcCtrl || !tgtCtrl) continue;

            allMappings.push({
              mappingId: '', // will be set by DB insert
              sourceFramework: fwA,
              sourceControlId: srcCtrl.id,
              sourceControlCode: srcCtrl.code,
              sourceControlTitle: srcCtrl.title,
              targetFramework: fwB,
              targetControlId: tgtCtrl.id,
              targetControlCode: tgtCtrl.code,
              targetControlTitle: tgtCtrl.title,
              mappingStrength: m.strength,
              mappingRationale: m.rationale,
              commonDomain: m.domain || null,
              commonThemes: m.themes || [],
            });
          }
        }
      } catch (aiErr) {
        logger.warn(`[KsaCrossFramework] AI mapping for ${fwA}-${fwB} failed: ${toErrorMessage(aiErr)}`);
        // Continue with keyword-based fallback for this pair
        const keywordMappings = generateKeywordMappings(fwA, controlsA, fwB, controlsB);
        allMappings.push(...keywordMappings);
      }
    }
  }

  // Persist generated mappings to tenant schema
  await persistMappings(schema, tenantId, allMappings);

  return allMappings;
}

/**
 * Generate pairwise mappings between two specific frameworks using AI,
 * falling back to keyword matching.
 */
async function generatePairMappings(
  tenantId: string,
  schema: string,
  frameworkA: string,
  frameworkB: string,
): Promise<MappingDetail[]> {
  // Fetch controls for both frameworks from the tenant schema
  const controlsAResult = await safeQuery(
    `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY control_id
     LIMIT 100`,
    [frameworkA],
  );
  const controlsBResult = await safeQuery(
    `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL
     ORDER BY control_id
     LIMIT 100`,
    [frameworkB],
  );

  if (controlsAResult.rows.length === 0 || controlsBResult.rows.length === 0) {
    return [];
  }

  const controlsA = controlsAResult.rows.map((r: GenericRow) => ({
    id: r.control_id, code: r.control_id, title: r.title, description: (r.description || '').slice(0, 200),
  }));
  const controlsB = controlsBResult.rows.map((r: GenericRow) => ({
    id: r.control_id, code: r.control_id, title: r.title, description: (r.description || '').slice(0, 200),
  }));

  try {
    const aiMappings = await claudeJSON<{
      mappings: Array<{
        sourceCode: string;
        targetCode: string;
        strength: 'exact' | 'strong' | 'partial' | 'weak';
        rationale: string;
        domain: string;
        themes: string[];
      }>;
    }>({
      tenantId,
      agentId: 'ksa-cross-framework-pair',
      decisionType: 'cross_framework_pair_mapping',
      systemPrompt: `You are a Saudi Arabia regulatory compliance expert. Map semantically equivalent controls between ${frameworkA} and ${frameworkB}. For each mapping provide strength (exact/strong/partial/weak), rationale, common domain, and themes. Only include at least partial overlap. Respond as JSON: { "mappings": [{ "sourceCode": "...", "targetCode": "...", "strength": "...", "rationale": "...", "domain": "...", "themes": ["..."] }] }`,
      userMessage: JSON.stringify({
        frameworkA: { code: frameworkA, controls: controlsA.slice(0, 50) },
        frameworkB: { code: frameworkB, controls: controlsB.slice(0, 50) },
      }),
      maxTokens: 4096,
      temperature: 0.2,
    });

    const result: MappingDetail[] = [];
    if (aiMappings.mappings) {
      const aMap = new Map(controlsA.map(c => [c.code, c]));
      const bMap = new Map(controlsB.map(c => [c.code, c]));

      for (const m of aiMappings.mappings) {
        const srcCtrl = aMap.get(m.sourceCode);
        const tgtCtrl = bMap.get(m.targetCode);
        if (!srcCtrl || !tgtCtrl) continue;

        result.push({
          mappingId: '',
          sourceFramework: frameworkA,
          sourceControlId: srcCtrl.id,
          sourceControlCode: srcCtrl.code,
          sourceControlTitle: srcCtrl.title,
          targetFramework: frameworkB,
          targetControlId: tgtCtrl.id,
          targetControlCode: tgtCtrl.code,
          targetControlTitle: tgtCtrl.title,
          mappingStrength: m.strength,
          mappingRationale: m.rationale,
          commonDomain: m.domain || null,
          commonThemes: m.themes || [],
        });
      }
    }

    // Persist for future reuse
    await persistMappings(schema, tenantId, result);
    return result;
  } catch {
    // Keyword-based fallback
    const fallback = generateKeywordMappings(frameworkA, controlsA, frameworkB, controlsB);
    await persistMappings(schema, tenantId, fallback);
    return fallback;
  }
}

/**
 * Keyword-based mapping fallback when AI is unavailable.
 * Uses Jaccard similarity on control titles / descriptions.
 */
function generateKeywordMappings(
  fwA: string,
  controlsA: Array<{ id: string; code: string; title: string; description: string }>,
  fwB: string,
  controlsB: Array<{ id: string; code: string; title: string; description: string }>,
): MappingDetail[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'be', 'has', 'have', 'shall', 'must',
    'should', 'may', 'can', 'will', 'all', 'from', 'that', 'this', 'not',
  ]);

  function tokenize(text: string): Set<string> {
    return new Set(
      text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w)),
    );
  }

  function jaccard(a: Set<string>, b: Set<string>): number {
    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  const mappings: MappingDetail[] = [];

  for (const cA of controlsA) {
    const tokensA = tokenize(cA.title + ' ' + cA.description);
    let bestScore = 0;
    let bestCtrl: (typeof controlsB)[0] | null = null;

    for (const cB of controlsB) {
      const tokensB = tokenize(cB.title + ' ' + cB.description);
      const score = jaccard(tokensA, tokensB);
      if (score > bestScore) {
        bestScore = score;
        bestCtrl = cB;
      }
    }

    if (bestCtrl && bestScore >= 0.25) {
      let strength: 'exact' | 'strong' | 'partial' | 'weak';
      if (bestScore >= 0.8) strength = 'exact';
      else if (bestScore >= 0.6) strength = 'strong';
      else if (bestScore >= 0.4) strength = 'partial';
      else strength = 'weak';

      mappings.push({
        mappingId: '',
        sourceFramework: fwA,
        sourceControlId: cA.id,
        sourceControlCode: cA.code,
        sourceControlTitle: cA.title,
        targetFramework: fwB,
        targetControlId: bestCtrl.id,
        targetControlCode: bestCtrl.code,
        targetControlTitle: bestCtrl.title,
        mappingStrength: strength,
        mappingRationale: `Keyword similarity score: ${Math.round(bestScore * 100)}%`,
        commonDomain: null,
        commonThemes: [],
      });
    }
  }

  return mappings;
}

/** Persist mappings to the tenant's cross_framework_mappings table */
async function persistMappings(
  schema: string,
  tenantId: string,
  mappings: MappingDetail[],
): Promise<void> {
  if (mappings.length === 0) return;

  try {
    for (const m of mappings) {
      const result = await safeQuery(
        `INSERT INTO "${schema}".cross_framework_mappings
           (tenant_id, source_framework, source_control_id, source_control_code,
            source_control_title, target_framework, target_control_id, target_control_code,
            target_control_title, mapping_strength, mapping_rationale,
            common_domain, common_themes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT DO NOTHING
         RETURNING mapping_id`,
        [
          tenantId,
          m.sourceFramework,
          m.sourceControlId,
          m.sourceControlCode,
          m.sourceControlTitle,
          m.targetFramework,
          m.targetControlId,
          m.targetControlCode,
          m.targetControlTitle,
          m.mappingStrength,
          m.mappingRationale,
          m.commonDomain,
          m.commonThemes,
        ],
      );
      if (result.rows[0]) {
        m.mappingId = result.rows[0].mapping_id;
      }
    }
  } catch (err: unknown) {
    // Persistence is best-effort; mappings are still returned from memory
    logger.warn(`[KsaCrossFramework] persistMappings warning: ${toErrorMessage(err)}`);
  }
}

/**
 * AI-based control equivalence lookup when no pre-computed mappings
 * exist for a specific control.
 */
async function findEquivalencesWithAi(
  tenantId: string,
  schema: string,
  controlId: string,
): Promise<ControlEquivalencesResult> {
  // Fetch the source control details
  const ctrlResult = await safeQuery(
    `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE control_id = $1 AND deleted_at IS NULL`,
    [controlId],
  );

  if (ctrlResult.rows.length === 0) {
    return { equivalences: [], complianceImpact: 'Control not found.' };
  }

  const ctrl = ctrlResult.rows[0];

  // Fetch all controls from other frameworks for comparison
  const othersResult = await safeQuery(
    `SELECT control_id, title, description, framework_id
     FROM "${schema}".controls
     WHERE framework_id <> $1 AND deleted_at IS NULL
     ORDER BY framework_id, control_id
     LIMIT 200`,
    [ctrl.framework_id],
  );

  if (othersResult.rows.length === 0) {
    return {
      equivalences: [],
      complianceImpact: 'No other framework controls available for comparison.',
    };
  }

  try {
    const aiResult = await claudeJSON<{
      equivalences: Array<{
        controlId: string;
        strength: 'exact' | 'strong' | 'partial' | 'weak';
        confidence: number;
      }>;
      complianceImpact: string;
    }>({
      tenantId,
      agentId: 'ksa-control-equivalence',
      decisionType: 'control_equivalence_lookup',
      systemPrompt: `You are a Saudi Arabia regulatory compliance expert. Given a source control and a list of candidate controls from other KSA frameworks, identify semantically equivalent controls. Return JSON: { "equivalences": [{ "controlId": "...", "strength": "exact|strong|partial|weak", "confidence": 0-100 }], "complianceImpact": "..." }. Only include equivalences with at least partial overlap.`,
      userMessage: JSON.stringify({
        sourceControl: {
          id: ctrl.control_id,
          title: ctrl.title,
          description: (ctrl.description || '').slice(0, 300),
          framework: ctrl.framework_id,
        },
        candidates: othersResult.rows.slice(0, 60).map((r: GenericRow) => ({
          id: r.control_id,
          title: r.title,
          description: (r.description || '').slice(0, 200),
          framework: r.framework_id,
        })),
      }),
      maxTokens: 2048,
      temperature: 0.3,
    });

    // Build lookup for candidate details
    const candidateMap = new Map<string, unknown>();
    for (const r of othersResult.rows) {
      candidateMap.set(r.control_id, r);
    }

    const equivalences: ControlEquivalence[] = [];
    for (const eq of (aiResult.equivalences || [])) {
      const candidate = candidateMap.get(eq.controlId);
      if (!candidate) continue;
      equivalences.push({

        equivalentControlId: candidate.control_id,

        equivalentControlCode: candidate.control_id,

        equivalentControlTitle: candidate.title,

        frameworkCode: candidate.framework_id,
        mappingStrength: eq.strength,
        confidence: eq.confidence,
      });
    }

    return {
      equivalences,
      complianceImpact: aiResult.complianceImpact || 'See equivalences for cross-framework impact.',
    };
  } catch {
    return {
      equivalences: [],
      complianceImpact: 'Unable to compute equivalences; AI service unavailable.',
    };
  }
}

export async function getMappings(_tenantId: string, _query?: any): Promise<unknown> { return {}; }
