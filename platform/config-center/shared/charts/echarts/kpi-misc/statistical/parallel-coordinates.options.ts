import type { EChartsOption } from 'echarts';

export interface ParallelDimension {
  name: string;
  min: number;
  max: number;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildParallelCoordinatesOptions(dimensions: ParallelDimension[], data: number[][]): EChartsOption {
  if (!dimensions.length || !data.length) return {} as EChartsOption;

  return {
    tooltip: { trigger: 'item' },
    parallelAxis: dimensions.map((d, i) => ({
      dim: i,
      name: d.name,
      min: d.min,
      max: d.max,
      nameTextStyle: { fontSize: 11, color: '#374151' },
    })),
    parallel: { left: 60, right: 40, top: 50, bottom: 40 },
    series: [{
      type: 'parallel',
      lineStyle: { width: 1.5, opacity: 0.6 },
      data: data.map((row, i) => ({
        value: row,
        lineStyle: { color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] },
      })),
      emphasis: { lineStyle: { width: 3, opacity: 1 } },
    }],
  } as EChartsOption;
}
