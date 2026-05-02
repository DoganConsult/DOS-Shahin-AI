/**
 * Pie/Radar/Gauge ECharts options builders — 8 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of the correct type:
 *   - Donut builders → type: 'pie'
 *   - Radar builders → type: 'radar'
 *   - Gauge builders → type: 'gauge'
 *
 * No side effects, no DOM access.
 *
 * Requirements: 4.1–4.8
 */
import type { EChartsOption } from 'echarts';
import type {
  DonutData,
  RadarData,
  GaugeData,
  KpiTilesData,
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

// ── 1. Control Testing Donut ───────────────────────────────────────────────

/**
 * Donut chart for control testing status distribution
 * (passed, failed, pending, not tested).
 * Requirement 4.1
 */
export function buildControlTestingDonutOptions(data: DonutData): EChartsOption {
  const seriesData = data.segments.map((seg, i) => ({
    name: seg.name,
    value: seg.value,
    itemStyle: { color: seg.color || CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical' as const,
      left: 'left',
      data: data.segments.map(s => s.name),
    },
    series: [
      {
        name: 'Control Testing',
        type: 'pie' as const,
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}: {d}%' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data: seriesData,
      },
    ],
  };
}


// ── 2. Evidence Donut ──────────────────────────────────────────────────────

/**
 * Donut chart for evidence collection status by category.
 * Requirement 4.2
 */
export function buildEvidenceDonutOptions(data: DonutData): EChartsOption {
  const seriesData = data.segments.map((seg, i) => ({
    name: seg.name,
    value: seg.value,
    itemStyle: { color: seg.color || CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: {
      ...TOOLTIP_ITEM,
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'horizontal' as const,
      bottom: 0,
      data: data.segments.map(s => s.name),
    },
    series: [
      {
        name: 'Evidence Status',
        type: 'pie' as const,
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}: {d}%' },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: seriesData,
      },
    ],
  };
}

// ── 3. Evidence Freshness Radar ────────────────────────────────────────────

/**
 * Radar chart for evidence freshness scores across multiple dimensions.
 * Requirement 4.3
 */
export function buildEvidenceFreshnessRadarOptions(data: RadarData): EChartsOption {
  const indicator = data.indicators.map(ind => ({
    name: ind.name,
    max: ind.max,
  }));

  const radarSeries = data.series.map((s, i) => ({
    name: s.name,
    value: s.values,
    lineStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    areaStyle: { color: CATEGORICAL[i % CATEGORICAL.length], opacity: 0.15 },
  }));

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      show: true,
      data: data.series.map(s => s.name),
    },
    radar: {
      indicator,
      shape: 'polygon' as const,
    },
    series: [
      {
        name: 'Evidence Freshness',
        type: 'radar' as const,
        data: radarSeries,
      },
    ],
  };
}

// ── 4. Maturity Radar ──────────────────────────────────────────────────────

/**
 * Radar chart showing maturity levels across framework domains.
 * Requirement 4.4
 */
export function buildMaturityRadarOptions(data: RadarData): EChartsOption {
  const indicator = data.indicators.map(ind => ({
    name: ind.name,
    max: ind.max,
  }));

  const radarSeries = data.series.map((s, i) => ({
    name: s.name,
    value: s.values,
    lineStyle: { color: CATEGORICAL[i % CATEGORICAL.length], width: 2 },
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    areaStyle: { color: CATEGORICAL[i % CATEGORICAL.length], opacity: 0.1 },
  }));

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      show: true,
      data: data.series.map(s => s.name),
    },
    radar: {
      indicator,
      shape: 'polygon' as const,
    },
    series: [
      {
        name: 'Maturity Levels',
        type: 'radar' as const,
        data: radarSeries,
      },
    ],
  };
}

// ── 5. Maturity Spider (current vs target) ─────────────────────────────────

/**
 * Spider/radar chart comparing current vs target maturity across capability areas.
 * Requirement 4.5
 */
export function buildMaturitySpiderOptions(data: RadarData): EChartsOption {
  const indicator = data.indicators.map(ind => ({
    name: ind.name,
    max: ind.max,
  }));

  const radarSeries = data.series.map((s, i) => ({
    name: s.name,
    value: s.values,
    lineStyle: {
      color: CATEGORICAL[i % CATEGORICAL.length],
      width: 2,
      type: (i === 1 ? 'dashed' : 'solid') as 'dashed' | 'solid',
    },
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    areaStyle: { color: CATEGORICAL[i % CATEGORICAL.length], opacity: i === 0 ? 0.2 : 0.05 },
  }));

  return {
    tooltip: TOOLTIP_ITEM,
    legend: {
      show: true,
      data: data.series.map(s => s.name),
    },
    radar: {
      indicator,
      shape: 'circle' as const,
    },
    series: [
      {
        name: 'Maturity Spider',
        type: 'radar' as const,
        data: radarSeries,
      },
    ],
  };
}


