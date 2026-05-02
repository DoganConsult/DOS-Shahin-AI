/**
 * Bar-type ECharts options builders — 10 pure functions.
 *
 * Each function accepts a typed data input and returns an `EChartsOption`
 * with at least one series entry of `type: 'bar'`. No side effects, no DOM access.
 *
 * Requirements: 2.1–2.10
 */
import type { EChartsOption } from 'echarts';
import type {
  AnimatedRankingData,
  BoardSummaryData,
  FindingsBarData,
  MaturityProgressionData,
  ValueGapBarData,
  WaterfallData,
  BulletChartData,
  MonteCarloHistogramData,
  TornadoChartData,
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

const SEVERITY_COLORS: Record<string, string> = {
  critical: CRITICAL,
  high: HIGH,
  medium: MEDIUM,
  low: LOW,
  info: INFO,
};

const CATEGORICAL = [INFO, CAT1, CAT2, CAT3, CAT4, CAT5, CRITICAL, HIGH, MEDIUM, LOW];

// ── Shared tooltip defaults ────────────────────────────────────────────────
const TOOLTIP_BASE = { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } };
const TOOLTIP_ITEM = { trigger: 'item' as const };

// ── 1. Animated Ranking (horizontal bar race) ──────────────────────────────

/**
 * Animated horizontal bar race chart showing ranked GRC entities over time.
 * Requirement 2.1
 */
export function buildAnimatedRankingOptions(data: AnimatedRankingData): EChartsOption {
  const periods = data.entities[0]?.values.map(v => v.period) ?? [];
  const lastIdx = periods.length - 1;

  const series: EChartsOption['series'] = data.entities.map((entity, i) => ({
    name: entity.name,
    type: 'bar' as const,
    data: entity.values.map(v => v.score),
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
    realtimeSort: true,
    label: { show: true, position: 'right' as const, formatter: '{c}' },
  }));

  return {
    animationDuration: 0,
    animationDurationUpdate: 1000,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
    tooltip: TOOLTIP_BASE,
    legend: { show: true },
    xAxis: { type: 'value', max: 'dataMax' },
    yAxis: {
      type: 'category',
      data: data.entities.map(e => e.name),
      inverse: true,
      animationDuration: 300,
      animationDurationUpdate: 300,
    },
    series,
  };
}

// ── 2. Board Summary (grouped bar) ────────────────────────────────────────

/**
 * Grouped bar chart for board-level GRC metrics.
 * Requirement 2.2
 */
