import type { EChartsOption } from 'echarts';

export interface RankingEntity {
  name: string;
  values: { period: string; score: number }[];
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildAnimatedRankingOptions(entities: RankingEntity[]): EChartsOption {
  if (!entities.length) return {} as EChartsOption;

  const periods = [...new Set(entities.flatMap(e => e.values.map(v => v.period)))].sort();

  const series = entities.map((e, i) => ({
    name: e.name,
    type: 'bar' as const,
    realtimeSort: true,
    data: periods.map(p => {
      const pt = e.values.find(v => v.period === p);
      return pt?.score ?? 0;
    }),
    itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], borderRadius: [0, 4, 4, 0] },
    label: { show: true, position: 'right' as const, fontSize: 12, fontWeight: 'bold' as const },
  }));

  return {
    legend: { data: entities.map(e => e.name), top: 0 },
    grid: { left: 120, right: 60, top: 40, bottom: 40 },
    xAxis: { type: 'value', max: 'dataMax', axisLabel: { fontSize: 11 } },
    yAxis: {
      type: 'category',
      data: entities.map(e => e.name),
      inverse: true,
      animationDuration: 300,
      animationDurationUpdate: 1000,
      axisLabel: { fontSize: 11 },
    },
    series,
    animationDuration: 0,
    animationDurationUpdate: 1000,
    animationEasing: 'linear' as const,
    animationEasingUpdate: 'linear' as const,
  } as EChartsOption;
}
