import type { EChartsOption } from 'echarts';

export interface RiverDataPoint {
  date: string;
  value: number;
  category: string;
}

export function buildGrcPulseRiverOptions(data: RiverDataPoint[]): EChartsOption {
  if (!data.length) return {} as EChartsOption;

  const categories = [...new Set(data.map(d => d.category))];

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
    legend: { data: categories, top: 0 },
    singleAxis: {
      top: 50,
      bottom: 50,
      type: 'time',
      axisLabel: { fontSize: 11 },
      splitLine: { show: false },
    },
    series: [{
      type: 'themeRiver',
      data: data.map(d => [d.date, d.value, d.category]),
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(var(--color-black-rgb), 0.2)' } },
      label: { show: false },
    }],
  } as EChartsOption;
}
