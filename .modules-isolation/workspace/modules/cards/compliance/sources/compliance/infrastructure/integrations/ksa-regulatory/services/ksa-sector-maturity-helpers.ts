import { emptyResult, safeQuery } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import type { MaturityDimension, MaturityLevel, MaturityRoadmapItem, MaturityRoadmapResult } from './ksa-sector-maturity.types';
import { MATURITY_LABELS } from './ksa-sector-maturity.types';
import { catchHandler, swallowDefault, EC } from '@dos/platform-core/resilience';

/** Persist a maturity snapshot to dashboard_snapshots for trend tracking */
export async function persistMaturitySnapshot(
  schema: string,
  tenantId: string,
  overallScore: number,
  overallLevel: MaturityLevel,
  dimensions: MaturityDimension[]
): Promise<void> {
  const dimMap: Record<string, number> = {};
  for (const d of dimensions) {
    dimMap[d.key] = d.score;
  }

  await safeQuery(
    `INSERT INTO "${schema}".dashboard_snapshots (snapshot_date, data)
     VALUES (CURRENT_DATE, $1::jsonb)
     ON CONFLICT (snapshot_date) DO UPDATE SET
       data = "${schema}".dashboard_snapshots.data || $1::jsonb`,
    [JSON.stringify({
      maturity_overall: overallScore,
      maturity_level: overallLevel,
      maturity_dimensions: dimMap,
      maturity_assessed_at: new Date().toISOString(),
    })]
  ).catch(catchHandler(EC.FALLBACK_QUERY, {
    operation: 'persist KSA sector maturity snapshot',
    tenantId,
  }));
}

export async function getTenantSector(
  schema: string,
  tenantId: string
): Promise<{ sectorCode: string; sectorName: string }> {
  const sectorRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT ts.sector_code, COALESCE(s.name_en, ts.sector_code) AS sector_name
     FROM public.tenant_sectors ts
     LEFT JOIN public.sectors s ON s.sector_code = ts.sector_code
     WHERE ts.tenant_id = $1
     ORDER BY ts.is_primary DESC
     LIMIT 1`,
    [tenantId]
  ), { operation: 'fallback query' });

  const row = getFirstRow(sectorRes)!;

  if (row) return { sectorCode: row.sector_code, sectorName: row.sector_name };

  const wpRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT industry FROM "${schema}".workspace_profile WHERE tenant_id = $1`,
    [tenantId]
  ), { operation: 'query workspace_profile' });

  const wp = getFirstRow(wpRes)!;
  return {

    sectorCode: wp?.industry || 'general',

    sectorName: wp?.industry || 'General',
  };
}

/** Industry standard maturity benchmarks when insufficient peer data */
export function getIndustryBenchmarks(sectorCode: string): Array<{ overall: number; dimensions: Record<string, number> }> {
  const benchmarks: Record<string, Array<{ overall: number; dimensions: Record<string, number> }>> = {
    C: [
      { overall: 68, dimensions: { governance: 72, risk: 75, compliance: 70, technology: 60, people: 58 } },
      { overall: 55, dimensions: { governance: 60, risk: 58, compliance: 52, technology: 50, people: 48 } },
      { overall: 78, dimensions: { governance: 80, risk: 82, compliance: 76, technology: 72, people: 70 } },
      { overall: 42, dimensions: { governance: 45, risk: 48, compliance: 40, technology: 35, people: 38 } },
    ],
    O: [
      { overall: 52, dimensions: { governance: 60, risk: 48, compliance: 55, technology: 42, people: 50 } },
      { overall: 45, dimensions: { governance: 50, risk: 42, compliance: 48, technology: 38, people: 42 } },
      { overall: 65, dimensions: { governance: 70, risk: 62, compliance: 68, technology: 55, people: 60 } },
    ],
    Q: [
      { overall: 50, dimensions: { governance: 55, risk: 52, compliance: 48, technology: 45, people: 50 } },
      { overall: 40, dimensions: { governance: 42, risk: 38, compliance: 44, technology: 35, people: 40 } },
      { overall: 62, dimensions: { governance: 65, risk: 60, compliance: 64, technology: 55, people: 58 } },
    ],
  };

  const defaults = [
    { overall: 50, dimensions: { governance: 52, risk: 50, compliance: 48, technology: 42, people: 48 } },
    { overall: 38, dimensions: { governance: 40, risk: 36, compliance: 40, technology: 30, people: 35 } },
    { overall: 65, dimensions: { governance: 68, risk: 64, compliance: 66, technology: 58, people: 62 } },
    { overall: 55, dimensions: { governance: 58, risk: 55, compliance: 54, technology: 48, people: 52 } },
  ];

  return benchmarks[sectorCode] || defaults;
}

/** Calculate percentile rank of a value within a sorted array */
export function calculatePercentile(value: number, sortedValues: number[]): number {
  if (sortedValues.length === 0) return 50;
  const below = sortedValues.filter(v => v < value).length;
  return Math.round((below / sortedValues.length) * 100);
}

export function buildFallbackNarrative(
  overallScore: number,
  overallLevel: MaturityLevel,
  dimensions: MaturityDimension[]
): string {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];

  return `The organization has achieved an overall maturity level of ${MATURITY_LABELS[overallLevel]} ` +
    `(${overallScore}/100). The strongest dimension is ${strongest.name} at level ${strongest.level} ` +
    `(${strongest.score}/100), while ${weakest.name} requires the most attention at level ${weakest.level} ` +
    `(${weakest.score}/100). To advance to the next maturity level, focused improvement in ` +
    `${weakest.name} and ${dimensions.sort((a, b) => a.score - b.score)[1]?.name || 'other dimensions'} ` +
    `is recommended.`;
}

export function buildFallbackRoadmap(dimensions: MaturityDimension[]): MaturityRoadmapItem[] {
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  return sorted.slice(0, 3).map((dim, i) => ({
    phase: i + 1,
    title: `Improve ${dim.name}`,
    description: `Current score: ${dim.score}/100. Focus on improving key indicators to reach the next maturity level.`,
    dimension: dim.key,
    impact: 'high' as const,
    effort: 'medium' as const,
    estimatedWeeks: 8,
    dependencies: [],
  }));
}

export function buildFallbackRoadmapResult(
  sorted: MaturityDimension[]
): MaturityRoadmapResult {
  const items = sorted.slice(0, 3).map((dim, _i) => ({
    phase: 1,
    title: `Improve ${dim.name}`,
    description: `Current: ${dim.score}/100 (Level ${dim.level}). Target indicators for improvement: ${Object.keys(dim.indicators).join(', ')}.`,
    dimension: dim.key,
    impact: 'high' as const,
    effort: 'medium' as const,
    estimatedWeeks: 8,
    dependencies: [] as string[],
  }));

  return {
    phases: [{
      phase: 1,
      title: 'Foundation',
      items,
      estimatedWeeks: items.reduce((s, i) => s + i.estimatedWeeks, 0),
    }],
    quickWins: items.filter(i => i.estimatedWeeks <= 4),
    longTermGoals: sorted.slice(0, 2).map(dim => ({
      phase: 3,
      title: `Achieve Level ${Math.min(5, dim.level + 2)} in ${dim.name}`,
      description: `Long-term goal to advance ${dim.name} from Level ${dim.level} to Level ${Math.min(5, dim.level + 2)}.`,
      dimension: dim.key,
      impact: 'high' as const,
      effort: 'high' as const,
      estimatedWeeks: 26,
      dependencies: [],
    })),
    estimatedTimeline: '12 months',
  };
}
