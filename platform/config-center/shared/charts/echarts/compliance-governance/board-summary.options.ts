import type { EChartsOption } from 'echarts';

export interface BoardMetric {
  category: string;
  groups: { name: string; value: number }[];
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildBoardSummaryOptions(metrics: BoardMetric[]): EChartsOption {
  if (!metrics.length) return {} as EChartsOption;

  const groupNames = [...new Set(metrics.flatMap(m => m.groups.map(g => g.name)))];

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: groupNames, top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 50 },
    xAxis: {
      type: 'category',
      data: metrics.map(m => m.category),
      axisLabel: { fontSize: 11, rotate: 15 },
    },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: groupNames.map((name, i) => ({
      name,
      type: 'bar' as const,
      data: metrics.map(m => {
        const g = m.groups.find(g => g.name === name);
        return g?.value ?? 0;
      }),
      itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 40,
    })),
  } as EChartsOption;
}
