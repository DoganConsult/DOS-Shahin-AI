import type { EChartsOption } from 'echarts';

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
}

export interface Percentile {
  label: string;
  value: number;
}

export function buildMonteCarloHistogramOptions(bins: HistogramBin[], percentiles: Percentile[], mean: number): EChartsOption {
  if (!bins.length) return {} as EChartsOption;

  const markLineData = [
    { xAxis: mean, name: 'Mean', lineStyle: { color: '#3b82f6', width: 2, type: 'dashed' as const }, label: { formatter: 'Mean', fontSize: 10 } },
    ...percentiles.map(p => ({
      xAxis: p.value,
      name: p.label,
      lineStyle: { color: '#f59e0b', width: 1.5, type: 'dashed' as const },
      label: { formatter: p.label, fontSize: 10 },
    })),
  ];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => `Range: <b>${bins[p.dataIndex]?.min} – ${bins[p.dataIndex]?.max}</b><br/>Count: <b>${p.value}</b>`,
    },
    grid: { left: 60, right: 20, top: 30, bottom: 50 },
    xAxis: {
      type: 'category',
      data: bins.map(b => b.min),
      name: 'Value',
      nameLocation: 'middle',
      nameGap: 35,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: 'Frequency',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
    },
    series: [{
      type: 'bar',
      data: bins.map(b => b.count),
      barWidth: '95%',
      itemStyle: { color: '#3b82f640', borderColor: '#3b82f6', borderWidth: 1.5, borderRadius: [2, 2, 0, 0] },
      emphasis: { itemStyle: { color: '#3b82f680' } },
      markLine: { silent: true, data: markLineData },
    }],
  } as EChartsOption;
}
