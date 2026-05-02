import type { EChartsOption } from 'echarts';

export interface OrbitPoint {
  dimension: string;
  score: number;
  max: number;
  series: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildMaturityOrbitOptions(points: OrbitPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const seriesNames = [...new Set(points.map(p => p.series))];
  const dimensions = [...new Set(points.map(p => p.dimension))];
  const max = Math.max(100, ...points.map(p => p.max));

  return {
    tooltip: {},
    legend: { data: seriesNames, top: 0 },
    radar: {
      indicator: dimensions.map(d => ({ name: d, max })),
      splitNumber: 4,
      axisName: { fontSize: 11, color: '#374151' },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      splitArea: { show: true, areaStyle: { color: ['#f9fafb', '#fff'] } },
    },
    series: [{
      type: 'radar',
      data: seriesNames.map((sn, i) => ({
        value: dimensions.map(d => {
          const pt = points.find(p => p.series === sn && p.dimension === d);
          return pt?.score ?? 0;
        }),
        name: sn,
        lineStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], width: 2 },
        itemStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] },
        areaStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] + '20' },
      })),
    }],
  } as EChartsOption;
}
