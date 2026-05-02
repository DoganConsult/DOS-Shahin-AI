/**
 * Sankey/Graph/Funnel/Advanced ECharts options builders — 11 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of the correct type:
 *   - Sankey builders   → type: 'sankey'
 *   - Graph builders    → type: 'graph'
 *   - Funnel builder    → type: 'funnel'
 *   - Boxplot builder   → type: 'boxplot'
 *   - Parallel builder  → type: 'parallel'
 *   - ThemeRiver builder→ type: 'themeRiver'
 *
 * No side effects, no DOM access.
 *
 * Requirements: 6.1–6.11
 */
import type { EChartsOption } from 'echarts';
import type {
  SankeyData,
  GraphData,
  FunnelData,
  BoxplotData,
  ParallelCoordinatesData,
  ThemeRiverData,
} from '../bar-line/builder-types';

// ── GRC semantic palette (matches echart-theme.ts LIGHT_PALETTE) ───────────
const CRITICAL = '#da1e28';
const HIGH     = '#ff832b';
const MEDIUM   = '#f1c21b';
const LOW      = '#24a148';
const INFO     = '#0f62fe';
const CAT1     = '#6929c4';
const CAT2     = '#1192e8';
const CAT3     = '#005d5d';
const CAT4     = '#9f1853';
const CAT5     = '#8a3ffc';

const CATEGORICAL = [INFO, CAT1, CAT2, CAT3, CAT4, CAT5, CRITICAL, HIGH, MEDIUM, LOW];

// ── Shared tooltip defaults ────────────────────────────────────────────────
const TOOLTIP_ITEM = { trigger: 'item' as const };

// ── 1. Control Coverage Sankey ─────────────────────────────────────────────

/**
 * Sankey diagram showing control-to-framework coverage flow.
 * Requirement 6.1
 */
