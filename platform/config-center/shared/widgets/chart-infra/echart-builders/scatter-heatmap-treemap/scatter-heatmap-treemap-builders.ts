/**
 * Scatter/Heatmap/Treemap ECharts options builders — 9 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of the correct type:
 *   - Scatter/bubble builders → type: 'scatter'
 *   - Heatmap builders       → type: 'heatmap'
 *   - Treemap builders       → type: 'treemap'
 *
 * No side effects, no DOM access.
 *
 * Requirements: 5.1–5.9
 */
import type { EChartsOption } from 'echarts';
import type {
  BubbleData,
  HeatmapData,
  CalendarHeatmapData,
  TreemapData,
} from '../bar-line/builder-types';
import { getChartTooltipPoint } from '../../chart-utils';

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

// ── Heatmap color stops (green → amber → red) ─────────────────────────────
const HEATMAP_RANGE: [number, string][] = [
  [0, LOW],
  [0.5, MEDIUM],
  [1, CRITICAL],
];

// ── Shared tooltip defaults ────────────────────────────────────────────────
const TOOLTIP_ITEM  = { trigger: 'item' as const };
const TOOLTIP_AXIS  = { trigger: 'axis' as const };

// ── 1. Vendor Bubble ───────────────────────────────────────────────────────

/**
 * Bubble scatter chart plotting vendors by risk score, spend, and criticality.
 * Requirement 5.1
 */
export function buildVendorBubbleOptions(data: BubbleData): EChartsOption {
  const categories = [...new Set(data.items.map(it => it.category || 'Default'))];

  const seriesData = data.items.map((it, i) => ({
    name: it.name,
    value: [it.x, it.y, it.size],
    itemStyle: {
      color: CATEGORICAL[categories.indexOf(it.category || 'Default') % CATEGORICAL.length],
    },
  }));

  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: (params: any) => {
        const v = params.value;
        return `${params.name}<br/>${data.xLabel}: ${v[0]}<br/>${data.yLabel}: ${v[1]}<br/>Size: ${v[2]}`;
      },
    },
    legend: {
      show: categories.length > 1,
      data: categories,
    },
    xAxis: {
      type: 'value' as const,
      name: data.xLabel,
      nameLocation: 'middle' as const,
      nameGap: 30,
    },
    yAxis: {
      type: 'value' as const,
      name: data.yLabel,
      nameLocation: 'middle' as const,
      nameGap: 40,
    },
    series: [
      {
        name: 'Vendor Bubble',
        type: 'scatter' as const,
        symbolSize: (val: number[]) => Math.max(8, Math.min(60, val[2])),
        data: seriesData,
        emphasis: {
          focus: 'self' as const,
          itemStyle: { borderColor: '#333', borderWidth: 2 },
        },
      },
    ],
  };
}

// ── 2. Vendor Bubble Enhanced ──────────────────────────────────────────────

/**
 * Enhanced bubble chart with vendor category color coding and visual mapping.
 * Requirement 5.2
 */
export function buildVendorBubbleEnhancedOptions(data: BubbleData): EChartsOption {
  const categories = [...new Set(data.items.map(it => it.category || 'Default'))];

  const seriesByCategory = categories.map((cat, ci) => {
    const items = data.items
      .filter(it => (it.category || 'Default') === cat)
      .map(it => ({
        name: it.name,
        value: [it.x, it.y, it.size],
      }));

    return {
      name: cat,
      type: 'scatter' as const,
      symbolSize: (val: number[]) => Math.max(10, Math.min(70, val[2])),
      itemStyle: { color: CATEGORICAL[ci % CATEGORICAL.length] },
      data: items,
      emphasis: {
        focus: 'series' as const,
        itemStyle: { borderColor: '#333', borderWidth: 2 },
      },
    };
  });

  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: (params: any) => {
        const v = params.value;
        return `${params.seriesName} — ${params.name}<br/>${data.xLabel}: ${v[0]}<br/>${data.yLabel}: ${v[1]}<br/>Size: ${v[2]}`;
      },
    },
    legend: {
      show: true,
      data: categories,
    },
    xAxis: {
      type: 'value' as const,
      name: data.xLabel,
      nameLocation: 'middle' as const,
      nameGap: 30,
    },
    yAxis: {
      type: 'value' as const,
      name: data.yLabel,
      nameLocation: 'middle' as const,
      nameGap: 40,
    },
    visualMap: [
      {
        show: false,
        dimension: 2,
        min: 0,
        max: Math.max(...data.items.map(it => it.size), 1),
        inRange: { symbolSize: [10, 70] },
      },
    ],
    series: seriesByCategory,
  };
}

// ── 3. Risk Constellation ──────────────────────────────────────────────────

/**
 * Scatter chart plotting risks as a constellation with connecting-line styling.
 * Requirement 5.3
 */
