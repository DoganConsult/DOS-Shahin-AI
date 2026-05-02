import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface TrendPoint {
  date: string;   // ISO or display label
  value: number;
}

export interface TrendSeries {
  name: string;
  data: TrendPoint[];
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

/**
 * Premium Trend Line — smooth multi-series with gradient fill,
 * dataZoom slider, axis pointers, theme-aware colours.
 */
export function buildTrendLineOptions(
  series: TrendSeries[],
  yAxisLabel = '',
): EChartsOption {
  const t = grc();

  const accentMap: Record<string, string> = {
    primary: t.primary,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
    info: t.info,
  };

  /* collect all unique dates from every series */
  const datesSet = new Set<string>();
  series.forEach(s => s.data.forEach(d => datesSet.add(d.date)));
  const dates = Array.from(datesSet).sort();

  const echartsSeries: unknown[] = series.map((s, i) => {
    const color = s.accent
      ? accentMap[s.accent]
      : t.palette[i % t.palette.length];

    /* build a value map for O(1) date lookup */
    const valMap = new Map(s.data.map(d => [d.date, d.value]));
    const values = dates.map(d => valMap.get(d) ?? null);

    return {
      name: s.name,
      type: 'line',
      smooth: 0.35,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: false,
      lineStyle: {
        width: 2.5,
        color,
        shadowBlur: 6,
        shadowColor: t.alpha(color, 0.35),
      },
      itemStyle: { color },
      areaStyle: {
        color: t.linearGradient(t.alpha(color, 0.25), t.alpha(color, 0.02)),
      },
      emphasis: {
        focus: 'series',
        lineStyle: { width: 3 },
        itemStyle: { borderWidth: 2, borderColor: t.bg0 },
      },
      connectNulls: true,
      data: values,
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      animationDelay: i * 120,
    };
  });

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: { color: t.alpha(t.text2, 0.25), type: 'dashed' },
        crossStyle: { color: t.alpha(t.text2, 0.15) },
        label: {
          backgroundColor: t.bg2,
          color: t.text0,
          borderColor: t.border,
        },
      },
    },
    legend: {
      ...t.legend(),
      bottom: 28,
    },
    grid: {
      left: 52,
      right: 24,
      top: 16,
      bottom: 72,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: { ...t.axisLabel(), hideOverlap: true },
      axisLine: t.axisLine(),
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameTextStyle: { color: t.text2, fontSize: 11 },
      axisLabel: t.axisLabel(),
      splitLine: t.splitLine(),
      axisLine: { show: false },
    },
    dataZoom: [
      {
        type: 'slider',
        height: 18,
        bottom: 4,
        borderColor: t.border,
        backgroundColor: t.alpha(t.bg2, 0.5),
        fillerColor: t.alpha(t.primary, 0.12),
        handleStyle: { color: t.primary, borderColor: t.primary },
        textStyle: { color: t.text2, fontSize: 10 },
        brushSelect: false,
      },
      { type: 'inside' },
    ],
    series: echartsSeries as unknown,
  };
}