export function buildBoardSummaryOptions(data: BoardSummaryData): EChartsOption {
  const series: EChartsOption['series'] = data.groups.map((group, i) => ({
    name: group.name,
    type: 'bar' as const,
    data: group.values,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: TOOLTIP_BASE,
    legend: { show: true },
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value' },
    series,
  };
}

// ── 3. Findings Bar (stacked bar by severity) ─────────────────────────────

/**
 * Stacked bar chart showing findings by severity and category.
 * Requirement 2.3
 */
export function buildFindingsBarOptions(data: FindingsBarData): EChartsOption {
  const series: EChartsOption['series'] = data.severities.map((sev) => ({
    name: sev.name,
    type: 'bar' as const,
    stack: 'findings',
    data: sev.values,
    itemStyle: {
      color: sev.color || SEVERITY_COLORS[sev.name.toLowerCase()] || CATEGORICAL[0],
    },
  }));

  return {
    tooltip: { ...TOOLTIP_BASE, formatter: undefined },
    legend: { show: true },
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value' },
    series,
  };
}

// ── 4. Maturity Progression ────────────────────────────────────────────────

/**
 * Maturity level progression bars across frameworks.
 * Requirement 2.4
 */
export function buildMaturityProgressionOptions(data: MaturityProgressionData): EChartsOption {
  const series: EChartsOption['series'] = data.levels.map((level, i) => ({
    name: level.period,
    type: 'bar' as const,
    data: level.scores,
    itemStyle: { color: CATEGORICAL[i % CATEGORICAL.length] },
  }));

  return {
    tooltip: TOOLTIP_BASE,
    legend: { show: true },
    xAxis: { type: 'category', data: data.frameworks },
    yAxis: { type: 'value', name: 'Maturity Level' },
    series,
  };
}

// ── 5. Value Gap Bar (diverging bar: current vs target) ────────────────────

/**
 * Diverging bar chart showing current vs target value gaps.
 * Requirement 2.5
 */
export function buildValueGapBarOptions(data: ValueGapBarData): EChartsOption {
  const names = data.items.map(i => i.name);
  const currentValues = data.items.map(i => i.current);
  const targetValues = data.items.map(i => i.target);

  return {
    tooltip: TOOLTIP_BASE,
    legend: { show: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: names },
    series: [
      {
        name: 'Current',
        type: 'bar' as const,
        data: currentValues,
        itemStyle: { color: INFO },
      },
      {
        name: 'Target',
        type: 'bar' as const,
        data: targetValues,
        itemStyle: { color: LOW },
      },
    ],
  };
}

// ── 6. Risk Bridge Waterfall ───────────────────────────────────────────────

/**
 * Waterfall chart for cumulative risk score changes across categories.
 * Uses a transparent "placeholder" series to create the floating bar effect.
 * Requirement 2.6
 */
export function buildRiskBridgeWaterfallOptions(data: WaterfallData): EChartsOption {
  const categories: string[] = [];
  const placeholder: (number | string)[] = [];
  const values: (number | string)[] = [];
  const colors: string[] = [];

  let cumulative = 0;

  for (const step of data.steps) {
    categories.push(step.name);
    if (step.isTotal) {
      placeholder.push(0);
      values.push(cumulative);
      colors.push(CAT2);
    } else {
      const base = step.value >= 0 ? cumulative : cumulative + step.value;
      placeholder.push(Math.max(0, base));
      values.push(Math.abs(step.value));
      colors.push(step.value >= 0 ? CRITICAL : LOW);
      cumulative += step.value;
    }
  }

  return {
    tooltip: {
      ...TOOLTIP_BASE,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[params.length - 1] : params;
        return `${p.name}: ${p.value}`;
      },
    },
    legend: { show: false },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Placeholder',
        type: 'bar' as const,
        stack: 'waterfall',
        data: placeholder,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        name: 'Value',
        type: 'bar' as const,
        stack: 'waterfall',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i] },
        })),
      },
    ],
  };
}

// ── 7. Risk Waterfall (risk score buildup) ─────────────────────────────────

/**
 * Waterfall chart for risk score buildup from individual risk factors.
 * Requirement 2.7
 */
export function buildRiskWaterfallOptions(data: WaterfallData): EChartsOption {
  const categories: string[] = [];
  const placeholder: number[] = [];
  const values: number[] = [];
  const colors: string[] = [];

  let running = 0;

  for (const step of data.steps) {
    categories.push(step.name);
    if (step.isTotal) {
      placeholder.push(0);
      values.push(running);
      colors.push(CAT1);
    } else {
      const base = step.value >= 0 ? running : running + step.value;
      placeholder.push(Math.max(0, base));
      values.push(Math.abs(step.value));
      colors.push(step.value >= 0 ? HIGH : LOW);
      running += step.value;
    }
  }

  return {
    tooltip: TOOLTIP_BASE,
    legend: { show: false },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', name: 'Risk Score' },
    series: [
      {
        name: 'Placeholder',
        type: 'bar' as const,
        stack: 'waterfall',
        data: placeholder,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        name: 'Risk',
        type: 'bar' as const,
        stack: 'waterfall',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i] },
        })),
      },
    ],
  };
}

// ── 8. Bullet Chart ────────────────────────────────────────────────────────

/**
 * Bullet chart comparing actual performance against target thresholds.
 * Each item renders as a horizontal bar with range bands and a target marker.
 * Requirement 2.8
 */
