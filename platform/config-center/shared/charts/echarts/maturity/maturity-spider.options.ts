import type { EChartsOption } from 'echarts';

export interface SpiderAxis {
  name: string;
  current: number;
  target: number;
  max: number;
}

export function buildMaturitySpiderOptions(axes: SpiderAxis[]): EChartsOption {
  if (!axes.length) return {} as EChartsOption;

  return {
    tooltip: {},
    legend: { data: ['Current', 'Target'], top: 0 },
    radar: {
      indicator: axes.map(a => ({ name: a.name, max: a.max })),
      splitNumber: 4,
      axisName: { fontSize: 11, color: '#374151' },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      splitArea: { show: true, areaStyle: { color: ['#f9fafb', '#fff'] } },
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: axes.map(a => a.current),
          name: 'Current',
          lineStyle: { color: '#3b82f6', width: 2.5 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: '#3b82f625' },
        },
        {
          value: axes.map(a => a.target),
          name: 'Target',
          lineStyle: { color: '#22c55e', width: 2, type: 'dashed' as const },
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: '#22c55e10' },
        },
      ],
    }],
  } as EChartsOption;
}
