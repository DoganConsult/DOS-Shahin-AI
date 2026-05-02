/**
 * Line-type ECharts options builders — 13 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of `type: 'line'` (or `'scatter'` for
 * anomaly markers alongside a line series).
 * No side effects, no DOM access.
 *
 * Requirements: 3.1–3.13
 */
import type { EChartsOption } from 'echarts';
import type {
  TimeSeriesData,
  SparklineData,
  ForecastData,
  AnomalyTimelineData,
  BurndownData,
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

const SEVERITY_COLORS: Record<string, string> = {
  critical: CRITICAL,
  high: HIGH,
  medium: MEDIUM,
  low: LOW,
  info: INFO,
};

// ── Shared tooltip defaults ────────────────────────────────────────────────
const TOOLTIP_AXIS = { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } };
const TOOLTIP_ITEM = { trigger: 'item' as const };

// ── 1. Attack Surface Trend (multi-line) ───────────────────────────────────

/**
 * Multi-line chart for attack surface area changes over time.
 * Requirement 3.1
 */
export function buildAttackSurfaceTrendOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: true,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    areaStyle: { opacity: 0.1 },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Attack Surface' },
    series,
  };
}

// ── 2. Compliance Timeline (line with milestone markers) ───────────────────

/**
 * Compliance score progression with milestone markers.
 * Requirement 3.2
 */
export function buildComplianceTimelineOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: false,
    symbol: 'circle',
    symbolSize: 8,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    markPoint: {
      data: [
        { type: 'max', name: 'Peak' },
        { type: 'min', name: 'Low' },
      ],
    },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Compliance Score', min: 0, max: 100 },
    series,
  };
}

// ── 3. Control Heartbeat (real-time pulse line) ────────────────────────────

/**
 * Real-time line chart for control health pulse signals.
 * Requirement 3.3
 */
export function buildControlHeartbeatOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: true,
    showSymbol: false,
    lineStyle: { width: 2 },
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    areaStyle: { opacity: 0.05 },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Health Pulse' },
    animation: true,
    animationDuration: 500,
    series,
  };
}

// ── 4. Enforcement Trend ───────────────────────────────────────────────────

/**
 * Enforcement action trends over time.
 * Requirement 3.4
 */
export function buildEnforcementTrendOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: false,
    symbol: 'diamond',
    symbolSize: 6,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Enforcement Actions' },
    series,
  };
}

// ── 5. Remediation Velocity (line with velocity trendline) ─────────────────

/**
 * Remediation completion rate with velocity trendline.
 * Requirement 3.5
 */
export function buildRemediationVelocityOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: true,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    ...(i === 0
      ? {
          markLine: {
            symbol: 'none',
            data: [{ type: 'average', name: 'Avg Velocity' }],
            lineStyle: { type: 'dashed' as const, color: CAT1 },
          },
        }
      : {}),
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Completion Rate' },
    series,
  };
}


// ── 6. Risk Appetite Trend (threshold bands + actual overlay) ──────────────

/**
 * Risk appetite threshold bands with actual risk score overlay.
 * Requirement 3.6
 */
export function buildRiskAppetiteTrendOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  // First series = actual risk, remaining = threshold bands
  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: true,
    itemStyle: { color: i === 0 ? CRITICAL : CATEGORICAL[(i + 2) % CATEGORICAL.length] },
    lineStyle: i === 0 ? { width: 3 } : { width: 1, type: 'dashed' as const },
    areaStyle: i === 0 ? undefined : { opacity: 0.08 },
    z: i === 0 ? 10 : 1,
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Risk Score' },
    series,
  };
}

// ── 7. Rolling Forecast (historical + dashed forecast + confidence) ────────

/**
 * Historical data + dashed forecast projection with confidence intervals.
 * Requirement 3.7
 */
export function buildRollingForecastOptions(data: ForecastData): EChartsOption {
  const histDates = data.historical.map(h => h.date);
  const fcDates = data.forecast.map(f => f.date);
  const allDates = [...histDates, ...fcDates];

  const histValues = data.historical.map(h => h.value);
  const fcValues = data.forecast.map(f => f.value);
  const lowerBand = data.forecast.map(f => f.lower);
  const upperBand = data.forecast.map(f => f.upper);

  // Pad historical series with nulls for forecast range
  const histPadded = [...histValues, ...new Array(fcDates.length).fill(null)];
  // Pad forecast series with nulls for historical range
  const fcPadded = [...new Array(histDates.length).fill(null), ...fcValues];
  const lowerPadded = [...new Array(histDates.length).fill(null), ...lowerBand];
  const upperPadded = [...new Array(histDates.length).fill(null), ...upperBand];

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: allDates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Historical',
        type: 'line' as const,
        data: histPadded,
        smooth: true,
        itemStyle: { color: INFO },
        lineStyle: { width: 2 },
      },
      {
        name: 'Forecast',
        type: 'line' as const,
        data: fcPadded,
        smooth: true,
        itemStyle: { color: CAT1 },
        lineStyle: { width: 2, type: 'dashed' as const },
      },
      {
        name: 'Upper Bound',
        type: 'line' as const,
        data: upperPadded,
        smooth: true,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        stack: 'confidence',
        symbol: 'none',
        itemStyle: { color: CAT1 },
      },
      {
        name: 'Lower Bound',
        type: 'line' as const,
        data: lowerPadded,
        smooth: true,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0.15 },
        stack: 'confidence',
        symbol: 'none',
        itemStyle: { color: CAT1 },
      },
    ],
  };
}