export function buildRiskConstellationOptions(data: BubbleData): EChartsOption {
  const seriesData = data.items.map((it, i) => ({
    name: it.name,
    value: [it.x, it.y, it.size],
    itemStyle: {
      color: CATEGORICAL[i % CATEGORICAL.length],
      shadowBlur: 10,
      shadowColor: 'rgba(15, 98, 254, 0.4)',
    },
    label: {
      show: true,
      formatter: it.name,
      position: 'top' as const,
      fontSize: 10,
      color: '#c6c6c6',
    },
  }));

  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: (params: any) => {
        const v = params.value;
        return `${params.name}<br/>${data.xLabel}: ${v[0]}<br/>${data.yLabel}: ${v[1]}<br/>Magnitude: ${v[2]}`;
      },
    },
    backgroundColor: 'transparent',
    xAxis: {
      type: 'value' as const,
      name: data.xLabel,
      nameLocation: 'middle' as const,
      nameGap: 30,
      axisLine: { lineStyle: { color: '#525252' } },
      splitLine: { lineStyle: { color: '#393939', type: 'dashed' as const } },
    },
    yAxis: {
      type: 'value' as const,
      name: data.yLabel,
      nameLocation: 'middle' as const,
      nameGap: 40,
      axisLine: { lineStyle: { color: '#525252' } },
      splitLine: { lineStyle: { color: '#393939', type: 'dashed' as const } },
    },
    series: [
      {
        name: 'Risk Constellation',
        type: 'scatter' as const,
        symbolSize: (val: number[]) => Math.max(6, Math.min(40, val[2])),
        data: seriesData,
        emphasis: {
          itemStyle: { borderColor: INFO, borderWidth: 2 },
        },
      },
    ],
  };
}

// ── 4. Compliance Heatmap CC ───────────────────────────────────────────────

/**
 * Heatmap showing compliance coverage across controls and categories.
 * Requirement 5.4
 */
export function buildComplianceHeatmapCcOptions(data: HeatmapData): EChartsOption {
  const heatmapData: [number, number, number][] = [];
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.columns.length; c++) {
      heatmapData.push([c, r, data.values[r]?.[c] ?? 0]);
    }
  }

  const allValues = heatmapData.map(d => d[2]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1);

  return {
    tooltip: {
      position: 'top' as const,
      formatter: (params: any) => {
        const v = params.value;
        return `${data.columns[v[0]]} × ${data.rows[v[1]]}: ${v[2]}`;
      },
    },
    grid: { top: 40, bottom: 80, left: 100, right: 40 },
    xAxis: {
      type: 'category' as const,
      data: data.columns,
      splitArea: { show: true },
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'category' as const,
      data: data.rows,
      splitArea: { show: true },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 10,
      inRange: { color: [LOW, MEDIUM, CRITICAL] },
    },
    series: [
      {
        name: 'Compliance Coverage',
        type: 'heatmap' as const,
        data: heatmapData,
        label: { show: true, fontSize: 10 },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  };
}

// ── 5. Evidence Calendar Heatmap ───────────────────────────────────────────

/**
 * Calendar heatmap showing evidence collection activity by day.
 * Requirement 5.5
 */
export function buildEvidenceCalendarHeatmapOptions(data: CalendarHeatmapData): EChartsOption {
  const calendarData = data.data.map(d => [d.date, d.value]);
  const values = data.data.map(d => d.value);
  const maxVal = Math.max(...values, 1);

  return {
    tooltip: {
      position: 'top' as const,
      formatter: (params) => {
        const point = getChartTooltipPoint(params);
        const tuple = Array.isArray(point?.value) ? point.value : [];
        const date = tuple[0] ?? '';
        const count = tuple[1] ?? 0;
        return `${date}: ${count} items`;
      },
    },
    calendar: {
      top: 60,
      left: 50,
      right: 30,
      cellSize: ['auto', 16],
      range: String(data.year),
      itemStyle: { borderWidth: 1, borderColor: '#e0e0e0' },
      yearLabel: { show: true },
      dayLabel: { firstDay: 0, nameMap: 'en' },
      monthLabel: { nameMap: 'en' },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      top: 10,
      inRange: { color: ['#ebedf0', LOW, INFO, CAT1, CRITICAL] },
    },
    series: [
      {
        name: 'Evidence Activity',
        type: 'heatmap' as const,
        coordinateSystem: 'calendar' as const,
        data: calendarData,
      },
    ],
  };
}

// ── 6. Risk Correlation Matrix ─────────────────────────────────────────────

/**
 * Heatmap showing pairwise risk correlation coefficients.
 * Requirement 5.6
 */
export function buildRiskCorrelationMatrixOptions(data: HeatmapData): EChartsOption {
  const heatmapData: [number, number, number][] = [];
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.columns.length; c++) {
      heatmapData.push([c, r, data.values[r]?.[c] ?? 0]);
    }
  }

  const allValues = heatmapData.map(d => d[2]);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1);

  return {
    tooltip: {
      position: 'top' as const,
      formatter: (params: any) => {
        const v = params.value;
        return `${data.rows[v[1]]} ↔ ${data.columns[v[0]]}: ${v[2].toFixed(2)}`;
      },
    },
    grid: { top: 40, bottom: 80, left: 100, right: 40 },
    xAxis: {
      type: 'category' as const,
      data: data.columns,
      splitArea: { show: true },
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'category' as const,
      data: data.rows,
      splitArea: { show: true },
    },
    visualMap: {
      min: minVal,
      max: maxVal,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 10,
      inRange: { color: [INFO, '#f4f4f4', CRITICAL] },
    },
    series: [
      {
        name: 'Risk Correlation',
        type: 'heatmap' as const,
        data: heatmapData,
        label: { show: true, fontSize: 10, formatter: (p: any) => p.value[2].toFixed(2) },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  };
}

// ── 7. Risk Heatmap (5×5 likelihood × impact) ─────────────────────────────

/**
 * 5×5 risk heatmap plotting risks by likelihood and impact.
 * Requirement 5.7
 */
export function buildRiskHeatmapOptions(data: HeatmapData): EChartsOption {
  const heatmapData: [number, number, number][] = [];
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.columns.length; c++) {
      heatmapData.push([c, r, data.values[r]?.[c] ?? 0]);
    }
  }

  const allValues = heatmapData.map(d => d[2]);
  const maxVal = Math.max(...allValues, 1);

  return {
    tooltip: {
      position: 'top' as const,
      formatter: (params: any) => {
        const v = params.value;
        return `Likelihood: ${data.rows[v[1]]}<br/>Impact: ${data.columns[v[0]]}<br/>Count: ${v[2]}`;
      },
    },
    grid: { top: 40, bottom: 60, left: 80, right: 40 },
    xAxis: {
      type: 'category' as const,
      data: data.columns,
      name: 'Impact',
      nameLocation: 'middle' as const,
      nameGap: 30,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      data: data.rows,
      name: 'Likelihood',
      nameLocation: 'middle' as const,
      nameGap: 50,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 5,
      inRange: { color: [LOW, MEDIUM, HIGH, CRITICAL] },
    },
    series: [
      {
        name: 'Risk Heatmap',
        type: 'heatmap' as const,
        data: heatmapData,
        label: { show: true, fontSize: 12, fontWeight: 'bold' as const },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.4)' },
        },
      },
    ],
  };
}