// ── 6. Compliance Gauge ────────────────────────────────────────────────────

/**
 * Gauge chart showing overall compliance percentage with color-coded zones
 * (red, amber, green).
 * Requirement 4.6
 */
export function buildComplianceGaugeOptions(data: GaugeData): EChartsOption {
  const clampedValue = Math.max(data.min, Math.min(data.max, data.value));

  const axisLine = {
    lineStyle: {
      width: 20,
      color: data.zones.map(z => [
        (z.max - data.min) / (data.max - data.min),
        z.color,
      ] as [number, string]),
    },
  };

  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        name: data.label || 'Compliance',
        type: 'gauge' as const,
        min: data.min,
        max: data.max,
        progress: { show: true, width: 14 },
        axisLine,
        axisTick: { show: true, distance: -30, length: 6 },
        splitLine: { distance: -30, length: 14 },
        axisLabel: { distance: 25, fontSize: 11 },
        pointer: { show: true, length: '60%', width: 6 },
        anchor: { show: true, size: 20 },
        title: { show: true, offsetCenter: [0, '70%'], fontSize: 14 },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          fontSize: 24,
          offsetCenter: [0, '90%'],
        },
        data: [{ value: clampedValue, name: data.label || 'Compliance' }],
      },
    ],
  };
}

// ── 7. KPI Tiles Animated ──────────────────────────────────────────────────

/**
 * Animated gauge mini-charts for KPI tile displays.
 * Each tile gets its own gauge series rendered in a grid layout.
 * Requirement 4.7
 */
export function buildKpiTilesAnimatedOptions(data: KpiTilesData): EChartsOption {
  const tileCount = data.tiles.length;
  const cols = Math.min(tileCount, 4);
  const rows = Math.ceil(tileCount / cols);

  const series = data.tiles.map((tile, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ((col + 0.5) / cols) * 100;
    const cy = ((row + 0.5) / rows) * 100;

    const pct = tile.target > 0
      ? Math.min(100, (tile.value / tile.target) * 100)
      : 0;

    return {
      type: 'gauge' as const,
      center: [`${cx}%`, `${cy}%`],
      radius: `${Math.min(80 / cols, 80 / rows)}%`,
      min: 0,
      max: 100,
      startAngle: 200,
      endAngle: -20,
      progress: { show: true, width: 8 },
      axisLine: { lineStyle: { width: 8, color: [[1, '#e0e0e0'] as [number, string]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      title: {
        show: true,
        offsetCenter: [0, '60%'],
        fontSize: 11,
      },
      detail: {
        valueAnimation: true,
        formatter: `{value}${tile.unit}`,
        fontSize: 16,
        offsetCenter: [0, 0],
        color: CATEGORICAL[i % CATEGORICAL.length],
      },
      data: [{ value: Math.round(pct), name: tile.label }],
    };
  });

  return {
    tooltip: TOOLTIP_ITEM,
    series,
  };
}

// ── 8. Risk Appetite Gauge ─────────────────────────────────────────────────

/**
 * Gauge chart showing current risk level against appetite thresholds.
 * Requirement 4.8
 */
export function buildRiskAppetiteGaugeOptions(data: GaugeData): EChartsOption {
  const clampedValue = Math.max(data.min, Math.min(data.max, data.value));

  const axisLine = {
    lineStyle: {
      width: 18,
      color: data.zones.map(z => [
        (z.max - data.min) / (data.max - data.min),
        z.color,
      ] as [number, string]),
    },
  };

  return {
    tooltip: TOOLTIP_ITEM,
    series: [
      {
        name: data.label || 'Risk Appetite',
        type: 'gauge' as const,
        min: data.min,
        max: data.max,
        progress: { show: true, width: 12 },
        axisLine,
        axisTick: { show: true, distance: -25, length: 5 },
        splitLine: { distance: -25, length: 12 },
        axisLabel: { distance: 20, fontSize: 10 },
        pointer: { show: true, length: '55%', width: 5 },
        anchor: { show: true, size: 16 },
        title: { show: true, offsetCenter: [0, '70%'], fontSize: 13 },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          fontSize: 22,
          offsetCenter: [0, '90%'],
        },
        data: [{ value: clampedValue, name: data.label || 'Risk Appetite' }],
      },
    ],
  };
}