// ── 8. Sparkline (minimal for KPI tiles) ───────────────────────────────────

/**
 * Minimal sparkline chart suitable for embedding in KPI tiles.
 * Requirement 3.8
 */
export function buildSparklineOptions(data: SparklineData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' as const, show: false },
    legend: { show: false },
    grid: { top: 4, right: 4, bottom: 4, left: 4 },
    xAxis: {
      type: 'category',
      show: false,
      data: data.values.map((_, i) => String(i)),
      boundaryGap: false,
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        name: data.label ?? 'Sparkline',
        type: 'line' as const,
        data: data.values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: INFO },
        areaStyle: { opacity: 0.1, color: INFO },
        itemStyle: { color: INFO },
      },
    ],
  };
}


// ── 9. Trend Line (general-purpose configurable) ───────────────────────────

/**
 * General-purpose trend line chart with configurable series, axis labels, and zoom.
 * Requirement 3.9
 */
export function buildTrendLineOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: false,
    symbol: 'circle',
    symbolSize: 4,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100 },
    ],
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series,
  };
}

// ── 10. Anomaly Timeline (line + scatter for anomalous points) ─────────────

/**
 * Line+scatter chart highlighting anomalous data points with visual markers.
 * Requirement 3.10
 */
export function buildAnomalyTimelineOptions(data: AnomalyTimelineData): EChartsOption {
  const dates = data.points.map(p => p.date);
  const values = data.points.map(p => p.value);

  const anomalyData = data.points.map(p =>
    p.isAnomaly ? p.value : null,
  );

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Value',
        type: 'line' as const,
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: INFO },
        itemStyle: { color: INFO },
      },
      {
        name: 'Anomaly',
        type: 'scatter' as const,
        data: anomalyData,
        symbolSize: 12,
        itemStyle: {
          color: CRITICAL,
          borderColor: '#fff',
          borderWidth: 2,
        },
      },
    ],
  };
}

// ── 11. GRC Timeline (multi-series line+scatter for milestones) ────────────

/**
 * Multi-series line+scatter chart showing GRC event milestones on a timeline.
 * Requirement 3.11
 */
export function buildGrcTimelineOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const lineSeries = data.series.map((s, i) => ({
    name: s.name,
    type: 'line' as const,
    data: s.data.map(d => d.value),
    smooth: false,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    lineStyle: { width: 2 },
  }));

  const scatterSeries = data.series.map((s, i) => ({
    name: `${s.name} Events`,
    type: 'scatter' as const,
    data: s.data.map(d => d.value),
    symbolSize: 8,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [...lineSeries, ...scatterSeries],
  };
}

// ── 12. Risk Matrix Timeline (line+scatter for position changes) ───────────

/**
 * Line+scatter chart showing risk matrix position changes over time.
 * Requirement 3.12
 */
export function buildRiskMatrixTimelineOptions(data: TimeSeriesData): EChartsOption {
  const dates = data.series[0]?.data.map(d => d.date) ?? [];

  const series: EChartsOption['series'] = data.series.map((s, i) => ([
    {
      name: s.name,
      type: 'line' as const,
      data: s.data.map(d => d.value),
      smooth: false,
      lineStyle: { width: 2 },
      itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    },
    {
      name: `${s.name} Points`,
      type: 'scatter' as const,
      data: s.data.map(d => d.value),
      symbolSize: 10,
      itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    },
  ])).flat();

  return {
    tooltip: TOOLTIP_AXIS,
    legend: { show: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: 'Risk Position' },
    series,
  };
}

// ── 13. Issue Aging Burndown (combined line+bar) ───────────────────────────

/**
 * Combined line+bar chart showing issue aging distribution with burndown trendline.
 * Requirement 3.13
 */
export function buildIssueAgingBurndownOptions(data: BurndownData): EChartsOption {
  return {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } },
    legend: { show: true },
    xAxis: { type: 'category', data: data.dates },
    yAxis: [
      { type: 'value', name: 'Aging Count', position: 'left' as const },
      { type: 'value', name: 'Burndown', position: 'right' as const },
    ],
    series: [
      {
        name: 'Issue Aging',
        type: 'bar' as const,
        data: data.aging,
        itemStyle: { color: HIGH },
        yAxisIndex: 0,
      },
      {
        name: 'Burndown',
        type: 'line' as const,
        data: data.burndown,
        smooth: true,
        lineStyle: { width: 3, color: LOW },
        itemStyle: { color: LOW },
        yAxisIndex: 1,
      },
    ],
  };
}