// ── 8. Risk Heatmap Enhanced ───────────────────────────────────────────────

/**
 * Enhanced risk heatmap with risk count badges, drill-down zones,
 * and animated transitions.
 * Requirement 5.8
 */
export function buildRiskHeatmapEnhancedOptions(data: HeatmapData): EChartsOption {
  const heatmapData: [number, number, number][] = [];
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.columns.length; c++) {
      heatmapData.push([c, r, data.values[r]?.[c] ?? 0]);
    }
  }

  const allValues = heatmapData.map(d => d[2]);
  const maxVal = Math.max(...allValues, 1);

  return {
    tooltip: {
      position: 'top' as const,
      formatter: (params: any) => {
        const v = params.value;
        return `<strong>${data.rows[v[1]]} × ${data.columns[v[0]]}</strong><br/>Risk Count: ${v[2]}`;
      },
    },
    grid: { top: 40, bottom: 70, left: 90, right: 40 },
    xAxis: {
      type: 'category' as const,
      data: data.columns,
      name: 'Impact',
      nameLocation: 'middle' as const,
      nameGap: 30,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      data: data.rows,
      name: 'Likelihood',
      nameLocation: 'middle' as const,
      nameGap: 55,
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 5,
      inRange: { color: [LOW, MEDIUM, HIGH, CRITICAL] },
    },
    animationDuration: 800,
    animationEasing: 'cubicOut' as const,
    series: [
      {
        name: 'Risk Heatmap Enhanced',
        type: 'heatmap' as const,
        data: heatmapData,
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold' as const,
          formatter: (p: any) => (p.value[2] > 0 ? String(p.value[2]) : ''),
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 4,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 14,
            shadowColor: 'rgba(0,0,0,0.5)',
            borderColor: '#161616',
            borderWidth: 3,
          },
        },
      },
    ],
  };
}

// ── 9. Compliance Coverage Treemap ─────────────────────────────────────────

/**
 * Treemap showing compliance coverage hierarchy
 * (framework → domain → control).
 * Requirement 5.9
 */
export function buildComplianceCoverageTreemapOptions(data: TreemapData): EChartsOption {
  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: (params: any) => {
        const treePath = params.treePathInfo
          ?.map(( n: any) => n.name)
          .filter(Boolean)
          .join(' › ');
        return `${treePath || params.name}<br/>Value: ${params.value}`;
      },
    },
    series: [
      {
        name: data.name,
        type: 'treemap' as const,
        data: data.children,
        roam: false,
        leafDepth: 2,
        levels: [
          {
            itemStyle: { borderColor: '#555', borderWidth: 2, gapWidth: 2 },
            upperLabel: { show: true, height: 24, color: '#fff' },
          },
          {
            itemStyle: { borderColor: '#aaa', borderWidth: 1, gapWidth: 1 },
            upperLabel: { show: true, height: 20 },
          },
          {
            itemStyle: { borderColorSaturation: 0.6, gapWidth: 1 },
            colorSaturation: [0.35, 0.5],
          },
        ],
        label: { show: true, formatter: '{b}', fontSize: 11 },
        breadcrumb: { show: true },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      },
    ],
  };
}
