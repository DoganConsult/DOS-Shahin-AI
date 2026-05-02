import type { EChartsOption } from 'echarts';
import { grc } from './grc-echarts-theme';

export interface FindingCategory {
  category: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Premium Findings Horizontal Stacked Bar — severity-colour coded,
 * sorted by total, theme-aware, animated entrance.
 */
export function buildFindingsBarOptions(
  findings: FindingCategory[],
): EChartsOption {
  const t = grc();

  /* sort descending by total */
  const sorted = [...findings].sort(
    (a, b) =>
      b.critical + b.high + b.medium + b.low -
      (a.critical + a.high + a.medium + a.low),
  );

  const categories = sorted.map((f) => f.category);

  const makeSeries = (
    name: string,
    color: string,
    accessor: (f: FindingCategory) => number,
  ) => ({
    name,
    type: 'bar' as const,
    stack: 'total',
    barWidth: 20,
    itemStyle: {
      color,
      borderRadius: [0, 0, 0, 0],
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 8,
        shadowColor: t.alpha(color, 0.5),
      },
    },
    label: {
      show: true,
      position: 'inside' as const,
      formatter: (p: any) => {
        const val = (p as { value: number }).value;
        return val > 0 ? `${val}` : '';
      },
      color: '#fff',
      fontSize: 10,
      fontWeight: 600 as const,
    },
    data: sorted.map(accessor),
    animationDelay: (idx: number) => idx * 60,
  });

  return {
    ...t.animation(0),
    tooltip: {
      ...t.tooltip(),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      ...t.legend(),
      data: ['Critical', 'High', 'Medium', 'Low'],
    },
    grid: { left: 8, right: 24, top: 40, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: t.axisLabel(),
      axisLine: t.axisLine(),
      splitLine: t.splitLine(),
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLabel: { ...t.axisLabel(), fontSize: 11, fontWeight: 500 },
      axisLine: t.axisLine(),
      axisTick: { show: false },
    },
    series: [
      makeSeries('Critical', t.danger, (f) => f.critical),
      makeSeries('High', t.warning, (f) => f.high),
      makeSeries('Medium', t.info, (f) => f.medium),
      makeSeries('Low', t.success, (f) => f.low),
    ],
  };
}
