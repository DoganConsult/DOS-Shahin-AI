import { logger } from '../../ports/logger.port';
/**
 * Framework Harmonization Service
 * 
 * Computes framework overlap matrix, identifies shared/unique requirements,
 * and provides detailed analysis of cross-regulatory harmonization.
 * 
 * Features:
 * - Framework overlap matrix (control-level and domain-level)
 * - Shared vs unique requirement identification
 * - Framework relationship analysis
 * - Harmonization efficiency metrics
 */

import { KSA_FRAMEWORKS, FrameworkDef as _FrameworkDef, ControlDef } from '../../data/ksa-frameworks';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

/**
 * Framework overlap matrix entry
 */
export interface FrameworkOverlapEntry {
  frameworkA: string;
  frameworkB: string;
  sharedControls: number;
  uniqueToA: number;
  uniqueToB: number;
  overlapPercentage: number;
  sharedControlIds: string[];
}

/**
 * Framework overlap matrix
 */
export interface FrameworkOverlapMatrix {
  frameworks: string[];
  matrix: FrameworkOverlapEntry[];
  totalUniqueControls: number;
  totalSharedControls: number;
  harmonizationEfficiency: number; // Percentage of controls that are shared
}

/**
 * Shared requirement analysis
 */
export interface SharedRequirement {
  controlId: string;
  controlCode: string;
  titleEn: string;
  titleAr: string;
  frameworks: string[];
  frameworkCount: number;
  priority: string;
  domain: string;
  subdomain: string;
}

/**
 * Unique requirement analysis
 */
export interface UniqueRequirement {
  controlId: string;
  controlCode: string;
  titleEn: string;
  titleAr: string;
  framework: string;
  priority: string;
  domain: string;
  subdomain: string;
}

/**
 * Framework harmonization analysis result
 */
export interface HarmonizationAnalysis {
  overlapMatrix: FrameworkOverlapMatrix;
  sharedRequirements: SharedRequirement[];
  uniqueRequirements: UniqueRequirement[];
  domainOverlaps: Array<{
    domain: string;
    frameworks: string[];
    sharedControls: number;
  }>;
  summary: {
    totalFrameworks: number;
    totalControls: number;
    sharedControls: number;
    uniqueControls: number;
    averageOverlap: number;
    harmonizationEfficiency: number;
  };
}

/**
 * Build control index: controlId -> { framework, domain, subdomain, control }
 */
function buildControlIndex(): Map<string, Array<{
  frameworkId: string;
  frameworkName: string;
  domain: string;
  subdomain: string;
  control: ControlDef;
}>> {
  const index = new Map<string, Array<{
    frameworkId: string;
    frameworkName: string;
    domain: string;
    subdomain: string;
    control: ControlDef;
  }>>();

  for (const framework of KSA_FRAMEWORKS) {
    for (const domain of framework.domains) {
      for (const subdomain of domain.subdomains) {
        for (const control of subdomain.controls) {
          if (!index.has(control.id)) {
            index.set(control.id, []);
          }
          index.get(control.id)!.push({
            frameworkId: framework.instrumentId,
            frameworkName: framework.nameEn,
            domain: domain.nameEn,
            subdomain: subdomain.nameEn,
            control,
          });
        }
      }
    }
  }

  return index;
}

/**
 * Build framework control sets: frameworkId -> Set<controlId>
 */
function buildFrameworkControlSets(): Map<string, Set<string>> {
  const sets = new Map<string, Set<string>>();

  for (const framework of KSA_FRAMEWORKS) {
    const controlSet = new Set<string>();
    for (const domain of framework.domains) {
      for (const subdomain of domain.subdomains) {
        for (const control of subdomain.controls) {
          controlSet.add(control.id);
        }
      }
    }
    sets.set(framework.instrumentId, controlSet);
  }

  return sets;
}

/**
 * Compute framework overlap matrix
 */
