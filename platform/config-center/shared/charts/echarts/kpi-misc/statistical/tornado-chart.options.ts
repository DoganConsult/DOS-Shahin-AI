import type { EChartsOption } from 'echarts';

export interface TornadoFactor {
  name: string;
  low: number;
  high: number;
  baseline: number;
}

export function buildTornadoChartOptions(factors: TornadoFactor[]): EChartsOption {
  if (!factors.length) return {} as EChartsOption;

  const sorted = [...factors].sort((a, b) => (b.high - b.low) - (a.high - a.low));
  const baseline = sorted[0]?.baseline ?? 0;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const f = sorted[params[0]?.dataIndex ?? 0];
        return f ? `<b>${f.name}</b><br/>Low: <b>${f.low}</b> | High: <b>${f.high}</b><br/>Baseline: <b>${f.baseline}</b>` : '';
      },
    },
    legend: { data: ['Low Impact', 'High Impact'], top: 0 },
    grid: { left: 140, right: 20, top: 40, bottom: 20 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } },
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(f => f.name),
      axisLabel: { fontSize: 11 },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Low Impact',
        type: 'bar' as const,
        stack: 'tornado',
        data: sorted.map(f => f.low - baseline),
        itemStyle: { color: '#22c55e', borderRadius: [0, 2, 2, 0] },
        barMaxWidth: 30,
      },
      {
        name: 'High Impact',
        type: 'bar' as const,
        stack: 'tornado',
        data: sorted.map(f => f.high - baseline),
        itemStyle: { color: '#ef4444', borderRadius: [2, 0, 0, 2] },
        barMaxWidth: 30,
      },
    ],
  } as EChartsOption;
}