export function buildControlCoverageSankeyOptions(data: SankeyData): EChartsOption {
  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        type: 'sankey',
        orient: 'horizontal',
        layoutIterations: 32,
        nodeAlign: 'justify',
        nodeWidth: 20,
        nodeGap: 12,
        lineStyle: { color: 'gradient', curveness: 0.5 },
        itemStyle: { borderWidth: 1, borderColor: '#fff' },
        label: { position: 'right', fontSize: 11 },
        data: data.nodes.map((n, i) => ({
          name: n.name,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        links: data.links.map(l => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
      },
    ],
  };
}

// ── 2. Evidence Flow Sankey ────────────────────────────────────────────────

/**
 * Sankey diagram showing evidence collection and approval flow.
 * Requirement 6.2
 */
export function buildEvidenceFlowOptions(data: SankeyData): EChartsOption {
  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        type: 'sankey',
        orient: 'horizontal',
        layoutIterations: 32,
        nodeAlign: 'left',
        nodeWidth: 18,
        nodeGap: 10,
        lineStyle: { color: 'source', curveness: 0.5, opacity: 0.4 },
        itemStyle: { borderWidth: 1, borderColor: '#fff' },
        label: { position: 'right', fontSize: 11 },
        emphasis: { focus: 'adjacency' },
        data: data.nodes.map((n, i) => ({
          name: n.name,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        links: data.links.map(l => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
      },
    ],
  };
}

// ── 3. Workflow Sankey ─────────────────────────────────────────────────────

/**
 * Sankey diagram showing GRC workflow stage transitions.
 * Requirement 6.3
 */
export function buildWorkflowSankeyOptions(data: SankeyData): EChartsOption {
  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        type: 'sankey',
        orient: 'horizontal',
        layoutIterations: 32,
        nodeAlign: 'justify',
        nodeWidth: 22,
        nodeGap: 14,
        lineStyle: { color: 'gradient', curveness: 0.6 },
        itemStyle: { borderWidth: 1, borderColor: '#fff' },
        label: { position: 'right', fontSize: 12, fontWeight: 'bold' as const },
        emphasis: { focus: 'adjacency' },
        data: data.nodes.map((n, i) => ({
          name: n.name,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        links: data.links.map(l => ({
          source: l.source,
          target: l.target,
          value: l.value,
        })),
      },
    ],
  };
}

// ── 4. Blast Radius Graph ──────────────────────────────────────────────────

/**
 * Force-directed graph showing blast radius of a risk event.
 * Requirement 6.4
 */
export function buildBlastRadiusOptions(data: GraphData): EChartsOption {
  const categories = [...new Set(data.nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      data: categories,
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 200, gravity: 0.1, edgeLength: [80, 200] },
        categories: categories.map((c, i) => ({
          name: c,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        data: data.nodes.map(n => ({
          id: n.id,
          name: n.name,
          value: n.value ?? 1,
          symbolSize: Math.max(20, (n.value ?? 1) * 5),
          category: categories.indexOf(n.category || 'Default'),
        })),
        edges: data.edges.map(e => ({
          source: e.source,
          target: e.target,
          value: e.value,
          lineStyle: { width: Math.max(1, (e.value ?? 1) * 0.5) },
        })),
        lineStyle: { curveness: 0.1, opacity: 0.6 },
        label: { show: true, position: 'right', fontSize: 10 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
      },
    ],
  };
}

// ── 5. Entity Graph ────────────────────────────────────────────────────────

/**
 * Force-directed graph showing entity relationships in the GRC domain.
 * Requirement 6.5
 */
export function buildEntityGraphOptions(data: GraphData): EChartsOption {
  const categories = [...new Set(data.nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      data: categories,
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    animationDuration: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 150, gravity: 0.15, edgeLength: [60, 160] },
        categories: categories.map((c, i) => ({
          name: c,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        data: data.nodes.map(n => ({
          id: n.id,
          name: n.name,
          value: n.value ?? 1,
          symbolSize: Math.max(15, (n.value ?? 1) * 4),
          category: categories.indexOf(n.category || 'Default'),
        })),
        edges: data.edges.map(e => ({
          source: e.source,
          target: e.target,
          value: e.value,
        })),
        lineStyle: { curveness: 0.2, opacity: 0.5, color: 'source' },
        label: { show: true, position: 'right', fontSize: 10 },
        emphasis: { focus: 'adjacency' },
      },
    ],
  };
}

// ── 6. Network Graph Enhanced ──────────────────────────────────────────────

/**
 * Enhanced force-directed network graph with force layout for GRC network analysis.
 * Requirement 6.6
 */
export function buildNetworkGraphEnhancedOptions(data: GraphData): EChartsOption {
  const categories = [...new Set(data.nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      data: categories,
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    animationDuration: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        force: { repulsion: 300, gravity: 0.08, edgeLength: [100, 250], friction: 0.6 },
        categories: categories.map((c, i) => ({
          name: c,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        data: data.nodes.map(n => ({
          id: n.id,
          name: n.name,
          value: n.value ?? 1,
          symbolSize: Math.max(20, (n.value ?? 1) * 6),
          category: categories.indexOf(n.category || 'Default'),
          label: { show: true, fontSize: 11 },
        })),
        edges: data.edges.map(e => ({
          source: e.source,
          target: e.target,
          value: e.value,
          lineStyle: { width: Math.max(1, (e.value ?? 1) * 0.8) },
        })),
        lineStyle: { curveness: 0.15, opacity: 0.5 },
        label: { show: true, position: 'right', fontSize: 11 },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4 },
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' },
        },
      },
    ],
  };
}

// ── 7. Process Flow Graph ──────────────────────────────────────────────────

/**
 * Directed graph showing GRC process flow with fixed layout.
 * Requirement 6.7
 */
export function buildProcessFlowOptions(data: GraphData): EChartsOption {
  const categories = [...new Set(data.nodes.map(n => n.category || 'Default'))];

  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        type: 'graph',
        layout: 'none',
        roam: true,
        categories: categories.map((c, i) => ({
          name: c,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        data: data.nodes.map((n, i) => ({
          id: n.id,
          name: n.name,
          value: n.value ?? 1,
          x: (i % 5) * 120 + 60,
          y: Math.floor(i / 5) * 100 + 60,
          symbolSize: 40,
          category: categories.indexOf(n.category || 'Default'),
        })),
        edges: data.edges.map(e => ({
          source: e.source,
          target: e.target,
          value: e.value,
        })),
        lineStyle: { curveness: 0.2, opacity: 0.7, width: 2 },
        label: { show: true, position: 'inside', fontSize: 10, color: '#fff' },
        emphasis: { focus: 'adjacency' },
        edgeSymbol: ['none', 'arrow'] as [string, string],
        edgeSymbolSize: 10,
      },
    ],
  };
}

// ── 8. Findings Funnel ─────────────────────────────────────────────────────

/**
 * Funnel chart showing findings triage pipeline from discovery to resolution.
 * Stages are sorted by value descending.
 * Requirement 6.8
 */
export function buildFindingsFunnelOptions(data: FunnelData): EChartsOption {
  const sorted = [...data.stages].sort((a, b) => b.value - a.value);

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      data: sorted.map(s => s.name),
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 40,
        bottom: 40,
        width: '80%',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside', fontSize: 12 },
        labelLine: { length: 10, lineStyle: { width: 1 } },
        itemStyle: { borderColor: '#fff', borderWidth: 1 },
        emphasis: { label: { fontSize: 14, fontWeight: 'bold' as const } },
        data: sorted.map((s, i) => ({
          name: s.name,
          value: s.value,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
        })),
      },
    ],
  };
}

// ── 9. Control Effectiveness Boxplot ───────────────────────────────────────

/**
 * Boxplot chart showing control effectiveness distribution across categories.
 * Requirement 6.9
 */
export function buildControlEffectivenessBoxplotOptions(data: BoxplotData): EChartsOption {
  return {
    tooltip: {
      trigger: 'item' as const,
      axisPointer: { type: 'shadow' as const },
    },
    grid: { left: '10%', right: '10%', bottom: '15%' },
    xAxis: {
      type: 'category',
      data: data.categories,
      boundaryGap: true,
      axisLabel: { fontSize: 11, rotate: data.categories.length > 6 ? 30 : 0 },
    },
    yAxis: {
      type: 'value',
      name: 'Effectiveness',
      nameTextStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'boxplot',
        data: data.data.map((d, i) => ({
          value: d,
          itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length], borderColor: CATEGORICAL[i % CATEGORICAL.length] },
        })),
        itemStyle: { borderWidth: 2 },
        emphasis: { itemStyle: { borderWidth: 3, shadowBlur: 5, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
      },
    ],
  };
}

// ── 10. Parallel Coordinates ───────────────────────────────────────────────

/**
 * Parallel coordinates chart for multi-dimensional GRC metric comparison.
 * Requirement 6.10
 */
export function buildParallelCoordinatesOptions(data: ParallelCoordinatesData): EChartsOption {
  return {
    parallelAxis: data.dimensions.map((dim, i) => ({
      dim: i,
      name: dim.name,
      min: dim.min,
      max: dim.max,
      nameTextStyle: { fontSize: 11 },
    })),
    parallel: {
      left: '5%',
      right: '13%',
      bottom: '10%',
      top: '10%',
      parallelAxisDefault: {
        type: 'value',
        nameLocation: 'end',
        nameGap: 20,
        axisLine: { lineStyle: { color: '#aaa' } },
        axisTick: { lineStyle: { color: '#aaa' } },
        axisLabel: { fontSize: 10 },
      },
    },
    series: [
      {
        type: 'parallel',
        lineStyle: { width: 1.5, opacity: 0.4 },
        emphasis: { lineStyle: { width: 3, opacity: 1 } },
        data: data.data,
        smooth: true,
      },
    ],
  };
}

// ── 11. GRC Pulse River ────────────────────────────────────────────────────

/**
 * ThemeRiver chart showing GRC activity pulse over time by category.
 * Requirement 6.11
 */
export function buildGrcPulseRiverOptions(data: ThemeRiverData): EChartsOption {
  const categories = [...new Set(data.data.map(d => d[2]))];

  return {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'line' as const, lineStyle: { color: 'rgba(var(--color-black-rgb), 0.2)', width: 1 } },
    },
    legend: {
      data: categories,
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    singleAxis: {
      type: 'time',
      bottom: 40,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        type: 'themeRiver',
        emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(var(--color-black-rgb), 0.3)' } },
        data: data.data.map(d => [d[0], d[1], d[2]]),
        label: { show: true, fontSize: 10 },
      },
    ],
    color: CATEGORICAL.slice(0, categories.length),
  };
}
