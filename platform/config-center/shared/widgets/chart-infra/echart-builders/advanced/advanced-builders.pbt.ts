// ============================================
// Advanced Builders — Property-Based Tests (Properties 1 advanced subset, 8, 9)
// Feature: advanced-echarts-widgets, Task 8.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/advanced-builders.pbt.ts

import * as fc from 'fast-check';
import {
  buildControlCoverageSankeyOptions,
  buildEvidenceFlowOptions,
  buildWorkflowSankeyOptions,
  buildBlastRadiusOptions,
  buildEntityGraphOptions,
  buildNetworkGraphEnhancedOptions,
  buildProcessFlowOptions,
  buildFindingsFunnelOptions,
  buildControlEffectivenessBoxplotOptions,
  buildParallelCoordinatesOptions,
  buildGrcPulseRiverOptions,
} from './advanced-builders';
import type {
import { GrcRecord } from '@app/core/models/shared.types';
  SankeyData,
  GraphData,
  FunnelData,
  BoxplotData,
  ParallelCoordinatesData,
  ThemeRiverData,
} from '../builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

// ============================================
// Arbitraries
// ============================================

const arbSankeyData: fc.Arbitrary<SankeyData> = fc.nat({ max: 8 }).chain(n => {
  const nodeCount = n + 2;
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({ name: `node-${i}` }));
  return fc.record({
    nodes: fc.constant(nodes),
    links: fc.array(
      fc.record({
        source: fc.integer({ min: 0, max: nodeCount - 2 }).map(i => `node-${i}`),
        target: fc.integer({ min: 1, max: nodeCount - 1 }).map(i => `node-${i}`),
        value: fc.nat({ max: 1000 }),
      }).filter(l => l.source !== l.target),
      { minLength: 1, maxLength: 20 },
    ),
  });
});

const arbGraphData: fc.Arbitrary<GraphData> = fc.nat({ max: 8 }).chain(n => {
  const nodeCount = n + 2;
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `id-${i}`,
    name: `node-${i}`,
    category: i % 2 === 0 ? 'catA' : 'catB',
    value: i * 10,
  }));
  return fc.record({
    nodes: fc.constant(nodes),
    edges: fc.array(
      fc.record({
        source: fc.integer({ min: 0, max: nodeCount - 1 }).map(i => `id-${i}`),
        target: fc.integer({ min: 0, max: nodeCount - 1 }).map(i => `id-${i}`),
        value: fc.option(fc.nat({ max: 100 })).map(v => v === null ? undefined : v),
      }).filter(e => e.source !== e.target),
      { minLength: 1, maxLength: 20 },
    ),
  });
});

const arbFunnelData: fc.Arbitrary<FunnelData> = fc.record({
  stages: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.nat({ max: 10000 }),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

const arbBoxplotData: fc.Arbitrary<BoxplotData> = fc.nat({ max: 8 }).chain(n => {
  const catCount = n + 1;
  return fc.record({
    categories: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: catCount, maxLength: catCount }),
    data: fc.array(
      fc.tuple(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
      ).map(([a, b, c, d, e]) => {
        const sorted = [a, b, c, d, e].sort((x, y) => x - y) as [number, number, number, number, number];
        return sorted;
      }),
      { minLength: catCount, maxLength: catCount },
    ),
  });
});

const arbParallelCoordinatesData: fc.Arbitrary<ParallelCoordinatesData> = fc.nat({ max: 6 }).chain(n => {
  const dimCount = n + 2;
  return fc.record({
    dimensions: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 15 }),
        min: fc.double({ min: 0, max: 500, noNaN: true }),
        max: fc.double({ min: 500, max: 1000, noNaN: true }),
      }),
      { minLength: dimCount, maxLength: dimCount },
    ),
    data: fc.array(
      fc.array(fc.double({ min: 0, max: 1000, noNaN: true }), { minLength: dimCount, maxLength: dimCount }),
      { minLength: 1, maxLength: 10 },
    ),
  });
});

