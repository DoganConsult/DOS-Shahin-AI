import type { EChartsOption } from 'echarts';

export interface MaturityLevel {
  framework: string;
  periods: { name: string; score: number }[];
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildMaturityProgressionOptions(levels: MaturityLevel[]): EChartsOption {
  if (!levels.length) return {} as EChartsOption;

  const periodNames = [...new Set(levels.flatMap(l => l.periods.map(p => p.name)))];

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: levels.map(l => l.framework), top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: periodNames, axisLabel: { fontSize: 11, rotate: 15 } },
    yAxis: { type: 'value', min: 0, max: 5, minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: levels.map((l, i) => ({
      name: l.framework,
      type: 'bar' as const,
      data: periodNames.map(pn => {
        const p = l.periods.find(p => p.name === pn);
        return p?.score ?? 0;
      }),
      itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 40,
      label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' as const },
    })),
  } as EChartsOption;
}