export function buildBulletChartOptions(data: BulletChartData): EChartsOption {
  const labels = data.items.map(i => i.label);

  // Range bands — rendered as stacked bars behind the actual value
  const maxRange = Math.max(...data.items.flatMap(i => i.ranges), 0);
  const rangeSeries = data.items[0]?.ranges.map((_, rIdx) => ({
    name: `Range ${rIdx + 1}`,
    type: 'bar' as const,
    stack: 'ranges',
    barWidth: '60%',
    data: data.items.map(item => {
      const prev = rIdx > 0 ? item.ranges[rIdx - 1] : 0;
      return item.ranges[rIdx] - prev;
    }),
    itemStyle: {
      color: rIdx === 0 ? '#e0e0e0' : rIdx === 1 ? '#c6c6c6' : '#a8a8a8',
    },
    silent: true,
  })) ?? [];

  // Actual value bar
  const actualSeries = {
    name: 'Actual',
    type: 'bar' as const,
    barWidth: '30%',
    data: data.items.map(i => i.actual),
    itemStyle: { color: INFO },
    z: 10,
  };

  // Target marker as a thin bar overlay
  const targetSeries = {
    name: 'Target',
    type: 'bar' as const,
    barWidth: '4%',
    data: data.items.map(i => i.target),
    itemStyle: { color: CRITICAL },
    z: 20,
  };

  return {
    tooltip: TOOLTIP_BASE,
    legend: { show: true },
    xAxis: { type: 'value', max: maxRange || undefined },
    yAxis: { type: 'category', data: labels },
    series: [...rangeSeries, actualSeries, targetSeries],
  };
}

// ── 9. Monte Carlo Histogram ───────────────────────────────────────────────

/**
 * Histogram showing Monte Carlo simulation result distributions
 * with percentile markers.
 * Requirement 2.9
 */
export function buildMonteCarloHistogramOptions(data: MonteCarloHistogramData): EChartsOption {
  const binLabels = data.bins.map(b => `${b.min.toFixed(1)}–${b.max.toFixed(1)}`);
  const counts = data.bins.map(b => b.count);

  // Percentile marker lines
  const markLines: { name: string; xAxis: number; label: { formatter: string; position: 'end' }; lineStyle: { type: 'dashed' | 'solid'; color: string } }[] =
    data.percentiles.map(p => ({
      name: p.label,
      xAxis: p.value,
      label: { formatter: p.label, position: 'end' as const },
      lineStyle: { type: 'dashed' as const, color: CAT1 },
    }));

  // Mean marker
  markLines.push({
    name: 'Mean',
    xAxis: data.mean,
    label: { formatter: `Mean: ${data.mean.toFixed(2)}`, position: 'end' as const },
    lineStyle: { type: 'solid' as const, color: CRITICAL },
  });

  return {
    tooltip: { ...TOOLTIP_ITEM, formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params;
      return `${p.name}<br/>Count: ${p.value}`;
    }},
    legend: { show: false },
    xAxis: { type: 'category', data: binLabels, name: 'Value Range' },
    yAxis: { type: 'value', name: 'Frequency' },
    series: [
      {
        name: 'Distribution',
        type: 'bar' as const,
        data: counts,
        itemStyle: { color: INFO },
        markLine: {
          symbol: 'none',
          data: markLines,
        },
      },
    ],
  };
}

// ── 10. Tornado Chart (butterfly / sensitivity analysis) ───────────────────

/**
 * Tornado (butterfly) chart for sensitivity analysis with positive
 * and negative impact bars diverging from a baseline.
 * Requirement 2.10
 */
export function buildTornadoChartOptions(data: TornadoChartData): EChartsOption {
  const factors = data.factors.map(f => f.name);
  const baseline = data.factors[0]?.baseline ?? 0;

  const lowDeltas = data.factors.map(f => f.low - f.baseline);
  const highDeltas = data.factors.map(f => f.high - f.baseline);

  return {
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const name = items[0]?.name ?? '';
        const parts = items.map((p: any) => `${p.seriesName}: ${p.value >= 0 ? '+' : ''}${p.value}`);
        return `${name}<br/>${parts.join('<br/>')}`;
      },
    },
    legend: { show: true },
    xAxis: {
      type: 'value',
      name: 'Impact',
      axisLine: { onZero: true },
    },
    yAxis: {
      type: 'category',
      data: factors,
      inverse: true,
    },
    series: [
      {
        name: 'Low Impact',
        type: 'bar' as const,
        stack: 'tornado',
        data: lowDeltas,
        itemStyle: { color: LOW },
        label: { show: true, position: 'left' as const },
      },
      {
        name: 'High Impact',
        type: 'bar' as const,
        stack: 'tornado',
        data: highDeltas,
        itemStyle: { color: CRITICAL },
        label: { show: true, position: 'right' as const },
      },
    ],
  };
}