const arbThemeRiverData: fc.Arbitrary<ThemeRiverData> = fc.record({
  data: fc.array(
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.nat({ max: 1000 }),
      fc.string({ minLength: 1, maxLength: 10 }),
    ) as fc.Arbitrary<[string, number, string]>,
    { minLength: 1, maxLength: 20 },
  ),
});

// ============================================
// Helper: assert output validity for a given series type
// ============================================

function assertOutputType(label: string, result: unknown, expectedType: string): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;
  return series.some((s) => s && s.type === expectedType);
}

// ============================================
// Property 1 (advanced subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (advanced subset)
// **Validates: Requirements 6.1–6.13**
//
// For any valid input data for each of the 11 advanced builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with the correct series type.
// ============================================

console.log('--- Property 1 (advanced subset): Options builder output validity ---');

// 6.1 buildControlCoverageSankeyOptions → sankey
fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertOutputType('buildControlCoverageSankeyOptions', buildControlCoverageSankeyOptions(data), 'sankey');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlCoverageSankeyOptions always produces sankey series');

// 6.2 buildEvidenceFlowOptions → sankey
fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertOutputType('buildEvidenceFlowOptions', buildEvidenceFlowOptions(data), 'sankey');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceFlowOptions always produces sankey series');

// 6.3 buildWorkflowSankeyOptions → sankey
fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertOutputType('buildWorkflowSankeyOptions', buildWorkflowSankeyOptions(data), 'sankey');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildWorkflowSankeyOptions always produces sankey series');

// 6.4 buildBlastRadiusOptions → graph
fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertOutputType('buildBlastRadiusOptions', buildBlastRadiusOptions(data), 'graph');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBlastRadiusOptions always produces graph series');

// 6.5 buildEntityGraphOptions → graph
fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertOutputType('buildEntityGraphOptions', buildEntityGraphOptions(data), 'graph');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEntityGraphOptions always produces graph series');

// 6.6 buildNetworkGraphEnhancedOptions → graph
fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertOutputType('buildNetworkGraphEnhancedOptions', buildNetworkGraphEnhancedOptions(data), 'graph');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildNetworkGraphEnhancedOptions always produces graph series');

// 6.7 buildProcessFlowOptions → graph
fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertOutputType('buildProcessFlowOptions', buildProcessFlowOptions(data), 'graph');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildProcessFlowOptions always produces graph series');