export function computeFrameworkOverlapMatrix(
  frameworkIds?: string[]
): FrameworkOverlapMatrix {
  const frameworks = frameworkIds || KSA_FRAMEWORKS.map(f => f.instrumentId);
  const frameworkSets = buildFrameworkControlSets();
  const _controlIndex = buildControlIndex();

  const matrix: FrameworkOverlapEntry[] = [];
  const allControlIds = new Set<string>();

  // Build matrix for all framework pairs
  for (let i = 0; i < frameworks.length; i++) {
    const frameworkA = frameworks[i];
    const setA = frameworkSets.get(frameworkA);
    if (!setA) continue;

    for (let j = i + 1; j < frameworks.length; j++) {
      const frameworkB = frameworks[j];
      const setB = frameworkSets.get(frameworkB);
      if (!setB) continue;

      // Find shared controls
      const shared = new Set<string>();
      for (const controlId of setA) {
        if (setB.has(controlId)) {
          shared.add(controlId);
        }
      }

      // Count unique controls
      const uniqueToA = setA.size - shared.size;
      const uniqueToB = setB.size - shared.size;
      const totalControls = shared.size + uniqueToA + uniqueToB;
      const overlapPercentage = totalControls > 0 
        ? (shared.size / totalControls) * 100 
        : 0;

      matrix.push({
        frameworkA,
        frameworkB,
        sharedControls: shared.size,
        uniqueToA,
        uniqueToB,
        overlapPercentage: Math.round(overlapPercentage * 100) / 100,
        sharedControlIds: Array.from(shared),
      });

      // Track all controls
      setA.forEach(id => allControlIds.add(id));
      setB.forEach(id => allControlIds.add(id));
    }
  }

  // Calculate harmonization efficiency
  const totalControls = allControlIds.size;
  const sharedControlCount = new Set<string>();
  for (const entry of matrix) {
    entry.sharedControlIds.forEach(id => sharedControlCount.add(id));
  }
  const harmonizationEfficiency = totalControls > 0
    ? (sharedControlCount.size / totalControls) * 100
    : 0;

  return {
    frameworks,
    matrix,
    totalUniqueControls: totalControls,
    totalSharedControls: sharedControlCount.size,
    harmonizationEfficiency: Math.round(harmonizationEfficiency * 100) / 100,
  };
}

/**
 * Identify shared requirements (controls appearing in 2+ frameworks)
 */
export function identifySharedRequirements(
  minFrameworkCount: number = 2
): SharedRequirement[] {
  const controlIndex = buildControlIndex();
  const shared: SharedRequirement[] = [];

  for (const [controlId, occurrences] of controlIndex) {
    if (occurrences.length < minFrameworkCount) continue;

    const first = occurrences[0];
    const _frameworks = occurrences.map(o => o.frameworkName);
    const frameworkIds = occurrences.map(o => o.frameworkId);

    shared.push({
      controlId,
      controlCode: first.control.code,
      titleEn: first.control.titleEn,
      titleAr: first.control.titleAr,
      frameworks: frameworkIds,
      frameworkCount: occurrences.length,
      priority: first.control.priority,
      domain: first.domain,
      subdomain: first.subdomain,
    });
  }

  // Sort by framework count (most shared first), then by priority
  shared.sort((a, b) => {
    if (b.frameworkCount !== a.frameworkCount) {
      return b.frameworkCount - a.frameworkCount;
    }
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
           (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
  });

  return shared;
}

/**
 * Identify unique requirements (controls appearing in only one framework)
 */
export function identifyUniqueRequirements(): UniqueRequirement[] {
  const controlIndex = buildControlIndex();
  const unique: UniqueRequirement[] = [];

  for (const [controlId, occurrences] of controlIndex) {
    if (occurrences.length > 1) continue; // Skip shared controls

    const first = occurrences[0];

    unique.push({
      controlId,
      controlCode: first.control.code,
      titleEn: first.control.titleEn,
      titleAr: first.control.titleAr,
      framework: first.frameworkName,
      priority: first.control.priority,
      domain: first.domain,
      subdomain: first.subdomain,
    });
  }

  // Sort by priority, then by framework
  unique.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
                         (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.framework.localeCompare(b.framework);
  });

  return unique;
}

/**
 * Identify domain-level overlaps
 */