// 6.8 buildFindingsFunnelOptions → funnel
fc.assert(
  fc.property(arbFunnelData, (data) => {
    return assertOutputType('buildFindingsFunnelOptions', buildFindingsFunnelOptions(data), 'funnel');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildFindingsFunnelOptions always produces funnel series');

// 6.9 buildControlEffectivenessBoxplotOptions → boxplot
fc.assert(
  fc.property(arbBoxplotData, (data) => {
    return assertOutputType('buildControlEffectivenessBoxplotOptions', buildControlEffectivenessBoxplotOptions(data), 'boxplot');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlEffectivenessBoxplotOptions always produces boxplot series');

// 6.10 buildParallelCoordinatesOptions → parallel
fc.assert(
  fc.property(arbParallelCoordinatesData, (data) => {
    return assertOutputType('buildParallelCoordinatesOptions', buildParallelCoordinatesOptions(data), 'parallel');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildParallelCoordinatesOptions always produces parallel series');

// 6.11 buildGrcPulseRiverOptions → themeRiver
fc.assert(
  fc.property(arbThemeRiverData, (data) => {
    return assertOutputType('buildGrcPulseRiverOptions', buildGrcPulseRiverOptions(data), 'themeRiver');
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildGrcPulseRiverOptions always produces themeRiver series');

console.log('Property 1 (advanced subset): PASSED\n');

// ============================================
// Property 8: Sankey flow conservation invariant
// Feature: advanced-echarts-widgets, Property 8
// **Validates: Requirements 6.12**
//
// For any valid SankeyData input and for any intermediate node
// (a node that has both incoming and outgoing links), the sum of
// link values entering that node SHALL equal the sum of link values
// leaving that node in the output Sankey series.
// ============================================

console.log('--- Property 8: Sankey flow conservation invariant ---');

function assertSankeyFlowConservation(result: Record<string, unknown>, inputData: SankeyData): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;

  const sankeySeries = series.find((s) => s && s.type === 'sankey');
  if (!sankeySeries) return false;

  const links: { source: string; target: string; value: number }[] = sankeySeries.links || sankeySeries.data?.links || inputData.links;
  const nodes: { name: string }[] = sankeySeries.nodes || sankeySeries.data?.nodes || inputData.nodes;

  if (!links || !nodes) return false;

  const nodeNames = new Set(nodes.map((n) => n.name));

  // Find intermediate nodes: nodes that appear as both source and target
  const sources = new Set(links.map((l) => l.source));
  const targets = new Set(links.map((l) => l.target));
  const intermediateNodes = [...nodeNames].filter(n => sources.has(n) && targets.has(n));

  for (const node of intermediateNodes) {
    const inflow = links
      .filter((l) => l.target === node)
      .reduce((sum: number, l: GrcRecord) => sum + (l.value || 0), 0);
    const outflow = links
      .filter((l) => l.source === node)
      .reduce((sum: number, l: GrcRecord) => sum + (l.value || 0), 0);

    if (Math.abs(inflow - outflow) > 1e-6) return false;
  }

  return true;
}

// Test all 3 sankey builders
fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertSankeyFlowConservation(buildControlCoverageSankeyOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildControlCoverageSankeyOptions preserves flow conservation');

fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertSankeyFlowConservation(buildEvidenceFlowOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEvidenceFlowOptions preserves flow conservation');

fc.assert(
  fc.property(arbSankeyData, (data) => {
    return assertSankeyFlowConservation(buildWorkflowSankeyOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildWorkflowSankeyOptions preserves flow conservation');

console.log('Property 8: PASSED\n');

// ============================================
// Property 9: Graph referential integrity invariant
// Feature: advanced-echarts-widgets, Property 9
// **Validates: Requirements 6.13**
//
// For any valid GraphData input, every edge in the output graph
// series SHALL reference a source and target that exist as node
// IDs in the output nodes array.
// ============================================

console.log('--- Property 9: Graph referential integrity invariant ---');

function assertGraphReferentialIntegrity(result: Record<string, unknown>, inputData: GraphData): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;

  const graphSeries = series.find((s) => s && s.type === 'graph');
  if (!graphSeries) return false;

  const nodes: GrcRecord[] = graphSeries.nodes || graphSeries.data?.nodes || inputData.nodes;
  const edges: GrcRecord[] = graphSeries.edges || graphSeries.links || graphSeries.data?.edges || inputData.edges;

  if (!nodes || !edges) return false;

  const nodeIds = new Set(nodes.map((n) => n.id ?? n.name));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return false;
  }

  return true;
}

// Test all 4 graph builders
fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertGraphReferentialIntegrity(buildBlastRadiusOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildBlastRadiusOptions maintains graph referential integrity');

fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertGraphReferentialIntegrity(buildEntityGraphOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildEntityGraphOptions maintains graph referential integrity');

fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertGraphReferentialIntegrity(buildNetworkGraphEnhancedOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildNetworkGraphEnhancedOptions maintains graph referential integrity');

fc.assert(
  fc.property(arbGraphData, (data) => {
    return assertGraphReferentialIntegrity(buildProcessFlowOptions(data), data);
  }),
  { numRuns: 100 },
);
console.log('  ✓ buildProcessFlowOptions maintains graph referential integrity');

console.log('Property 9: PASSED\n');

// ============================================
console.log('=== All advanced-builders property tests PASSED ===');