export function identifyDomainOverlaps(): Array<{
  domain: string;
  frameworks: string[];
  sharedControls: number;
}> {
  const domainMap = new Map<string, {
    frameworks: Set<string>;
    controls: Set<string>;
  }>();

  for (const framework of KSA_FRAMEWORKS) {
    for (const domain of framework.domains) {
      const key = domain.nameEn;
      if (!domainMap.has(key)) {
        domainMap.set(key, {
          frameworks: new Set(),
          controls: new Set(),
        });
      }
      const entry = domainMap.get(key)!;
      entry.frameworks.add(framework.instrumentId);

      for (const subdomain of domain.subdomains) {
        for (const control of subdomain.controls) {
          entry.controls.add(control.id);
        }
      }
    }
  }

  const overlaps: Array<{
    domain: string;
    frameworks: string[];
    sharedControls: number;
  }> = [];

  for (const [domain, entry] of domainMap) {
    if (entry.frameworks.size >= 2) {
      overlaps.push({
        domain,
        frameworks: Array.from(entry.frameworks).sort(),
        sharedControls: entry.controls.size,
      });
    }
  }

  overlaps.sort((a, b) => b.sharedControls - a.sharedControls);
  return overlaps;
}

/**
 * Perform comprehensive harmonization analysis
 */
export function performHarmonizationAnalysis(
  frameworkIds?: string[]
): HarmonizationAnalysis {
  const overlapMatrix = computeFrameworkOverlapMatrix(frameworkIds);
  const sharedRequirements = identifySharedRequirements(2);
  const uniqueRequirements = identifyUniqueRequirements();
  const domainOverlaps = identifyDomainOverlaps();

  // Calculate average overlap percentage
  const avgOverlap = overlapMatrix.matrix.length > 0
    ? overlapMatrix.matrix.reduce((sum, entry) => sum + entry.overlapPercentage, 0) / overlapMatrix.matrix.length
    : 0;

  const summary = {
    totalFrameworks: overlapMatrix.frameworks.length,
    totalControls: overlapMatrix.totalUniqueControls,
    sharedControls: overlapMatrix.totalSharedControls,
    uniqueControls: uniqueRequirements.length,
    averageOverlap: Math.round(avgOverlap * 100) / 100,
    harmonizationEfficiency: overlapMatrix.harmonizationEfficiency,
  };

  return {
    overlapMatrix,
    sharedRequirements,
    uniqueRequirements,
    domainOverlaps,
    summary,
  };
}

/**
 * Get harmonization analysis for a specific tenant (with database mappings)
 */
export async function getTenantHarmonizationAnalysis(
  tenantId: string,
  frameworkIds?: string[]
): Promise<HarmonizationAnalysis & {
  databaseMappings?: {
    totalMappings: number;
    highConfidenceMappings: number;
    averageConfidence: number;
  };
}> {
  const analysis = performHarmonizationAnalysis(frameworkIds);

  // Query database mappings if available
  try {
    const schema = tenantSchema(tenantId);
    
    // Check for framework_cross_mappings table
    const mappingRes = await safeQuery(
      `SELECT 
        COUNT(*)::int AS total_mappings,
        COUNT(*) FILTER (WHERE confidence >= 0.8)::int AS high_confidence,
        AVG(confidence)::numeric(5,2) AS avg_confidence
       FROM "${schema}".framework_cross_mappings
       WHERE source_framework = ANY($1::varchar[]) OR target_framework = ANY($1::varchar[])`,
      [frameworkIds || KSA_FRAMEWORKS.map(f => f.instrumentId)]
    );

    if (mappingRes.rows.length > 0) {
      const row = getFirstRow(mappingRes)!;
      return {
        ...analysis,
        databaseMappings: {
          totalMappings: row.total_mappings || 0,
          highConfidenceMappings: row.high_confidence || 0,
          averageConfidence: parseFloat(row.avg_confidence || '0'),
        },
      };
    }
  } catch (err) {
    // Table might not exist, ignore
    logger.warn('Framework cross-mappings table not available:', err);
  }

  return analysis;
}
